const policy = require('./notificationPolicy');
// Dependency injection keeps clock, provider and concurrency tests independent of production services.
function createRunner(deps) {
  return async function run(notificationType, buildContent, clock = () => new Date()) {
    const counts = { sent: 0, skipped: 0, failed: 0 };
    const users = await deps.users();
    for (const user of users) {
      let claimed;
      let context;
      let userId;
      const log = (skipReason, deliveryStatus) => deps.log({ notificationType, userId, userTimezone: context?.timezone || user.timezone || 'UTC', localDate: context?.localDate, eligibility: !skipReason, skipReason, deliveryStatus });
      try {
        userId = policy.normalizeUserId(user.id);
        context = policy.localContext(user.timezone, clock());
        let reason = policy.scheduledReason(notificationType, context);
        if (!reason) reason = policy.preferenceReason(await deps.preferences(userId), notificationType);
        if (!reason && !await deps.activeDevice(userId)) reason = 'no_active_device';
        if (!reason && notificationType === 'daily_logs_prompt' && await deps.dailyLog(userId, context)) reason = 'daily_log_exists';
        if (reason) { counts.skipped++; log(reason, null); continue; }
        const content = await buildContent(user, context);
        // Recheck time after potentially slow content generation, before claiming.
        const fresh = policy.localContext(user.timezone, clock());
        if (fresh.localDate !== context.localDate || policy.scheduledReason(notificationType, fresh)) { counts.skipped++; log('outside_time_window', null); continue; }
        claimed = await deps.claim({ userId, notificationType, localDate: context.localDate }, clock());
        if (!claimed) { counts.skipped++; log('already_sent_or_claimed', null); continue; }
        // Recheck mutable eligibility immediately before creating visible history/sending.
        reason = policy.preferenceReason(await deps.preferences(userId), notificationType);
        if (!reason && !await deps.activeDevice(userId)) reason = 'no_active_device';
        if (!reason && notificationType === 'daily_logs_prompt' && await deps.dailyLog(userId, context)) reason = 'daily_log_exists';
        const result = reason ? { ok: false, retryable: false, code: reason } : await deps.deliver(claimed, { ...content, userId, type: notificationType });
        await deps.finish(claimed, result, clock());
        counts[result.ok ? 'sent' : 'failed']++;
        log(result.ok ? null : result.code, result.ok ? 'SENT' : 'FAILED');
      } catch (error) {
        counts.failed++;
        if (claimed) await deps.finish(claimed, { ok: false, retryable: true, code: 'operation_failed' }, clock());
        log('operation_failed', claimed ? 'FAILED' : null);
      }
    }
    return counts;
  };
}
function productionRunner() {
  const DeviceToken = require('../models/DeviceToken');
  const UserPreferences = require('../models/extended/UserPreferences');
  const DailyLog = require('../models/DailyLogsEntry');
  const Notification = require('../models/Notification');
  const delivery = require('./scheduledDeliveryService');
  return createRunner({
    users: () => require('./pgUserService').getActiveUsers(),
    preferences: id => UserPreferences.findOne({ userId: id }).select('notifications').lean(),
    activeDevice: id => DeviceToken.exists(policy.activeDeviceFilter(id)),
    dailyLog: (id, context) => DailyLog.exists({ userId: id, createdAt: { $gte: context.startUtc, $lt: context.endUtc } }),
    claim: delivery.claim, finish: delivery.finish,
    deliver: async (claimed, content) => {
      // Stable document identity avoids duplicate notification-center rows on a retry.
      let notification = await Notification.findById(claimed._id);
      if (!notification) {
        try { notification = await Notification.create({ _id: claimed._id, ...content, channels: { inApp: true, push: true }, expiresAt: new Date(Date.now() + 30 * 86400000) }); }
        catch (error) { if (error.code !== 11000) throw error; notification = await Notification.findById(claimed._id); }
      }
      if (notification.isDelivered) return { ok: true };
      if (!await delivery.owns(claimed)) return { ok: false, retryable: true, code: 'lease_lost' };
      const result = await require('./pushService').sendFcmToUser(content.userId, notification, { waitForDelivery: true });
      if (result.ok) await Notification.updateOne({ _id: notification._id }, { $set: { isDelivered: true, deliveredAt: new Date() } });
      return result;
    },
    log: event => require('../config/observability').logger.info('[scheduled-notification]', event)
  });
}
module.exports = { createRunner, runScheduled: (...args) => productionRunner()(...args) };
