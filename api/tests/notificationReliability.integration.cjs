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
const { sendFcmToUser } = require('../src/services/pushService');
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
  clock?.uninstall();
  await mongoose.connection.close(true);
  await server?.stop();
});
beforeEach(async () => {
  await Promise.all([Delivery, Notification, Preferences, Device, DailyLog, Budget].map(model => model.deleteMany({})));
  clock.setSystemTime(new Date('2026-09-27T08:30:00Z'));
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
  await DailyLog.create({ userId: 7, content: 'Journal' });
  assert.equal((await delivery.cleanup()).deletedCount, 1);
  assert.equal(await Delivery.countDocuments(), 1); assert.equal(await Notification.countDocuments(), 1); assert.equal(await DailyLog.countDocuments(), 1);
});
test('quiet-hours social history is retained while immediate push is suppressed', async () => {
  clock.setSystemTime(new Date('2026-09-27T22:00:00Z'));
  await Notification.createNotification({ userId: 7, type: 'follow_request', title: 'Request', message: 'Request', data: { actorId: 8 } });
  assert.equal(await Notification.countDocuments({ 'channels.inApp': true }), 1); assert.equal(submitted.length, 0);
});
test('concurrent likes aggregate history; actionable requests stay separate', async () => {
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  await Promise.all(Array.from({ length: 8 }, (_, i) => Notification.createNotification({ userId: 7, type: 'goal_liked', title: 'Like', message: 'Like', data: { goalId: 9, likerId: i + 10 } })));
  const like = await Notification.findOne({ type: 'goal_liked' });
  assert.equal(like.aggregateActors.length, 8); assert.equal(like.message, '8 people liked your goal'); assert.equal(await Notification.countDocuments(), 1);
  await Promise.all([10, 11].map(actorId => Notification.createNotification({ userId: 7, type: 'follow_request', title: 'Request', message: 'Request', data: { actorId } })));
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

test('social opt-out is applied before aggregation and does not reopen existing history', async () => {
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  const input = { userId: 7, type: 'goal_liked', title: 'Like', message: 'Like', data: { goalId: 9, likerId: 10 } };
  const first = await Notification.createNotification(input);
  await Notification.updateOne({ _id: first._id }, { $set: { isRead: true } });
  await Preferences.updateOne({ userId: 7 }, { $set: { 'notifications.inApp.socialUpdates': false } });
  await Notification.createNotification({ ...input, channels: undefined, data: { goalId: 9, likerId: 11 } });
  assert.equal((await Notification.findById(first._id)).isRead, true);
  assert.equal(await Notification.countDocuments({ 'channels.inApp': true }), 1);
  assert.equal(submitted.length, 0);
});

test('unlike/re-like by the same person does not reopen a read goal notification', async () => {
  clock.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  const first = await Notification.createGoalLikeNotification(10, 9, 7);
  await Notification.updateOne({ _id: first._id }, { $set: { isRead: true } });
  clock.setSystemTime(new Date(Date.now() + 61000));
  await Notification.createGoalLikeNotification(10, 9, 7);
  assert.equal((await Notification.findById(first._id)).isRead, true);
  assert.equal(await Notification.countDocuments(), 1);
});

});
