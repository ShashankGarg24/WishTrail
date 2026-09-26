import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreStartupToken } from '../src/services/startupSession.js';
const token = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
test('valid session does not wait for network', async () => {
  const access = token(200);
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000, refresh: () => assert.fail('unexpected network') }), access);
});
test('signed-out user resolves without network', async () => {
  assert.equal(await restoreStartupToken({ token: null, refresh: () => assert.fail('unexpected network') }), null);
});
test('expired, missing and malformed access tokens restore native session', async () => {
  for (const access of [null, token(50), 'malformed']) {
    assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
      refresh: async credential => { assert.equal(credential, 'refresh'); return { data: { data: { token: 'restored' } } }; } }), 'restored');
  }
});
test('rejected refresh resolves to auth', async () => {
  assert.equal(await restoreStartupToken({ token: null, refreshToken: 'revoked', refresh: async () => { throw Error('Unauthorized'); } }), null);
});
test('offline refresh retains the local session; server rejection clears it', async () => {
  const access = token(50);
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
    refresh: async () => { throw Error('Network unavailable'); } }), access);
  assert.equal(await restoreStartupToken({ token: access, refreshToken: 'refresh', now: 100000,
    refresh: async () => { throw { response: { status: 401 } }; } }), null);
});
