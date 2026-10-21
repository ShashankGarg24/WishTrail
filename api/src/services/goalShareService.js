const pgGoalService = require('./pgGoalService');
const { isGoalOwner } = require('./goalAccessPolicy');
const pgUserService = require('./pgUserService');
const GoalDetails = require('../models/extended/GoalDetails');
const Activity = require('../models/Activity');
const { query } = require('../config/supabase');
const { buildContext, buildSnapshot } = require('./goalShareContract');
const crypto = require('crypto');
let indexes;

async function getContext(goalId, userId, options = {}) {
  const goal = await pgGoalService.getGoalById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (!isGoalOwner(goal, userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  const [details, updates, user] = await Promise.all([
    GoalDetails.findOne({ goalId: goal.id }).lean(),
    query('SELECT id, text, emotion, date_key::text FROM goal_updates WHERE goal_id=$1 AND user_id=$2 ORDER BY date_key, id', [goal.id, userId]),
    pgUserService.getUserById(userId)
  ]);
  let progress;
  try { progress = await require('./goalDivisionService').computeGoalProgress(goal.id, userId); }
  catch { /* Optional progress is omitted when its source cannot be computed. */ }
  return buildContext({ goal, details: { ...details, progress: { ...details?.progress, percent: progress?.percent } }, updates: updates.rows, timezone: user?.timezone || 'UTC', shareType: options.shareType, eventId: options.eventId });
}

async function postShare(goalId, userId, payload) {
  // These unique indexes are required for retries/concurrent completion shares,
  // including deployments that disable Mongoose's automatic index creation.
  if (!indexes) indexes = Activity.createIndexes().catch(error => { indexes = null; throw error; });
  await indexes;
  if (!['PUBLIC', 'PRIVATE'].includes(payload.visibility)) throw Object.assign(new Error('Choose a post visibility'), { statusCode: 400 });
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(payload.requestId || '')) throw Object.assign(new Error('Invalid share request'), { statusCode: 400 });
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([String(goalId), payload.shareType, payload.eventId, payload.revision, payload.options, payload.visibility])).digest('hex');
  const prior = await Activity.findOne({ userId, shareRequestId: payload.requestId }).lean();
  if (prior) {
    if (prior.shareRequestFingerprint !== fingerprint) throw Object.assign(new Error('This request already posted a different preview. Refresh before posting again.'), { statusCode: 409 });
    return prior;
  }
  const context = await getContext(goalId, userId, payload);
  if (context.revision !== payload.revision) throw Object.assign(new Error('Your goal changed. Refresh the preview before posting.'), { statusCode: 409 });
  const snapshot = buildSnapshot(context, payload.options);
  // A completion is a single achievement. A second explicit post updates the same
  // rich activity; automatic system activities are suppressed at read time.
  const key = snapshot.shareType === 'COMPLETION' ? `completion:${goalId}` : `request:${payload.requestId}`;
  const filter = { userId, shareKey: key };
  const update = { type: 'goal_shared',
    isPublic: payload.visibility === 'PUBLIC', shareRequestId: payload.requestId, shareRequestFingerprint: fingerprint,
    data: { goalId: Number(goalId), share: snapshot } };
  let activity;
  try {
    activity = await Activity.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await Activity.findOne({ userId, shareRequestId: payload.requestId }).lean();
    if (!existing || existing.shareRequestFingerprint !== fingerprint) throw Object.assign(new Error('Another share was just posted. Refresh the preview and try again.'), { statusCode: 409 });
    activity = existing;
  }
  const cache = require('./cacheService');
  await Promise.all([cache.invalidateAllActivities(), cache.invalidateUserActivities(userId)]);
  return activity;
}

async function deleteShare(activityId, userId) {
  if (!/^[a-f0-9]{24}$/i.test(activityId)) throw Object.assign(new Error('Invalid post ID'), { statusCode: 400 });
  // Scope the write itself to the owner. Feed achievements and explicit goal
  // shares are both Activity documents; deleting one must not delete the
  // underlying goal, habit, or earned achievement.
  const removed = await Activity.findOneAndDelete({ _id: activityId, userId: Number(userId) });
  if (!removed) throw Object.assign(new Error('Post not found or not owned by you'), { statusCode: 404 });
  const cache = require('./cacheService');
  await Promise.all([cache.invalidateAllActivities(), cache.invalidateUserActivities(userId)]);
  try {
    const comments = require('../models/ActivityComment');
    const likes = require('./pgLikeService');
    const entries = await comments.find({ activityId }).select('_id').lean();
    await Promise.all([
      comments.deleteMany({ activityId }),
      likes.deleteLikesByTarget('activity', activityId),
      ...entries.map(entry => likes.deleteLikesByTarget('activity_comment', String(entry._id))),
      require('../models/Notification').updateMany({ 'data.activityId': activityId }, { $set: { active: false }, $inc: { __v: 1 } }),
      require('../models/CommunityActivity').deleteMany({ sourceActivityId: activityId })
    ]);
  } catch (error) {
    require('../config/observability').logger.warn('Shared post deleted; dependent cleanup failed', { code: error.code || error.name });
  }
}

module.exports = { getContext, postShare, deleteShare };
