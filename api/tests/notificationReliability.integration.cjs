const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require(process.env.WT_MONGO_TEST_MODULE || 'mongodb-memory-server');
const FakeTimers = require('@sinonjs/fake-timers');
const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: require.resolve(path), filename: require.resolve(path), loaded: true, exports }; };
let users = [{ id: '7', timezone: 'UTC' }];
let submitted = [];
let providerResult;
let clock, server;
let actors = [];
let relationship = { status: 'pending', createdAt: '2026-09-27T08:00:00Z' };
let readActors = async () => actors.slice();
stub('../src/services/pgLikeService', { getNotificationActors: (...args) => readActors(...args) });
stub('../src/services/pgFollowService', { getFollowRelationship: async () => relationship });
stub('../src/config/observability', { logger: { info() {}, warn() {}, error() {} } });
stub('../src/services/pgUserService', { getActiveUsers: async () => users, findById: async () => ({ ...users[0], name: 'Actor' }) });
stub('../src/services/pgGoalService', { findById: async () => ({ id: 9, title: 'Goal' }) });
stub('../src/config/redis', { get: async () => { throw new Error('Redis unavailable'); }, set: async () => { throw new Error('Redis unavailable'); } });
stub('firebase-admin', { apps: [{}], messaging: () => ({ sendEachForMulticast: async message => { submitted.push(message); return providerResult || { successCount: message.tokens.length, responses: message.tokens.map(() => ({ success: true })) }; } }) });
const Delivery = require('../src/models/ScheduledNotificationDelivery');
const Notification = require('../src/models/Notification');
const Preferences = require('../src/models/extended/UserPreferences');
const Device = require('../src/models/DeviceToken');
const DailyLog = require('../src/models/DailyLogsEntry');
const Budget = require('../src/models/NotificationPushBudget');
const delivery = require('../src/services/scheduledDeliveryService');
const { runScheduled } = require('../src/services/scheduledNotificationService');
const { sendFcmToUser, drainPendingPushes } = require('../src/services/pushService');
const content = async () => ({ title: 'Reminder', message: 'Test reminder', priority: 'low' });
const key = { userId: 7, notificationType: 'motivation_quote', localDate: '2026-09-27' };
describe('notification reliability against real MongoDB', () => {
before(async () => {
  server = await MongoMemoryServer.create({ instance: { args: ['--setParameter', 'ttlMonitorEnabled=false'] } });
  await mongoose.connect(server.getUri());
  await Promise.all([Delivery, Notification, Preferences, Device, DailyLog, Budget].map(model => model.createIndexes()));
  clock = FakeTimers.install({ now: new Date('2026-09-27T08:30:00Z'), toFake: ['Date'] });
});
after(async () => {
  await drainPendingPushes();
  clock?.uninstall();
  await mongoose.connection.close(true);
  await server?.stop();
});
beforeEach(async () => {
  await drainPendingPushes();
  stub('../src/services/pgFollowService', { getFollowRelationship: async () => relationship });
  await Promise.all([Delivery, Notification, Preferences, Device, DailyLog, Budget].map(model => model.deleteMany({})));
  clock.setSystemTime(new Date('2026-09-27T08:30:00Z'));
  actors = []; readActors = async () => actors.slice(); relationship = { status: 'pending', createdAt: '2026-09-27T08:00:00Z' };
  submitted = []; providerResult = null; users = [{ id: '7', timezone: 'UTC' }]; delete process.env.NOTIFICATION_DAILY_PUSH_CAP;
  await Preferences.create({ userId: 7 });
  await Device.create({ userId: 7, token: 'fcm-test', provider: 'fcm', platform: 'android' });
});
test('24 concurrent cron runs with Redis down create one claim, one history row, one push', async () => {
  await Promise.all(Array.from({ length: 24 }, () => runScheduled('motivation_quote', content)));
  assert.equal(await Delivery.countDocuments(), 1);
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(submitted.length, 1);
  assert.equal((await Delivery.findOne()).status, 'SENT');
});
test('retryable provider failure has a delay, reuses history, and stops at three attempts', async () => {
  providerResult = { successCount: 0, responses: [{ success: false, error: { code: 'messaging/server-unavailable' } }] };
  await runScheduled('motivation_quote', content);
  await runScheduled('motivation_quote', content);
  assert.equal(submitted.length, 1);
  for (let i = 0; i < 3; i++) { clock.setSystemTime(new Date(Date.now() + 6 * 60000)); await runScheduled('motivation_quote', content); }
  const row = await Delivery.findOne();
  assert.equal(row.attemptCount, 3); assert.equal(row.status, 'FAILED');
  assert.equal(await Notification.countDocuments(), 1); assert.equal(submitted.length, 3);
});
test('permanent provider rejection is not retried', async () => {
  providerResult = { successCount: 0, responses: [{ success: false, error: { code: 'messaging/invalid-argument' } }] };
  await runScheduled('motivation_quote', content);
  clock.setSystemTime(new Date(Date.now() + 3600000)); await runScheduled('motivation_quote', content);
  assert.equal(submitted.length, 1); assert.equal((await Delivery.findOne()).retryable, false);
});
test('stale claims recover with a fencing token; old owner cannot finish the replacement', async () => {
  const first = await delivery.claim(key);
  assert.equal(await delivery.claim(key), null);
  clock.setSystemTime(new Date(Date.now() + delivery.LEASE_MS + 1));
  const second = await delivery.claim(key);
  assert.equal(second.attemptCount, 2); assert.notEqual(first.claimToken, second.claimToken);
  await delivery.finish(first, { ok: true }); assert.equal((await Delivery.findOne()).status, 'CLAIMED');
  await delivery.finish(second, { ok: true }); assert.equal((await Delivery.findOne()).status, 'SENT');
});
test('seven-day cleanup deletes only expired internal records', async () => {
  const old = await delivery.claim(key);
  await Delivery.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 8 * 86400000) } });
  await delivery.claim({ ...key, userId: 8 });
  await Notification.create({ userId: 7, type: 'new_follower', title: 'Follow', message: 'Follow', createdAt: new Date(Date.now() - 8 * 86400000) });
  await drainPendingPushes();
  await DailyLog.create({ userId: 7, content: 'Journal' });
  assert.equal((await delivery.cleanup()).deletedCount, 1);
  assert.equal(await Delivery.countDocuments(), 1); assert.equal(await Notification.countDocuments(), 1); assert.equal(await DailyLog.countDocuments(), 1);
});
test('overnight social history and immediate push are both delivered', async () => {
  clock.setSystemTime(new Date('2026-09-27T22:00:00Z'));
  await Notification.createNotification({ userId: 7, type: 'follow_request', title: 'Request', message: 'Request', data: { actorId: 8 } });
  await drainPendingPushes();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(await Notification.countDocuments({ 'channels.inApp': true }), 1);
  assert.equal(await Notification.countDocuments(), 1); assert.equal(submitted.length, 1);
});
test('concurrent likes aggregate history; actionable requests stay separate', async () => {
  actors = [10,11,12,13,14,15,16,17];
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  await Promise.all(Array.from({ length: 8 }, (_, i) => Notification.createNotification({ userId: 7, type: 'goal_liked', title: 'Like', message: 'Like', data: { goalId: 9, likerId: i + 10 } })));
  await drainPendingPushes();
  const like = await Notification.findOne({ type: 'goal_liked' });
  assert.equal(like.aggregateActors.length, 8); assert.equal(like.message, '8 people liked your goal'); assert.equal(await Notification.countDocuments(), 1);
  await Promise.all([10, 11].map(actorId => Notification.createNotification({ userId: 7, type: 'follow_request', title: 'Request', message: 'Request', data: { actorId } })));
  await drainPendingPushes();
  assert.equal(await Notification.countDocuments({ type: 'follow_request' }), 2);
});
test('invalid FCM tokens are deactivated; non-urgent pushes have normal priority and no sound', async () => {
  providerResult = { successCount: 0, responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }] };
  await runScheduled('motivation_quote', content);
  assert.equal((await Device.findOne()).isActive, false);
  assert.equal(submitted[0].android.priority, 'normal'); assert.equal(submitted[0].android.notification.sound, undefined);
});
test('inactive devices prevent claim and history creation', async () => {
  await Device.updateMany({}, { $set: { isActive: false } });
  await runScheduled('motivation_quote', content);
  assert.equal(await Delivery.countDocuments(), 0); assert.equal(await Notification.countDocuments(), 0);
});
test('normalized string PG ID respects numeric Mongo opt-out', async () => {
  await Preferences.updateOne({ userId: 7 }, { $set: { 'notifications.inApp.motivationReminder': false } });
  await runScheduled('motivation_quote', content);
  assert.equal(await Delivery.countDocuments(), 0); assert.equal(submitted.length, 0);
});
test('local-day journal query uses half-open UTC boundaries', async () => {
  users = [{ id: '7', timezone: 'Asia/Kolkata' }]; clock.setSystemTime(new Date('2026-09-27T15:00:00Z'));
  await DailyLog.create({ userId: 7, content: 'Today', createdAt: new Date('2026-09-26T18:30:00Z') });
  await runScheduled('daily_logs_prompt', content); assert.equal(await Delivery.countDocuments(), 0);
  await DailyLog.deleteMany({});
  await DailyLog.create({ userId: 7, content: 'Yesterday', createdAt: new Date('2026-09-26T18:29:59Z') });
  await runScheduled('daily_logs_prompt', content); assert.equal(submitted.length, 1);
});
test('optional cap is atomic and does not hide actionable follow requests', async () => {
  process.env.NOTIFICATION_DAILY_PUSH_CAP = '2';
  const notification = { _id: new mongoose.Types.ObjectId(), type: 'activity_comment', title: 'Comment', message: 'Comment' };
  const results = await Promise.all(Array.from({ length: 8 }, () => sendFcmToUser(7, notification, { waitForDelivery: true })));
  assert.equal(results.filter(r => r.ok).length, 2);
  assert.equal((await sendFcmToUser(7, { ...notification, type: 'follow_request' }, { waitForDelivery: true })).ok, true);
});

