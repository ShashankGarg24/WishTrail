const { logger } = require('../config/observability');
const { LIKE_TYPES, normalizeUserId, preferenceReason } = require('./notificationPolicy');

const TYPES = [...LIKE_TYPES, 'new_follower', 'follow_request'];
const visibleQuery = () => ({ active: { $ne: false }, 'channels.inApp': { $ne: false } });
let indexes;
async function ensureIndexes() {
  if (!indexes) indexes = require('../models/Notification').createIndexes().catch(error => { indexes = null; throw error; });
  await indexes;
}
function identity(input) {
  const userId = normalizeUserId(input.userId);
  const data = input.data || {};
  const type = input.type;
  if (LIKE_TYPES.has(type)) {
    const field = type === 'goal_liked' ? 'goalId' : type === 'activity_liked' ? 'activityId' : 'commentId';
    if (!data[field]) throw new Error('missing_notification_target');
    return { key: `${userId}:${type}:${data[field]}`, filter: { userId, type, [`data.${field}`]: data[field] }, target: String(data[field]), targetType: type === 'goal_liked' ? 'goal' : type === 'activity_liked' ? 'activity' : 'activity_comment' };
  }
  const actor = normalizeUserId(data.followerId || data.actorId);
  return { key: `${userId}:${type}:${actor}`, actor, filter: { userId, type, $or: [{ 'data.followerId': actor }, { 'data.actorId': actor }] } };
}

async function snapshot(input, id) {
  if (LIKE_TYPES.has(input.type)) {
    let exists;
    if (id.targetType === 'goal') exists = await require('./pgGoalService').findById(id.target);
    else if (id.targetType === 'activity') exists = await require('../models/Activity').exists({ _id: id.target });
    else {
      const Comment = require('../models/ActivityComment');
      const comment = await Comment.findById(id.target).lean();
      exists = comment && (!comment.parentCommentId || await Comment.exists({ _id: comment.parentCommentId }));
    }
    const actors = exists ? await require('./pgLikeService').getNotificationActors(id.targetType, id.target) : [];
    const unique = [...new Set(actors.map(normalizeUserId))].filter(actor => actor !== Number(input.userId)).sort((a, b) => a - b);
    return { active: unique.length > 0, actors: unique };
  }
  const relationship = await require('./pgFollowService').getFollowRelationship(id.actor, input.userId);
  const active = relationship?.status === (input.type === 'follow_request' ? 'pending' : 'accepted');
  // One actor also records source state independently from visible/dismissed state.
  return { active, actors: active ? [id.actor] : [] };
}

function sameActors(left = [], right = []) {
  return left.length === right.length && left.every((actor, index) => actor === right[index]);
}

