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
    return { active: unique.length > 0, actors: unique, signature: JSON.stringify(unique) };
  }
  const relationship = await require('./pgFollowService').getFollowRelationship(id.actor, input.userId);
  const active = relationship?.status === (input.type === 'follow_request' ? 'pending' : 'accepted');
  return { active, actors: [], signature: active ? `${relationship.status}:${new Date(relationship.createdAt).toISOString()}` : 'inactive' };
}

// Each attempt reads the Mongo revision BEFORE reading authoritative source state.
// A competing reconciliation invalidates that revision, forcing a fresh source read.
async function synchronize(input, { push = false } = {}) {
  const Notification = require('../models/Notification');
  const id = identity(input);
  await ensureIndexes();
  let row = await Notification.findOne({ lifecycleKey: id.key });
  if (!row) {
    const legacy = await Notification.find({ ...id.filter, lifecycleKey: { $exists: false } }).sort({ createdAt: -1 }).lean();
    try {
      row = await Notification.create({
        userId: input.userId, type: input.type, title: input.title, message: input.message,
        data: input.data, channels: input.channels, priority: input.priority,
        lifecycleKey: id.key, active: false, lifecycleRevision: 0,
        sourceSignature: legacy.length ? 'legacy' : undefined,
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
    const changed = row.sourceSignature !== state.signature;
    const dismissed = row.dismissed && !changed;
    const active = state.active && !dismissed;
    const patch = {
      active, invalidatedAt: active ? null : (row.invalidatedAt || new Date()),
      sourceSignature: state.signature, aggregateActors: state.actors, dismissed,
      'channels.inApp': allowed && input.channels?.inApp !== false,
      'channels.push': allowed && input.channels?.push !== false,
    };
    if (LIKE_TYPES.has(input.type)) {
      const label = id.targetType === 'activity_comment' ? 'comment' : id.targetType;
      patch.message = `${state.actors.length} ${state.actors.length === 1 ? 'person' : 'people'} liked your ${label}`;
      patch['data.actorId'] = state.actors[0] || null;
      patch['data.likerId'] = state.actors[0] || null;
    }
    // Removal alone should not reopen a read aggregate. A new actor/reactivation can.
    const added = state.actors.some(actor => !row.aggregateActors.includes(actor));
    if (active && changed && row.sourceSignature !== 'legacy' && (added || row.active === false)) {
      patch.isRead = false;
      patch.readAt = null;
      patch.createdAt = new Date();
      patch.expiresAt = new Date(Date.now() + (input.type === 'follow_request' ? 365 : 30) * 86400000);
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: row._id, lifecycleRevision: row.lifecycleRevision },
      { $set: patch, $inc: { lifecycleRevision: 1 } },
      // Reactivation moves the existing notification to the top of the center.
      // All update fields above are server-owned; allow its event timestamp to move.
      { new: true, strict: false, timestamps: { createdAt: false } }
    );
    if (!updated) continue;
    // Retain legacy rows for diagnosis but never show duplicate logical state.
    await Notification.updateMany({ ...id.filter, lifecycleKey: { $exists: false } }, { $set: { active: false, invalidatedAt: new Date() } });
    logger.info('[social-notification]', { notificationId: String(updated._id), notificationType: input.type, operation: active ? 'synchronize' : 'invalidate' });
    const newAction = LIKE_TYPES.has(input.type) ? added : changed;
    if (push && active && updated.channels.push && newAction && row.sourceSignature !== 'legacy') await dispatch(updated);
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
    _id: row._id, active: true, sourceSignature: row.sourceSignature,
    $or: [{ lastPushAt: null }, { lastPushAt: { $lte: new Date(now - cooldownMs()) } }]
  }, { $set: { lastPushAt: now } }, { new: true });
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
      await Notification.updateOne({ _id: row._id }, { $set: { active: false, invalidatedAt: new Date() } });
      logger.warn('[social-notification]', { notificationId: String(row._id), code: 'missing_source_identity' });
    }
  }
  const inputs = [...unique.values()];
  for (let offset = 0; offset < inputs.length; offset += 8) {
    await Promise.all(inputs.slice(offset, offset + 8).map(row => synchronize(row)));
  }
  // Older mentions already carried the exact comment ID. Older reply records
  // only identify the parent, which can still be checked without inventing a source.
  const sourced = await Notification.find({ userId, active: { $ne: false }, $or: [
    { sourceId: { $ne: null } },
    { type: { $in: ['mention', 'comment_reply'] }, 'data.commentId': { $ne: null } }
  ] }).lean();
  for (const row of sourced) {
    const Comment = require('../models/ActivityComment');
    const source = await Comment.findById(row.sourceId || row.data.commentId).lean();
    const parentExists = source?.parentCommentId ? await Comment.exists({ _id: source.parentCommentId }) : true;
    if (!source || !parentExists) await Notification.updateOne({ _id: row._id }, { $set: { active: false, invalidatedAt: new Date() } });
  }
}

async function safely(work) {
  try { return await work(); }
  catch (error) { logger.warn('[social-notification]', { operation: 'synchronize', code: error.code || error.name }); return null; }
}

module.exports = { TYPES, visibleQuery, identity, synchronize, reconcileUser, safely, cooldownMs, ensureIndexes };