test('partial provider acceptance is not resent on the next cron', async () => {
  await Device.create({ userId: 7, token: 'second-device', provider: 'fcm', platform: 'ios' });
  providerResult = { successCount: 1, responses: [{ success: true }, { success: false, error: { code: 'messaging/server-unavailable' } }] };
  await runScheduled('motivation_quote', content);
  clock.setSystemTime(new Date(Date.now() + 3600000)); await runScheduled('motivation_quote', content);
  assert.equal(submitted.length, 1); assert.equal((await Delivery.findOne()).status, 'SENT');
});
test('explicit logout deactivates all duplicates for that token but keeps other devices', async () => {
  stub('../src/services/pgFollowService', {});
  const controller = require('../src/controllers/notificationController');
  await Device.create({ userId: 7, token: 'second-device', provider: 'fcm', platform: 'ios' });
  await Device.create({ userId: 7, token: 'fcm-test', provider: 'fcm', platform: 'android' });
  let result;
  await controller.unregisterDevice({ user: { id: 7 }, body: { token: 'fcm-test' } }, { json: value => { result = value; }, status: () => { throw new Error('Unexpected response'); } });
  assert.equal(result.success, true); assert.equal(await Device.countDocuments({ token: 'fcm-test', isActive: true }), 0);
  assert.equal(await Device.countDocuments({ token: 'second-device', isActive: true }), 1);
});
test('real motivation service falls back to curated content with Redis unavailable', async () => {
  await require('../src/services/motivationService').sendMorningQuotes();
  assert.equal(submitted.length, 1); assert.equal((await Delivery.findOne()).status, 'SENT');
});
test('Mongo indexes include the unique daily key and seven-day TTL', async () => {
  const indexes = await Delivery.collection.indexes();
  assert.equal(indexes.find(i => i.name === 'scheduled_delivery_daily_unique').unique, true);
  assert.equal(indexes.find(i => i.name === 'scheduled_delivery_retention').expireAfterSeconds, 604800);
});

