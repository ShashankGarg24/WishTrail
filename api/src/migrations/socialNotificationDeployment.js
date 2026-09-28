// TEMPORARY: remove the server.js startup call after confirming completion.
// Keep the database marker so reintroducing the hook cannot replay the migration.
const MIGRATION_ID = 'social-notification-lifecycle-v1';

async function backfill() {
  for (const name of ['ScheduledNotificationDelivery', 'NotificationPushBudget', 'Notification', 'DailyLogsEntry', 'DeviceToken']) {
    await require(`../models/${name}`).createIndexes();
  }
  const Notification = require('../models/Notification');
  const lifecycle = require('../services/socialNotificationLifecycle');
  const users = await Notification.distinct('userId', {
    type: { $in: [...lifecycle.TYPES, 'activity_comment', 'comment_reply', 'mention'] }
  });
  for (const userId of users) await lifecycle.reconcileUser(userId);
  return users.length;
}

function createRunner({ collection, runBackfill, log }) {
  return async function run() {
    const completed = await collection.findOne({ _id: MIGRATION_ID });
    if (completed?.completedAt) {
      log('migration.social_notifications.skipped', { migrationId: MIGRATION_ID });
      return;
    }
    log('migration.social_notifications.started', { migrationId: MIGRATION_ID });
    // The backfill is idempotent and sends no pushes. Concurrent new instances
    // may both run it safely; neither serves requests until its run finishes.
    // Failures propagate to startup and never record successful completion.
    const recipients = await runBackfill();
    await collection.updateOne({ _id: MIGRATION_ID }, {
      $setOnInsert: { completedAt: new Date(), recipients }
    }, { upsert: true });
    log('migration.social_notifications.completed', { migrationId: MIGRATION_ID, recipients });
  };
}

async function runStartupMigration() {
  const mongoose = require('mongoose');
  const { logger } = require('../config/observability');
  return createRunner({
    collection: mongoose.connection.db.collection('deployment_migrations'),
    runBackfill: backfill,
    log: (event, data) => logger.info(event, data)
  })();
}

module.exports = { MIGRATION_ID, backfill, createRunner, runStartupMigration };
