const MIGRATION_ID = 'social-notification-storage-v2';

const removableIndex = index => {
  const key = JSON.stringify(index.key);
  return index.name === 'notification_like_group_unique'
    || key === JSON.stringify({ userId: 1, active: 1, createdAt: -1 })
    || key === JSON.stringify({ sourceId: 1, active: 1 });
};

async function cleanup() {
  const Notification = require('../models/Notification');
  const collection = Notification.collection;

  // Preserve exact comment/reply source identity before removing its duplicate field.
  await collection.updateMany({
    sourceId: { $exists: true, $ne: null },
    'data.commentId': { $exists: false }
  }, [{ $set: { 'data.commentId': '$sourceId' } }]);

  // The retired signature held follow source state. Preserve it compactly in the
  // actor array so existing read/dismissed notifications are not treated as new.
  await collection.updateMany({
    type: { $in: ['new_follower', 'follow_request'] },
    lifecycleKey: { $exists: true },
    $or: [{ active: true }, { dismissed: true }]
  }, [{ $set: { aggregateActors: [{ $ifNull: ['$data.followerId', '$data.actorId'] }] } }]);

  const compacted = await collection.updateMany({}, { $unset: {
    aggregationKey: '', invalidatedAt: '', sourceId: '',
    lifecycleRevision: '', sourceSignature: ''
  } });
  await collection.updateMany({ dismissed: false }, { $unset: { dismissed: '' } });

  const indexes = await collection.indexes();
  const removedIndexes = [];
  for (const index of indexes.filter(removableIndex)) {
    try {
      await collection.dropIndex(index.name);
      removedIndexes.push(index.name);
    } catch (error) {
      // Another starting instance may have completed the same idempotent drop.
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') throw error;
    }
  }
  await Notification.createIndexes();
  return { documents: compacted.modifiedCount || 0, removedIndexes };
}

function createRunner({ collection, runCleanup, log }) {
  return async function run() {
    const completed = await collection.findOne({ _id: MIGRATION_ID });
    if (completed?.completedAt) {
      log('migration.notification_storage.skipped', { migrationId: MIGRATION_ID });
      return completed;
    }
    log('migration.notification_storage.started', { migrationId: MIGRATION_ID });
    const result = await runCleanup();
    const marker = { completedAt: new Date(), ...result };
    await collection.updateOne({ _id: MIGRATION_ID }, { $setOnInsert: marker }, { upsert: true });
    log('migration.notification_storage.completed', { migrationId: MIGRATION_ID, ...result });
    return marker;
  };
}

async function runStartupMigration() {
  const mongoose = require('mongoose');
  const { logger } = require('../config/observability');
  return createRunner({
    collection: mongoose.connection.db.collection('deployment_migrations'),
    runCleanup: cleanup,
    log: (event, data) => logger.info(event, data)
  })();
}

module.exports = { MIGRATION_ID, removableIndex, cleanup, createRunner, runStartupMigration };