test('social opt-out hides the existing aggregate without creating duplicate history', async () => {
  actors = [10];
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  const input = { userId: 7, type: 'goal_liked', title: 'Like', message: 'Like', data: { goalId: 9, likerId: 10 } };
  const first = await Notification.createNotification(input);
  await drainPendingPushes();
  await Notification.updateOne({ _id: first._id }, { $set: { isRead: true } });
  await Preferences.updateOne({ userId: 7 }, { $set: { 'notifications.inApp.socialUpdates': false } });
  await Notification.createNotification({ ...input, channels: undefined, data: { goalId: 9, likerId: 11 } });
  await drainPendingPushes();
  assert.equal((await Notification.findById(first._id)).isRead, true);
  assert.equal(await Notification.countDocuments({ 'channels.inApp': true }), 0);
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(submitted.length, 1); // Only the original, pre-opt-out push.
});

test('duplicate creation without a source change does not reopen a read goal notification', async () => {
  actors = [10];
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  const first = await Notification.createGoalLikeNotification(10, 9, 7);
  await drainPendingPushes();
  await Notification.updateOne({ _id: first._id }, { $set: { isRead: true } });
  clock.setSystemTime(new Date(Date.now() + 61000));
  await Notification.createGoalLikeNotification(10, 9, 7);
  await drainPendingPushes();
  assert.equal((await Notification.findById(first._id)).isRead, true);
  assert.equal(await Notification.countDocuments(), 1);
});


