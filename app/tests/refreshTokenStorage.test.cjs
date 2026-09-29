const test = require('node:test');
const assert = require('node:assert/strict');
const { persistRefreshToken } = require('../refreshTokenStorage');

test('refresh credential is durably written before persistence completes', async () => {
  let stored;
  await persistRefreshToken({ setItemAsync: async (key, value) => { stored = { key, value }; } }, 'refresh');
  assert.deepEqual(stored, { key: 'wt_refresh_token', value: 'refresh' });
});

test('transient secure-storage failures retry with bounded delays', async () => {
  let attempts = 0;
  const waits = [];
  await persistRefreshToken({ setItemAsync: async () => {
    attempts++;
    if (attempts < 3) throw new Error('temporarily unavailable');
  } }, 'refresh', { delays: [100, 400], wait: async delay => waits.push(delay) });
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [100, 400]);
});

test('missing secure storage fails instead of pretending persistence succeeded', async () => {
  await assert.rejects(persistRefreshToken(null, 'refresh'), /secure_refresh_storage_unavailable/);
});
