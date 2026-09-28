const { createRunner, MIGRATION_ID } = require('../../migrations/socialNotificationDeployment');

function fixture(completed = null) {
  const collection = { findOne: jest.fn(async () => completed), updateOne: jest.fn(async (_, update) => { completed = update.$setOnInsert; }) };
  const runBackfill = jest.fn(async () => 12);
  const log = jest.fn();
  return { collection, runBackfill, log, run: createRunner({ collection, runBackfill, log }) };
}

test('first startup completes backfill before marking success; restart skips it', async () => {
  const f = fixture();
  await f.run();
  expect(f.collection.updateOne).toHaveBeenCalledWith({ _id: MIGRATION_ID }, {
    $setOnInsert: { completedAt: expect.any(Date), recipients: 12 }
  }, { upsert: true });
  await f.run();
  expect(f.runBackfill).toHaveBeenCalledTimes(1);
  expect(f.log).toHaveBeenLastCalledWith('migration.social_notifications.skipped', { migrationId: MIGRATION_ID });
});

test('failed backfill blocks startup without marking completion and can retry', async () => {
  const f = fixture();
  f.runBackfill.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(f.run()).rejects.toThrow('database unavailable');
  expect(f.collection.updateOne).not.toHaveBeenCalled();
  await f.run();
  expect(f.runBackfill).toHaveBeenCalledTimes(2);
  expect(f.collection.updateOne).toHaveBeenCalledTimes(1);
});

test('startup waits until backfill is finished', async () => {
  const f = fixture();
  let release;
  f.runBackfill.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const running = f.run();
  await Promise.resolve();
  expect(f.collection.updateOne).not.toHaveBeenCalled();
  release(3);
  await running;
  expect(f.collection.updateOne).toHaveBeenCalledTimes(1);
});

test('an already completed migration does not run or rewrite the marker', async () => {
  const f = fixture({ completedAt: new Date() });
  await f.run();
  expect(f.runBackfill).not.toHaveBeenCalled();
  expect(f.collection.updateOne).not.toHaveBeenCalled();
});