const lifecycle = require('../src/services/socialNotificationLifecycle');
const likeInput = () => ({ userId: 7, type: 'goal_liked', title: 'Like', message: 'Like', data: { goalId: 9, likerId: 10 } });

test('like/unlike/re-like reuses one row and respects cooldown while restoring unread state', async () => {
  actors = [10];
  const first = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  await Notification.markAsRead(first._id, 7);
  actors = [];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(await Notification.getUnreadCount(7), 0);
  assert.equal((await Notification.getUserNotifications(7)).length, 0);
  clock.setSystemTime(new Date(Date.now() + 1000));
  actors = [10];
  const restored = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(String(restored._id), String(first._id));
  assert.equal(restored.active, true);
  assert.equal(restored.createdAt.getTime(), Date.now());
  assert.equal(restored.isRead, false);
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(submitted.length, 1);
  actors = [];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  clock.setSystemTime(new Date(Date.now() + 601000));
  actors = [10];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(submitted.length, 2);
});

test('aggregate removal updates count and representative actor; final removal is idempotent', async () => {
  actors = [10, 11];
  const row = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  await Notification.markAsRead(row._id, 7);
  actors = [11];
  await lifecycle.reconcileUser(7);
  let current = await Notification.findById(row._id);
  assert.deepEqual(current.aggregateActors.toObject(), [11]);
  assert.equal(current.data.actorId, 11);
  assert.equal(current.message, '1 person liked your goal');
  assert.equal(current.isRead, true);
  actors = [];
  await lifecycle.reconcileUser(7);
  await lifecycle.reconcileUser(7);
  current = await Notification.findById(row._id);
  assert.equal(current.active, false);
  assert.equal(await Notification.getUnreadCount(7), 0);
});

test('a delayed creation after unlike cannot recreate an active notification or send a push', async () => {
  actors = [];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(await Notification.countDocuments({ active: true }), 0);
  assert.equal(submitted.length, 0);
});

test('a stale source read loses its CAS and retries after a newer invalidation', async () => {
  actors = [10];
  const original = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let delayed = true;
  readActors = async () => {
    const captured = actors.slice();
    if (delayed) { delayed = false; entered(); await gate; }
    return captured;
  };
  const stale = lifecycle.synchronize(likeInput());
  await started;
  actors = [];
  await lifecycle.synchronize(likeInput());
  release();
  await stale;
  assert.equal((await Notification.findById(original._id)).active, false);
  assert.equal(await Notification.countDocuments(), 1);
});

test('follow/unfollow/refollow has one active row and one push within cooldown', async () => {
  relationship = { status: 'accepted', createdAt: '2026-09-27T08:00:00Z' };
  const first = await Notification.createFollowNotification(10, 7);
  await drainPendingPushes();
  relationship = null;
  await Notification.createFollowNotification(10, 7);
  await drainPendingPushes();
  assert.equal((await Notification.findById(first._id)).active, false);
  relationship = { status: 'accepted', createdAt: '2026-09-27T08:01:00Z' };
  await Promise.all(Array.from({ length: 12 }, () => Notification.createFollowNotification(10, 7)));
  await drainPendingPushes();
  assert.equal(await Notification.countDocuments({ active: true }), 1);
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(submitted.length, 1);
});

