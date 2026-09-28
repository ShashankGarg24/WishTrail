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
const redirects = [];
const nativeMessages = [];
globalThis.window = {
  location: { pathname: '/notifications', assign: value => redirects.push(value) },
  ReactNativeWebView: { postMessage: value => nativeMessages.push(JSON.parse(value)) }
};
const { default: api, notificationsAPI, socialAPI, settingsAPI, setAuthToken } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

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
  assert.equal(storage.get('token'), 'expired-token');
  assert.deepEqual(redirects, []);
});

test('a later successful refresh preserves mobile login and updates the native token', async () => {
  storage.set('token', 'expired-token');
  api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      return { config, status: 200, data: { data: { token: 'fresh-token', refreshToken: 'fresh-refresh' } } };
    }
    if (config.headers.Authorization !== 'Bearer fresh-token') {
      throw Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } });
    }
    return { config, status: 200, data: { data: { notifications: [] } } };
  };
  await notificationsAPI.getNotifications();
  assert.equal(storage.get('token'), 'fresh-token');
  assert.ok(nativeMessages.some(message => message.type === 'WT_AUTH' && message.token === 'fresh-token'));
  assert.ok(nativeMessages.some(message => message.type === 'WT_REFRESH' && message.refreshToken === 'fresh-refresh'));
  assert.deepEqual(redirects, []);
});

test('an explicit token clear is bridged to the native shell', () => {
  setAuthToken(null);
  assert.ok(nativeMessages.some(message => message.type === 'WT_AUTH' && message.token === ''));
});

test('a refresh service failure preserves the session for a later retry', async () => {
  storage.set('token', 'expired-token');
  const redirectCount = redirects.length;
  api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      throw Object.assign(new Error('Service unavailable'), { config, response: { status: 503 } });
    }
    throw Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } });
  };
  await assert.rejects(notificationsAPI.getNotifications());
  assert.equal(storage.get('token'), 'expired-token');
  assert.equal(redirects.length, redirectCount);
});

test('a rejected refresh clears the web and native session', async () => {
  storage.set('token', 'expired-token');
  api.defaults.adapter = async config => {
    throw Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } });
  };
  await assert.rejects(notificationsAPI.getNotifications());
  assert.equal(storage.get('token'), undefined);
  assert.equal(redirects.at(-1), '/auth');
  assert.deepEqual(nativeMessages.at(-1), { type: 'WT_AUTH', token: '' });
});
