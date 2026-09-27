const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function gestureFixture() {
  const handlers = {}, messages = [];
  const body = { hasAttribute: () => false };
  const target = { closest: () => null, parentElement: body, scrollHeight: 10, clientHeight: 10 };
  const context = {
    window: { scrollY: 0, ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) }, addEventListener: (name, fn) => { handlers[name] = fn; } },
    document: { body }, location: { pathname: '/feed' }, history: { pushState() {}, replaceState() {} },
    getComputedStyle: () => ({ overflowY: 'auto' }), requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {}, setTimeout: () => 1, clearTimeout() {}
  };
  const script = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../webViewGestures.js'), 'utf8').replace('export const', 'const') + '\npullToRefreshScript;');
  vm.runInNewContext(script, context);
  const touch = (name, x, y) => handlers[name]({ target, touches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault() {} });
  return { handlers, messages, body, target, touch };
}

test('refresh requires a downward pull, locks while loading, and resets on completion', () => {
  const f = gestureFixture();
  f.touch('touchstart', 0, 0); f.touch('touchmove', 0, 130); f.handlers.touchend();
  f.touch('touchstart', 0, 0); f.touch('touchmove', 0, 130); f.handlers.touchend();
  assert.equal(f.messages.filter(m => m.type === 'WT_PTR_TRIGGER').length, 1);
  f.handlers.wt_refresh_complete();
  f.touch('touchstart', 0, 0); f.touch('touchmove', 0, 130); f.handlers.touchend();
  assert.equal(f.messages.filter(m => m.type === 'WT_PTR_TRIGGER').length, 2);
});

test('horizontal swipes, nested scrolling, modals, and cancelled pulls do not refresh', () => {
  for (const mode of ['horizontal', 'nested', 'modal', 'cancel']) {
    const f = gestureFixture();
    if (mode === 'nested') f.target.scrollHeight = 100;
    if (mode === 'modal') f.body.hasAttribute = () => true;
    f.touch('touchstart', 0, 0);
    f.touch('touchmove', mode === 'horizontal' ? 200 : 0, 130);
    if (mode === 'cancel') f.handlers.touchcancel();
    f.handlers.touchend();
    assert.equal(f.messages.filter(m => m.type === 'WT_PTR_TRIGGER').length, 0, mode);
  }
});

function notificationFixture(enabled, granted, failSave = false) {
  const handlers = {}, messages = [], saves = [], events = [];
  const settings = { email: { enabled: false }, inApp: { enabled, socialUpdates: false, habitReminders: true } };
  const context = {
    settingsAPI: {
      getNotificationSettings: async () => ({ data: { data: { notifications: settings } } }),
      updateNotificationSettings: async value => { if (failSave) throw new Error('offline'); saves.push(value); }
    },
    window: {
      addEventListener: (name, fn) => { handlers[name] = fn; }, removeEventListener: name => { delete handlers[name]; },
      dispatchEvent: event => events.push(event),
      ReactNativeWebView: { postMessage: value => { const request = JSON.parse(value); messages.push(request); queueMicrotask(() => handlers.message({ data: JSON.stringify({ type: 'WT_NOTIFICATION_PERMISSION_STATE', requestId: request.requestId, status: granted ? 'granted' : 'denied', granted }) })); } }
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, setTimeout, clearTimeout
  };
  let source = fs.readFileSync(path.join(__dirname, '../../frontend/src/services/nativeNotifications.js'), 'utf8');
  source = source.replace("import { settingsAPI } from './api';", '').replaceAll('export ', '');
  vm.runInNewContext(source + '\nglobalThis.sync = reconcileNativeNotifications;', context);
  return { context, messages, saves, events };
}

test('denial persists the master switch off while preserving email and topic preferences', async () => {
  const f = notificationFixture(true, false);
  const result = await f.context.sync(true);
  assert.equal(f.messages[0].request, true);
  assert.equal(result.settings.inApp.enabled, false);
  assert.equal(f.saves[0].notifications.email.enabled, false);
  assert.equal(f.saves[0].notifications.inApp.socialUpdates, false);
  assert.equal(f.saves[0].notifications.inApp.habitReminders, true);
});

test('disabled preference does not prompt or auto-enable when OS permission is granted', async () => {
  const f = notificationFixture(false, true);
  const result = await f.context.sync(true);
  assert.equal(f.messages[0].request, false);
  assert.equal(result.settings.inApp.enabled, false);
  assert.equal(f.saves.length, 0);
});

test('resume checks do not prompt and failed database sync remains retryable', async () => {
  const f = notificationFixture(true, false, true);
  await assert.rejects(f.context.sync(false), /offline/);
  assert.equal(f.messages[0].request, false);
  assert.equal(f.events.length, 0);
  await assert.rejects(f.context.sync(false), /offline/);
  assert.equal(f.messages.length, 2);
});


test('native logout bridge waits for token unregister acknowledgement', async () => {
  const handlers = {}, messages = [];
  const context = {
    window: {
      addEventListener: (name, fn) => { handlers[name] = fn; }, removeEventListener: name => { delete handlers[name]; },
      ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) }
    }, setTimeout, clearTimeout
  };
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/services/nativeNotifications.js'), 'utf8').replace("import { settingsAPI } from './api';", '').replaceAll('export ', '');
  vm.runInNewContext(source + '\nglobalThis.unregister = unregisterNativeDevice;', context);
  let complete = false;
  const pending = context.unregister().then(() => { complete = true; });
  await Promise.resolve();
  assert.equal(complete, false); assert.equal(messages[0].type, 'WT_UNREGISTER_DEVICE');
  handlers.message({ data: JSON.stringify({ type: 'WT_DEVICE_UNREGISTERED' }) });
  await pending; assert.equal(complete, true); assert.equal(handlers.message, undefined);
});