test('request cancellation/rejection invalidates idempotently; acceptance preserves separate history', async () => {
  const request = await Notification.createFollowRequestNotification(10, 7);
  await drainPendingPushes();
  relationship = null;
  await Notification.deleteFollowRequestNotification(10, 7);
  await Notification.deleteFollowRequestNotification(10, 7);
  assert.equal((await Notification.findById(request._id)).active, false);
  relationship = { status: 'pending', createdAt: '2026-09-27T08:01:00Z' };
  await Notification.createFollowRequestNotification(10, 7);
  await drainPendingPushes();
  relationship = { status: 'accepted', createdAt: '2026-09-27T08:02:00Z' };
  await Notification.convertFollowRequestToNewFollower(10, 7);
  await Notification.createFollowAcceptedNotification(7, 10);
  await drainPendingPushes();
  assert.equal(await Notification.countDocuments({ type: 'follow_request', active: true }), 0);
  assert.equal(await Notification.countDocuments({ type: 'new_follower', active: true }), 1);
  assert.equal(await Notification.countDocuments({ type: 'follow_request_accepted' }), 1);
});

test('master/social opt-out and overnight operation never prevent invalidation', async () => {
  actors = [10];
  const row = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  await Preferences.updateOne({ userId: 7 }, { $set: { 'notifications.inApp.enabled': false, 'notifications.inApp.socialUpdates': false } });
  clock.setSystemTime(new Date('2026-09-27T23:59:00Z'));
  actors = [];
  await lifecycle.reconcileUser(7);
  assert.equal((await Notification.findById(row._id)).active, false);
  assert.equal(submitted.length, 1);
});

test('legacy duplicates are retained inactive and folded into one current aggregate without push', async () => {
  actors = [10, 11];
  await Notification.create({ ...likeInput(), aggregationKey: 'old-one', aggregateActors: [10] });
  await drainPendingPushes();
  await Notification.create({ ...likeInput(), aggregationKey: 'old-two', aggregateActors: [11] });
  await drainPendingPushes();
  await lifecycle.reconcileUser(7);
  assert.equal(await Notification.countDocuments(), 3);
  assert.equal(await Notification.countDocuments({ active: true }), 1);
  assert.equal((await Notification.findOne({ active: true })).aggregateActors.length, 2);
  assert.equal(submitted.length, 0);
  await lifecycle.reconcileUser(7);
  assert.equal(await Notification.countDocuments(), 3);
});

test('dismissed notifications stay dismissed on reads and duplicate events', async () => {
  actors = [10];
  const row = await Notification.createNotification(likeInput());
  await drainPendingPushes();
  await Notification.deleteNotification(row._id, 7);
  await lifecycle.reconcileUser(7);
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal((await Notification.findById(row._id)).active, false);
  assert.equal(submitted.length, 1);
});

test('comment/reply sources and dependent mentions are invalidated on deletion', async () => {
  const Comment = require('../src/models/ActivityComment');
  const activity = { _id: new mongoose.Types.ObjectId(), userId: 7, data: {} };
  const parent = await Comment.create({ activityId: activity._id, userId: 10, text: 'Parent' });
  const reply = await Comment.create({ activityId: activity._id, userId: 11, text: 'Reply', parentCommentId: parent._id });
  const commentNotice = await Notification.createActivityCommentNotification(10, activity, parent);
  await drainPendingPushes();
  const replyNotice = await Notification.createCommentReplyNotification(11, parent, activity, reply);
  await drainPendingPushes();
  const mention = await Notification.createMentionNotification(11, 7, { activityId: activity._id, commentId: reply._id });
  await drainPendingPushes();
  assert.equal(String(replyNotice.data.commentId), String(reply._id));
  await Comment.updateOne({ _id: parent._id }, { $set: { text: 'Edited' } });
  await Notification.createActivityCommentNotification(10, activity, parent);
  await drainPendingPushes();
  assert.equal(await Notification.countDocuments({ type: 'activity_comment' }), 1);
  await Comment.deleteOne({ _id: reply._id });
  assert.equal((await Notification.findById(replyNotice._id)).active, false);
  assert.equal((await Notification.findById(mention._id)).active, false);
  assert.equal((await Notification.findById(commentNotice._id)).active, true);
  await Comment.deleteOne({ _id: parent._id });
  assert.equal((await Notification.findById(commentNotice._id)).active, false);
  assert.equal(await Notification.createActivityCommentNotification(10, activity, parent), null);
  await drainPendingPushes();
});