// Each attempt reads Mongo's built-in version BEFORE authoritative source state.
// A competing reconciliation invalidates that revision, forcing a fresh source read.
async function synchronize(input, { push = false } = {}) {
  const Notification = require('../models/Notification');
  const id = identity(input);
  await ensureIndexes();
  let row = await Notification.findOne({ lifecycleKey: id.key });
  let migratedLegacy = false;
  if (!row) {
    const legacy = await Notification.find({ ...id.filter, lifecycleKey: { $exists: false } }).sort({ createdAt: -1 }).lean();
    migratedLegacy = legacy.length > 0;
    try {
      row = await Notification.create({
        userId: input.userId, type: input.type, title: input.title, message: input.message,
        data: input.data, channels: input.channels, priority: input.priority,
        lifecycleKey: id.key, active: false,
        isRead: legacy.length ? legacy.every(item => item.isRead) : false,
        createdAt: legacy[0]?.createdAt || new Date(),
        lastPushAt: legacy[0]?.createdAt,
        expiresAt: input.expiresAt || new Date(Date.now() + 30 * 86400000)
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      row = await Notification.findOne({ lifecycleKey: id.key });
    }
  }
  for (let attempt = 0; attempt < 64; attempt++) {
    if (attempt) row = await Notification.findOne({ lifecycleKey: id.key });
    const state = await snapshot(input, id);
    const prefs = await require('../models/extended/UserPreferences').findOne({ userId: input.userId }).select('notifications').lean();
    const allowed = !preferenceReason(prefs, input.type);
    const previousActors = row.aggregateActors || [];
    const changed = !sameActors(previousActors, state.actors);
    const dismissed = row.dismissed === true && !changed;
    const active = state.active && !dismissed;
    const patch = {
      active, aggregateActors: state.actors,
      'channels.inApp': allowed && input.channels?.inApp !== false,
      'channels.push': allowed && input.channels?.push !== false,
    };
    const update = { $set: patch, $inc: { __v: 1 } };
    if (changed && row.dismissed === true) update.$unset = { dismissed: 1 };
    if (LIKE_TYPES.has(input.type)) {
      const label = id.targetType === 'activity_comment' ? 'comment' : id.targetType;
      patch.message = `${state.actors.length} ${state.actors.length === 1 ? 'person' : 'people'} liked your ${label}`;
      patch['data.actorId'] = state.actors[0] || null;
      patch['data.likerId'] = state.actors[0] || null;
    }
    // Removal alone should not reopen a read aggregate. A new actor/reactivation can.
    const added = state.actors.some(actor => !previousActors.includes(actor));
    if (active && changed && !migratedLegacy && (added || row.active === false)) {
      patch.isRead = false;
      patch.readAt = null;
      patch.createdAt = new Date();
      patch.expiresAt = new Date(Date.now() + (input.type === 'follow_request' ? 365 : 30) * 86400000);
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: row._id, __v: row.__v },
      update,
      // Reactivation moves the existing notification to the top of the center.
      // All update fields above are server-owned; allow its event timestamp to move.
      { new: true, strict: false, timestamps: { createdAt: false } }
    );
    if (!updated) continue;
    // Retain legacy rows for diagnosis but never show duplicate logical state.
    await Notification.updateMany({ ...id.filter, lifecycleKey: { $exists: false } }, { $set: { active: false } });
    logger.info('[social-notification]', { notificationId: String(updated._id), notificationType: input.type, operation: active ? 'synchronize' : 'invalidate' });
    const newAction = LIKE_TYPES.has(input.type) ? added : changed;
    if (push && active && updated.channels.push && newAction && !migratedLegacy) await dispatch(updated);
    return updated;
  }
  throw new Error('notification_reconciliation_conflict');
}

function cooldownMs() {
  const seconds = Number(process.env.SOCIAL_NOTIFICATION_PUSH_COOLDOWN_SECONDS || 600);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 600) * 1000;
}
async function dispatch(row) {
  const Notification = require('../models/Notification');
  const now = new Date();
  const claimed = await Notification.findOneAndUpdate({
    _id: row._id, active: true, __v: row.__v,
    $or: [{ lastPushAt: null }, { lastPushAt: { $lte: new Date(now - cooldownMs()) } }]
  }, { $set: { lastPushAt: now }, $inc: { __v: 1 } }, { new: true });
  if (!claimed) return;
  // The cooldown claim is intentionally retained on provider errors: avoid retry spam.
  await require('./pushService').sendFcmToUser(claimed.userId, claimed);
}

async function reconcileUser(userId) {
  const Notification = require('../models/Notification');
  const rows = await Notification.find({ userId, type: { $in: TYPES }, $or: [{ lifecycleKey: { $exists: true } }, { active: { $ne: false } }] }).lean();
  const unique = new Map();
  for (const row of rows) {
    try { unique.set(identity(row).key, row); }
    catch {
      await Notification.updateOne({ _id: row._id }, { $set: { active: false }, $inc: { __v: 1 } });
      logger.warn('[social-notification]', { notificationId: String(row._id), code: 'missing_source_identity' });
    }
  }
  const inputs = [...unique.values()];
  for (let offset = 0; offset < inputs.length; offset += 8) {
    await Promise.all(inputs.slice(offset, offset + 8).map(row => synchronize(row)));
  }
  const sourced = await Notification.find({ userId, active: { $ne: false },
    type: { $in: ['activity_comment', 'comment_reply', 'mention'] },
    'data.commentId': { $ne: null }
  }).lean();
  for (const row of sourced) {
    const Comment = require('../models/ActivityComment');
    const source = await Comment.findById(row.data.commentId).lean();
    const parentExists = source?.parentCommentId ? await Comment.exists({ _id: source.parentCommentId }) : true;
    if (!source || !parentExists) await Notification.updateOne({ _id: row._id }, { $set: { active: false }, $inc: { __v: 1 } });
  }
}

async function safely(work) {
  try { return await work(); }
  catch (error) { logger.warn('[social-notification]', { operation: 'synchronize', code: error.code || error.name }); return null; }
}

module.exports = { TYPES, visibleQuery, identity, synchronize, reconcileUser, safely, cooldownMs, ensureIndexes };
