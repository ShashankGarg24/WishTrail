import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreStartupToken } from '../src/services/startupSession.js';
const token = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
test('native cold start validates an unexpired access token before mounting screens', async () => {
  const access = token(200);
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
    refresh: async credential => {
      assert.equal(credential, 'refresh');
      return { data: { data: { token: 'validated' } } };
    } }), 'validated');
});
test('signed-out user resolves without network', async () => {
  assert.equal(await restoreStartupToken({ token: null, refresh: () => assert.fail('unexpected network') }), null);
});
test('missing refresh credential keeps only a still-valid access token', async () => {
  assert.equal(await restoreStartupToken({ token: token(200), now: 100000,
    refresh: () => assert.fail('unexpected network') }), token(200));
  assert.equal(await restoreStartupToken({ token: token(50), now: 100000,
    refresh: () => assert.fail('unexpected network') }), null);
  assert.equal(await restoreStartupToken({ token: 'malformed', now: 100000,
    refresh: () => assert.fail('unexpected network') }), null);
});
test('expired, missing and malformed access tokens restore native session', async () => {
  for (const access of [null, token(50), 'malformed']) {
    assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
      refresh: async credential => { assert.equal(credential, 'refresh'); return { data: { data: { token: 'restored' } } }; } }), 'restored');
  }
});
test('rejected refresh resolves to auth', async () => {
  assert.equal(await restoreStartupToken({ token: null, refreshToken: 'revoked', refresh: async () => { throw { response: { status: 401 } }; } }), null);
});
test('offline refresh retains the local session; server rejection clears it', async () => {
  const access = token(50);
  let attempts = 0;
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
    retryDelays: [1, 2], wait: async () => {},
    refresh: async () => { attempts++; throw Error('Network unavailable'); } }), access);
  assert.equal(attempts, 3);
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
    retryDelays: [1, 2], wait: async () => assert.fail('definitive failure must not retry'),
    refresh: async () => { throw { response: { status: 401 } }; } }), null);
});

test('a transient Android startup failure retries before screens mount', async () => {
  const waits = [];
  let attempts = 0;
  const restored = await restoreStartupToken({
    token: token(50), refreshToken: 'refresh', now: 100000,
    retryDelays: [300, 900], wait: async delay => waits.push(delay),
    refresh: async () => {
      attempts++;
      if (attempts < 3) throw Error('Network unavailable');
      return { data: { data: { token: 'fresh' } } };
    }
  });
  assert.equal(restored, 'fresh');
  assert.deepEqual(waits, [300, 900]);
});