test('parent deletion also invalidates surviving reply and mention dependencies', async () => {
  const Comment = require('../src/models/ActivityComment');
  const activity = { _id: new mongoose.Types.ObjectId(), userId: 7, data: {} };
  const parent = await Comment.create({ activityId: activity._id, userId: 10, text: 'Parent' });
  const reply = await Comment.create({ activityId: activity._id, userId: 11, text: 'Reply', parentCommentId: parent._id });
  const notice = await Notification.createCommentReplyNotification(11, parent, activity, reply);
  await drainPendingPushes();
  await Comment.deleteMany({ _id: parent._id });
  assert.equal((await Notification.findById(notice._id)).active, false);
  assert.equal(await Notification.createCommentReplyNotification(11, parent, activity, reply), null);
  await drainPendingPushes();
});

test('lifecycle key is the only lifecycle index', async () => {
  const indexes = await Notification.collection.indexes();
  assert.ok(indexes.some(index => index.name === 'notification_lifecycle_unique' && index.unique));
  assert.equal(indexes.some(index => index.key.sourceId === 1), false);
  assert.equal(indexes.some(index => index.key.aggregationKey === 1), false);
});


test('read legacy history remains read after migration', async () => {
  actors = [10];
  const createdAt = new Date('2026-09-26T12:00:00Z');
  await Notification.create({ ...likeInput(), isRead: true, createdAt });
  await drainPendingPushes();
  await lifecycle.reconcileUser(7);
  const row = await Notification.findOne({ active: true });
  assert.equal(row.isRead, true);
  assert.equal(row.createdAt.toISOString(), createdAt.toISOString());
});

test('notification API repairs a missed reversal and excludes hidden rows from all counts', async () => {
  actors = [10];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  actors = []; // Simulate primary action succeeding while its cleanup was lost.
  await Notification.create({ userId: 7, type: 'mention', title: 'Hidden', message: 'Hidden', channels: { inApp: false } });
  await drainPendingPushes();
  const controller = require('../src/controllers/notificationController');
  let response;
  const res = { status() { return this; }, json(value) { response = value; } };
  await controller.getNotifications({ user: { id: 7 }, query: {} }, res, error => { throw error; });
  assert.equal(response.data.notifications.length, 0);
  assert.equal(response.data.pagination.total, 0);
  assert.equal(response.data.unread, 0);
});

test('activity and reply likes reconcile membership and never resurrect after parent deletion', async () => {
  const Activity = require('../src/models/Activity');
  const Comment = require('../src/models/ActivityComment');
  const activity = await Activity.create({ userId: 7, type: 'goal_activity' });
  const parent = await Comment.create({ activityId: activity._id, userId: 7, text: 'Parent' });
  const reply = await Comment.create({ activityId: activity._id, userId: 7, text: 'Reply', parentCommentId: parent._id });
  actors = [10];
  const activityNotice = await Notification.createActivityLikeNotification(10, activity);
  await drainPendingPushes();
  const replyNotice = await Notification.createCommentLikeNotification(10, reply);
  await drainPendingPushes();
  assert.equal(activityNotice.active, true);
  assert.equal(replyNotice.active, true);
  await Comment.deleteOne({ _id: parent._id });
  await lifecycle.reconcileUser(7);
  assert.equal((await Notification.findById(replyNotice._id)).active, false);
  actors = [];
  await Notification.createActivityLikeNotification(10, activity);
  await drainPendingPushes();
  assert.equal((await Notification.findById(activityNotice._id)).active, false);
});

test('an old comment push cannot be sent after its source was deleted', async () => {
  const Comment = require('../src/models/ActivityComment');
  const comment = await Comment.create({ activityId: new mongoose.Types.ObjectId(), userId: 10, text: 'Comment' });
  const notice = await Notification.createNotification({ userId: 7, type: 'mention', title: 'Mention', message: 'Mention', data: { commentId: comment._id } });
  await drainPendingPushes();
  await new Promise(resolve => setTimeout(resolve, 30));
  await Comment.deleteOne({ _id: comment._id });
  const prior = submitted.length;
  const result = await sendFcmToUser(7, notice, { waitForDelivery: true });
  assert.equal(result.code, 'source_deleted');
  assert.equal(submitted.length, prior);
});


