import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Load the real client with only Vite configuration and browser globals replaced.
const source = (await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'))
  .replace("from 'axios'", `from '${pathToFileURL(createRequire(import.meta.url).resolve('axios')).href}'`)
  .replace("import { API_CONFIG } from '../config/api';", 'const API_CONFIG = { BASE_URL: "http://localhost/api/v1", TIMEOUT: 20 };')
  .replace("import { addTimezoneAndLocale } from '../utils/timezoneUtils';", 'const addTimezoneAndLocale = value => value;');
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { location: { pathname: '/notifications', assign() {} } };
const { default: api, notificationsAPI, socialAPI, settingsAPI } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('notification and follow-request reads have a finite timeout', async () => {
  api.defaults.adapter = async config => {
    assert.equal(config.timeout, 20);
    return { config, status: 200, data: { data: {} } };
  };
  await notificationsAPI.getNotifications({ page: 1 });
  await socialAPI.getFollowRequests({ page: 1 });
  await settingsAPI.getNotificationSettings();
  await settingsAPI.updateNotificationSettings({ notifications: {} });
});

test('a stalled refresh rejects both notification requests instead of leaving one queued', async () => {
  storage.set('token', 'expired-token');
  let refreshes = 0;
  api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      refreshes++;
      assert.equal(config.timeout, 20);
      await new Promise(resolve => setTimeout(resolve, config.timeout));
      throw Object.assign(new Error('timeout'), { config, code: 'ECONNABORTED' });
    }
    throw Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } });
  };
  const results = await Promise.allSettled([
    notificationsAPI.getNotifications(), socialAPI.getFollowRequests()
  ]);
  assert.equal(refreshes, 1);
  assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected']);
  assert.ok(results.every(result => result.reason.code === 'ECONNABORTED'));
});
