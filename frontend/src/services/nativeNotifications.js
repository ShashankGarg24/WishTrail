import { settingsAPI } from './api';

let pendingPermission;
let sequence = 0;
let pendingRequestsPermission = false;
let reconciliation;
export function getNativeNotificationPermission(request = false, automatic = false) {
  if (pendingPermission) {
    if (request && !pendingRequestsPermission) return pendingPermission.then(() => getNativeNotificationPermission(true, automatic));
    return pendingPermission;
  }
  pendingRequestsPermission = request;
  pendingPermission = new Promise((resolve, reject) => {
    const requestId = `notification-${++sequence}`;
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
    const onMessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'WT_NOTIFICATION_PERMISSION_STATE' || payload.requestId !== requestId) return;
        cleanup();
        if (payload.status === 'unknown') reject(new Error('Unable to check notification permission. Please try again.'));
        else resolve(payload.granted);
      } catch { /* Other bridge messages are unrelated. */ }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Notification permission check timed out. Please try again.')); }, 60000);
    window.addEventListener('message', onMessage);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_REQUEST_NOTIFICATION_PERMISSION_STATE', requestId, request, automatic }));
  }).finally(() => { pendingPermission = null; });
  return pendingPermission;
}

async function reconcile(request) {
  const response = await settingsAPI.getNotificationSettings();
  let settings = response.data.data.notifications;
  const granted = await getNativeNotificationPermission(request && settings.inApp.enabled !== false, true);
  if (!granted && settings.inApp.enabled !== false) {
    settings = { ...settings, inApp: { ...settings.inApp, enabled: false } };
    await settingsAPI.updateNotificationSettings({ notifications: settings });
  }
  window.dispatchEvent(new CustomEvent('wt_notification_settings', { detail: { settings, granted } }));
  return { settings, granted };
}

export function reconcileNativeNotifications(request = false) {
  if (!reconciliation) reconciliation = reconcile(request).finally(() => { reconciliation = null; });
  return reconciliation;
}

export function unregisterNativeDevice() {
  if (!window.ReactNativeWebView) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); resolve(); };
    const onMessage = event => {
      try { if (JSON.parse(event.data).type === 'WT_DEVICE_UNREGISTERED') finish(); } catch { /* unrelated message */ }
    };
    const timer = setTimeout(finish, 10000);
    window.addEventListener('message', onMessage);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_UNREGISTER_DEVICE' }));
  });
}
