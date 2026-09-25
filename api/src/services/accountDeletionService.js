const { transaction, query } = require('../config/supabase');
const { logger } = require('../config/observability');

const Activity = require('../models/Activity');
const ActivityComment = require('../models/ActivityComment');
const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const UserPreferences = require('../models/extended/UserPreferences');
const GoalDetails = require('../models/extended/GoalDetails');
const PasswordReset = require('../models/PasswordReset');
const OTP = require('../models/Otp');
const Feedback = require('../models/Feedback');
const Report = require('../models/Report');
const CommunityParticipation = require('../models/CommunityParticipation');
const CommunityItem = require('../models/CommunityItem');
const CommunityAnnouncement = require('../models/CommunityAnnouncement');
const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const UserAchievement = require('../models/UserAchievement');
const cloudinaryService = require('./cloudinaryService');

const cloudinaryPublicId = (url) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null;
  const [, afterUpload = ''] = url.split('/upload/');
  return afterUpload
    .replace(/^.*?\/(?:v\d+\/)/, '')
    .replace(/^q_[^/]+(?:,f_[^/]+)?\//, '')
    .replace(/^v\d+\//, '')
    .replace(/\.[^/.]+$/, '') || null;
};

const removeCloudinaryAssets = async (urls) => {
  if (!cloudinaryService.isConfigured()) return;
  await Promise.allSettled([...new Set(urls.filter(Boolean))].map(async (url) => {
    const publicId = cloudinaryPublicId(url);
    if (publicId) await cloudinaryService.destroy(publicId);
  }));
};

const removeReactionReferences = async (Model, userId) => {
  await Model.collection.updateMany(
    { reactions: { $exists: true } },
    [{
      $set: {
        reactions: {
          $arrayToObject: {
            $map: {
              input: { $objectToArray: { $ifNull: ['$reactions', {}] } },
              as: 'reaction',
              in: {
                k: '$$reaction.k',
                v: {
                  $let: {
                    vars: {
                      remainingUserIds: {
                        $filter: {
                          input: { $ifNull: ['$$reaction.v.userIds', []] },
                          as: 'reactorId',
                          cond: { $ne: ['$$reactorId', Number(userId)] }
                        }
                      }
                    },
                    in: {
                      $mergeObjects: [
                        '$$reaction.v',
                        { userIds: '$$remainingUserIds', count: { $size: '$$remainingUserIds' } }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    }]
  );
};

async function permanentlyDeleteAccount({ userId, email, avatarUrl }) {
  const numericUserId = Number(userId);
  // Community activity and chat use the optional feed database. Load them only
  // when it is configured so account deletion still works in installations
  // where that optional database has never been enabled.
  let CommunityActivity = null;
  let ChatMessage = null;
  try {
    CommunityActivity = require('../models/CommunityActivity');
    ChatMessage = require('../models/ChatMessage');
  } catch (error) {
    logger.warn('Feed database is unavailable during account deletion; no feed records exist to remove');
  }
  const [affectedGoalLikes, relatedFollows] = await Promise.all([
    query(`
      SELECT DISTINCT l.target_id::BIGINT AS id
      FROM likes l
      JOIN goals g ON g.id = l.target_id::BIGINT
      WHERE l.user_id = $1 AND l.target_type = 'goal'
    `, [numericUserId]),
    query(`
      SELECT DISTINCT CASE WHEN follower_id = $1 THEN following_id ELSE follower_id END AS id
      FROM follows
      WHERE follower_id = $1 OR following_id = $1
    `, [numericUserId])
  ]);
  const affectedGoalLikeIds = affectedGoalLikes.rows.map((row) => Number(row.id));
  const relatedUserIds = relatedFollows.rows.map((row) => Number(row.id));
  const [{ rows: goalRows }, { rows: habitRows }, feedback, ownedItems, ownedCommunities, memberships] = await Promise.all([
    query('SELECT id FROM goals WHERE user_id = $1', [numericUserId]),
    query('SELECT id FROM habits WHERE user_id = $1', [numericUserId]),
    Feedback.find({ 'user.id': numericUserId }).select('screenshotUrl').lean(),
    CommunityItem.find({ createdBy: numericUserId }).select('_id').lean(),
    // Use the model queries here so cleanup uses the same legacy ID casting as
    // the existing community read/write paths.
    Community.find({ ownerId: numericUserId }).select('_id avatarUrl bannerUrl').lean(),
    CommunityMember.find({ userId: numericUserId }).select('communityId status').lean()
  ]);

  const goalIds = goalRows.map(({ id }) => id);
  const habitIds = habitRows.map(({ id }) => id);
  const [goalDetails, activities] = await Promise.all([
    goalIds.length ? GoalDetails.find({ goalId: { $in: goalIds } }).lean() : [],
    Activity.find({ $or: [{ userId: numericUserId }, { 'data.targetUserId': numericUserId }] }).select('_id').lean()
  ]);
  const activityIds = activities.map((activity) => activity._id);
  // Likes live in PostgreSQL while comments live in MongoDB. Capture every
  // comment that will disappear so likes and notifications from other users
  // cannot be left pointing to a deleted comment.
  const comments = await ActivityComment.find({
    $or: [
      { userId: numericUserId },
      ...(activityIds.length ? [{ activityId: { $in: activityIds } }] : [])
    ]
  }).select('_id').lean();
  const commentIds = comments.map((comment) => comment._id);
  const ownedItemIds = ownedItems.map((item) => item._id);
  const ownedCommunityIds = ownedCommunities.map((community) => community._id);
  const activeMembershipCommunityIds = memberships
    .filter((membership) => membership.status === 'active' && !ownedCommunityIds.some((id) => String(id) === String(membership.communityId)))
    .map((membership) => membership.communityId);
  const assetUrls = [
    avatarUrl,
    ...goalDetails.map((detail) => detail.completionAttachmentUrl),
    ...feedback.map((item) => item.screenshotUrl),
    ...ownedCommunities.flatMap((community) => [community.avatarUrl, community.bannerUrl])
  ];

  // MongoDB has no foreign keys to the PostgreSQL user, so remove every
  // document that belongs to the account or identifies the account directly.
  await Promise.all([
    ActivityComment.deleteMany({ $or: [{ userId: numericUserId }, ...(activityIds.length ? [{ activityId: { $in: activityIds } }] : [])] }),
    ActivityComment.updateMany({ mentionUserId: numericUserId }, { $unset: { mentionUserId: 1 } }),
    Activity.deleteMany({ $or: [{ userId: numericUserId }, { 'data.targetUserId': numericUserId }] }),
    Notification.deleteMany({ $or: [
      { userId: numericUserId },
      { 'data.actorId': numericUserId },
      { 'data.followerId': numericUserId },
      { 'data.likerId': numericUserId },
      { 'data.mentionUserId': numericUserId },
      ...(activityIds.length ? [{ 'data.activityId': { $in: activityIds } }] : []),
      ...(commentIds.length ? [{ 'data.commentId': { $in: commentIds } }] : []),
      ...(goalIds.length ? [{ 'data.goalId': { $in: goalIds } }] : []),
      ...(habitIds.length ? [{ 'data.habitId': { $in: habitIds } }] : [])
    ] }),
    DeviceToken.deleteMany({ userId: numericUserId }),
    DailyLogsEntry.deleteMany({ userId: numericUserId }),
    UserPreferences.deleteMany({ userId: numericUserId }),
    UserPreferences.updateMany({ blockedUsers: numericUserId }, { $pull: { blockedUsers: numericUserId } }),
    GoalDetails.deleteMany({ goalId: { $in: goalIds } }),
    ...(goalIds.length ? [GoalDetails.updateMany(
      { 'progress.breakdown.subGoals.linkedGoalId': { $in: goalIds } },
      { $pull: { 'progress.breakdown.subGoals': { linkedGoalId: { $in: goalIds } } } }
    )] : []),
    ...(habitIds.length ? [GoalDetails.updateMany(
      { 'progress.breakdown.habits.habitId': { $in: habitIds } },
      { $pull: { 'progress.breakdown.habits': { habitId: { $in: habitIds } } } }
    )] : []),
    PasswordReset.deleteMany({ email }),
    OTP.deleteMany({ email }),
    Feedback.deleteMany({ 'user.id': numericUserId }),
    Report.deleteMany({ $or: [
      { reporterId: numericUserId },
      { targetType: 'user', targetId: numericUserId },
      ...(activityIds.length ? [{ targetType: 'activity', targetId: { $in: activityIds } }] : [])
    ] }),
    CommunityParticipation.deleteMany({ $or: [
      { userId: numericUserId },
      ...(ownedItemIds.length ? [{ itemId: { $in: ownedItemIds } }] : []),
      ...(ownedCommunityIds.length ? [{ communityId: { $in: ownedCommunityIds } }] : [])
    ] }),
    CommunityItem.deleteMany({ $or: [
      { createdBy: numericUserId },
      ...(ownedCommunityIds.length ? [{ communityId: { $in: ownedCommunityIds } }] : [])
    ] }),
    CommunityItem.updateMany({ approverId: numericUserId }, { $unset: { approverId: 1, approvedAt: 1 } }),
    ...(goalIds.length ? [CommunityItem.updateMany(
      { type: 'goal', sourceId: { $in: goalIds.map(String) } },
      { $set: { isActive: false } }
    )] : []),
    ...(habitIds.length ? [CommunityItem.updateMany(
      { type: 'habit', sourceId: { $in: habitIds.map(String) } },
      { $set: { isActive: false } }
    )] : []),
    ...(CommunityActivity ? [CommunityActivity.deleteMany({ $or: [{ userId: numericUserId }, { 'data.targetUserId': numericUserId }] })] : []),
    ...(CommunityActivity && ownedCommunityIds.length ? [CommunityActivity.deleteMany({ communityId: { $in: ownedCommunityIds } })] : []),
    CommunityAnnouncement.deleteMany({ $or: [
      { authorId: numericUserId },
      ...(ownedCommunityIds.length ? [{ communityId: { $in: ownedCommunityIds } }] : [])
    ] }),
    ...(ChatMessage ? [ChatMessage.deleteMany({ userId: numericUserId })] : []),
    ...(ChatMessage && ownedCommunityIds.length ? [ChatMessage.deleteMany({ communityId: { $in: ownedCommunityIds } })] : []),
    CommunityMember.deleteMany({ userId: numericUserId }),
    ...(ownedCommunityIds.length ? [CommunityMember.deleteMany({ communityId: { $in: ownedCommunityIds } })] : []),
    ...(ownedCommunityIds.length ? [Community.deleteMany({ _id: { $in: ownedCommunityIds } })] : []),
    UserAchievement.deleteMany({ userId: numericUserId })
  ]);

  // Do not simply decrement a denormalized total: it may already be stale or
  // contain a pending-member record. Rebuild it from the memberships that
  // remain after this account has been removed.
  if (activeMembershipCommunityIds.length) {
    const remainingMemberships = await CommunityMember.aggregate([
      { $match: { communityId: { $in: activeMembershipCommunityIds }, status: 'active' } },
      { $group: { _id: '$communityId', count: { $sum: 1 } } }
    ]);
    const counts = new Map(remainingMemberships.map(({ _id, count }) => [String(_id), count]));
    await Promise.all(activeMembershipCommunityIds.map((communityId) => Community.updateOne(
      { _id: communityId },
      { $set: { 'stats.memberCount': counts.get(String(communityId)) || 0 } }
    )));
  }

  await Promise.allSettled([
    removeReactionReferences(Activity, numericUserId),
    ...(CommunityActivity ? [removeReactionReferences(CommunityActivity, numericUserId)] : []),
    ...(ChatMessage ? [removeReactionReferences(ChatMessage, numericUserId)] : [])
  ]);

  // This final PostgreSQL operation is atomic. Its foreign-key cascades remove
  // the user's goals, habits, habit logs, goal updates, follows, likes and blocks.
  await transaction(async (client) => {
    // The user FK removes likes made *by* this account, but polymorphic likes
    // have no FK to their target. Remove likes made by anybody on the content
    // being deleted, otherwise those rows would outlive their goal/activity/comment.
    await client.query(`
      DELETE FROM likes
      WHERE (target_type = 'goal' AND target_id = ANY($1::TEXT[]))
         OR (target_type = 'activity' AND target_id = ANY($2::TEXT[]))
         OR (target_type = 'activity_comment' AND target_id = ANY($3::TEXT[]))
    `, [goalIds.map(String), activityIds.map(String), commentIds.map(String)]);

    const deleted = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [numericUserId]);
    if (!deleted.rows[0]) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

    // Explicitly reconcile denormalized counters on surviving records. The
    // database triggers already maintain these, but recalculating makes the
    // deletion resilient to older installations with stale counters.
    if (affectedGoalLikeIds.length) {
      await client.query(`
        UPDATE goals g
        SET like_count = (
          SELECT COUNT(*)::INTEGER FROM likes l
          WHERE l.target_type = 'goal' AND l.target_id = g.id::TEXT AND l.is_active = true
        )
        WHERE g.id = ANY($1::BIGINT[])
      `, [affectedGoalLikeIds]);
    }
    if (relatedUserIds.length) {
      await client.query(`
        UPDATE users u
        SET followers_count = (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.following_id = u.id AND f.status = 'accepted'),
            following_count = (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.follower_id = u.id AND f.status = 'accepted')
        WHERE u.id = ANY($1::BIGINT[])
      `, [relatedUserIds]);
    }
  });

  removeCloudinaryAssets(assetUrls).catch((error) => logger.error('Account media cleanup failed', error));

  try {
    const cacheService = require('./cacheService');
    await Promise.allSettled([
      cacheService.invalidateUserActivities(numericUserId),
      cacheService.invalidateAllActivities(),
      cacheService.invalidateTrendingGoals(),
      cacheService.invalidateAllLeaderboards(),
      cacheService.deletePattern(`${cacheService.CACHE_KEYS.USER_SEARCH}*`),
      cacheService.deletePattern(`${cacheService.CACHE_KEYS.GOAL_SEARCH}*`)
    ]);
  } catch (_) {}
}

module.exports = { permanentlyDeleteAccount };