test('unlike never sends another push for the remaining actors, even after cooldown', async () => {
  actors = [10, 11];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(submitted.length, 1);
  clock.setSystemTime(new Date(Date.now() + 601000));
  actors = [11];
  await Notification.createNotification(likeInput());
  await drainPendingPushes();
  assert.equal(submitted.length, 1);
  assert.equal((await Notification.findOne({ active: true })).message, '1 person liked your goal');
});

test('explicit push opt-out preserves in-app state without consuming cooldown', async () => {
  actors = [10];
  const row = await Notification.createNotification({ ...likeInput(), channels: { push: false, inApp: true } });
  await drainPendingPushes();
  assert.equal(row.active, true);
  assert.equal(row.channels.inApp, true);
  assert.equal((await Notification.findById(row._id)).lastPushAt, undefined);
  assert.equal(submitted.length, 0);
});


test('a budget insert collision retries the remaining capacity instead of treating it as exhausted', async () => {
  process.env.NOTIFICATION_DAILY_PUSH_CAP = '2';
  await Budget.create({ userId: 7, localDate: '2026-09-27', count: 1 });
  const original = Budget.findOneAndUpdate;
  let collide = true;
  Budget.findOneAndUpdate = function(...args) {
    if (collide) { collide = false; return Promise.reject(Object.assign(new Error('simulated concurrent insert'), { code: 11000 })); }
    return original.apply(this, args);
  };
  try {
    const notification = { _id: new mongoose.Types.ObjectId(), type: 'activity_comment', title: 'Comment', message: 'Comment' };
    assert.equal((await sendFcmToUser(7, notification, { waitForDelivery: true })).ok, true);
    assert.equal((await Budget.findOne({ userId: 7 })).count, 2);
    assert.equal((await sendFcmToUser(7, notification, { waitForDelivery: true })).code, 'rate_limited');
  } finally { Budget.findOneAndUpdate = original; }
});


test('concurrent deployment hooks reconcile legacy data and persist a completion marker', async () => {
  const { createRunner, backfill, MIGRATION_ID } = require('../src/migrations/socialNotificationDeployment');
  const collection = mongoose.connection.db.collection('deployment_migrations');
  await collection.deleteMany({});
  actors = [10];
  await Notification.create({ ...likeInput(), isRead: true });
  let executions = 0;
  const runner = createRunner({ collection, runBackfill: async () => { executions++; return backfill(); }, log() {} });
  await Promise.all([runner(), runner()]);
  assert.ok((await collection.findOne({ _id: MIGRATION_ID })).completedAt);
  assert.equal(await Notification.countDocuments({ active: true }), 1);
  assert.equal((await Notification.findOne({ active: true })).isRead, true);
  assert.equal(submitted.length, 0);
  const before = executions;
  await runner();
  assert.equal(executions, before);
});

test('storage cleanup preserves source state while removing redundant fields and indexes', async () => {
  const { cleanup } = require('../src/migrations/notificationStorageCleanup');
  const source = new mongoose.Types.ObjectId();
  const row = await Notification.create({
    userId: 7, type: 'follow_request', title: 'Request', message: 'Request',
    lifecycleKey: '7:follow_request:10', data: { followerId: 10 }, isRead: true
  });
  await Notification.collection.updateOne({ _id: row._id }, { $set: {
    sourceId: source, sourceSignature: 'pending:old', lifecycleRevision: 4,
    invalidatedAt: new Date(), aggregationKey: 'old', dismissed: false
  } });
  await Notification.collection.createIndex({ sourceId: 1, active: 1 });
  await Notification.collection.createIndex({ userId: 1, active: 1, createdAt: -1 });
  await Notification.collection.createIndex({ aggregationKey: 1 }, { unique: true, sparse: true, name: 'notification_like_group_unique' });

  const result = await cleanup();
  const compacted = await Notification.collection.findOne({ _id: row._id });
  assert.deepEqual(compacted.aggregateActors, [10]);
  assert.equal(String(compacted.data.commentId), String(source));
  for (const field of ['sourceId', 'sourceSignature', 'lifecycleRevision', 'invalidatedAt', 'aggregationKey', 'dismissed']) {
    assert.equal(Object.hasOwn(compacted, field), false);
  }
  assert.equal(result.removedIndexes.length, 3);
  const indexes = await Notification.collection.indexes();
  assert.ok(indexes.some(index => index.name === 'notification_lifecycle_unique'));
});

});
