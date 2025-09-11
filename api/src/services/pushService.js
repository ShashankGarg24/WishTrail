const axios = require('axios');
const admin = require('firebase-admin');
const DeviceToken = require('../models/DeviceToken');

function getClientBaseUrl() {
  const envs = [process.env.CLIENT_URL, process.env.WEB_URL, process.env.FRONTEND_URL];
  for (const v of envs) {
    if (v && /^https?:\/\//i.test(v)) return v.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

function buildDeepLink(notification) {
  const base = getClientBaseUrl();
  try {
    if (notification?.data?.goalId) {
      const id = typeof notification.data.goalId === 'object'
        ? notification.data.goalId._id || notification.data.goalId
        : notification.data.goalId;
      if (id) return `${base}/goal/${id}`;
    }
    if (notification?.data?.habitId) return `${base}/dashboard`;
    if (notification?.data?.activityId) return `${base}/feed`;
  } catch {}
  return `${base}/notifications`;
}

function ensureFirebaseInitialized() {
  if (admin.apps && admin.apps.length > 0) return;
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
    console.log('[push] Firebase Admin initialized');
  } catch (e) {
    console.error('[push] Firebase init error', e?.message || e);
  }
}

async function sendFcmToUser(userId, notification) {
  ensureFirebaseInitialized();
  const tokens = await DeviceToken.find({ userId, isActive: true, provider: { $in: ['fcm', 'expo'] } })
    .select('token provider')
    .lean();

  console.log('[push] tokens found', { userId: String(userId), count: tokens.length });
  if (!tokens.length) return { ok: true, count: 0 };

  const dataUrl = buildDeepLink(notification);
  const fcmTokens = tokens
    .filter(t => t.provider === 'fcm' || (t.token && !t.token.startsWith('ExponentPushToken')))
    .map(t => t.token);

  const invalidFcm = [];
  let successCount = 0;

  if (fcmTokens.length) {
    try {
      const resp = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title: notification.title || 'Notification', body: notification.message || '' },
        data: { url: dataUrl, type: String(notification.type || ''), id: String(notification._id || '') }
      });
      successCount += resp.successCount || 0;
      (resp.responses || []).forEach((r, idx) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (code && (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token'))) {
            invalidFcm.push(fcmTokens[idx]);
          } else {
            console.warn('[push] fcm send error', code || r.error?.message);
          }
        }
      });
    } catch (e) {
      console.error('[push] fcm multicast error', e?.message || e);
    }
  }

  if (invalidFcm.length) {
    await DeviceToken.updateMany({ token: { $in: invalidFcm } }, { $set: { isActive: false } });
    console.log('[push] deactivated invalid FCM tokens', { invalidCount: invalidFcm.length });
  }

  return { ok: true, count: tokens.length, successCount };
}

module.exports = { sendFcmToUser };


