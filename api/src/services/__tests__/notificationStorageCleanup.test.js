const { createRunner, MIGRATION_ID, removableIndex } = require('../../migrations/notificationStorageCleanup');

test('storage cleanup runs once and records reclaimed schema work', async () => {
  let completed;
  const collection = {
    findOne: jest.fn(async () => completed),
    updateOne: jest.fn(async (_, update) => { completed = update.$setOnInsert; })
  };
  const runCleanup = jest.fn(async () => ({ documents: 9, removedIndexes: ['sourceId_1_active_1'] }));
  const log = jest.fn();
  const run = createRunner({ collection, runCleanup, log });
  await run();
  await run();
  expect(runCleanup).toHaveBeenCalledTimes(1);
  expect(collection.updateOne).toHaveBeenCalledWith({ _id: MIGRATION_ID }, {
    $setOnInsert: expect.objectContaining({ completedAt: expect.any(Date), documents: 9 })
  }, { upsert: true });
});

test('only lifecycle storage indexes are selected for removal', () => {
  expect(removableIndex({ name: 'notification_like_group_unique', key: { aggregationKey: 1 } })).toBe(true);
  expect(removableIndex({ name: 'sourceId_1_active_1', key: { sourceId: 1, active: 1 } })).toBe(true);
  expect(removableIndex({ name: 'notification_lifecycle_unique', key: { lifecycleKey: 1 } })).toBe(false);
  expect(removableIndex({ name: '_id_', key: { _id: 1 } })).toBe(false);
});
