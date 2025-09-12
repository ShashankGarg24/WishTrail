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
    // Prefer JSON from env; support plain JSON, base64 JSON, or ADC path
    const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '';
    let creds = null;
    if (rawJson) {
      try {
        // If env starts with '{', assume plain JSON
        const text = rawJson.trim().startsWith('{') ? rawJson : (() => { throw new Error('not-json'); })();
        creds = JSON.parse(text);
      } catch (_) {
        // Try to decode as base64 JSON
        try {
          const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
          creds = JSON.parse(decoded);
        } catch (e2) {
          console.error('[push] Firebase init error: SERVICE ACCOUNT in env is not valid JSON or base64 JSON');
        }
      }
    } else if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        creds = JSON.parse(decoded);
      } catch (e3) {
        console.error('[push] Firebase init error: FIREBASE_SERVICE_ACCOUNT_B64 not valid');
      }
    }

    if (creds) {
      admin.initializeApp({ credential: admin.credential.cert(creds) });
      console.log('[push] Firebase Admin initialized (service account from env)');
      return;
    }

    // Fall back to ADC / GOOGLE_APPLICATION_CREDENTIALS file path
    admin.initializeApp();
    console.log('[push] Firebase Admin initialized (ADC)');
  } catch (e) {
    console.error('[push] Firebase init error', e?.message || e);
  }
}

async function sendFcmToUser(userId, notification) {
  ensureFirebaseInitialized();
  if (!admin.apps || admin.apps.length === 0) {
    console.error('[push] FCM send aborted: Firebase not initialized');
    return { ok: false, count: 0, error: 'firebase-not-initialized' };
  }
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
      // Compose notification title/body per spec: receiver's name and actor/purpose context
      let title = notification.title || 'Notification';
      let body = notification.message || '';
      try {
        // Fetch receiver's display name if possible
        const User = require('../models/User');
        const receiver = await User.findById(notification.userId).select('name').lean();
        const receiverName = receiver?.name || '';
        const actorName = notification?.data?.actorName || notification?.data?.likerName || notification?.data?.followerName || '';
        // Derive a concise purpose from type
        const type = String(notification.type || '');
        const purposeMap = {
          activity_liked: 'Activity Liked',
          comment_liked: 'Comment Liked',
          goal_liked: 'Goal Liked',
          activity_comment: 'Commented',
          comment_reply: 'Reply',
          mention: 'Mentioned You',
          new_follower: 'New Follower',
          follow_request: 'Follow Request',
          follow_request_accepted: 'Request Accepted',
          habit_reminder: 'Habit Reminder',
          journal_prompt: 'Journal Prompt',
          motivation_quote: 'Motivation',
          inactivity_reminder: 'We Miss You'
        };
        const purpose = purposeMap[type] || (notification.title || 'Notification');
        // Build title as: "ReceiverName FriendName: Purpose" (omit blanks gracefully)
        const left = receiverName ? receiverName : '';
        const mid = actorName ? ` ${actorName}` : '';
        const end = `: ${purpose}`;
        const composed = `${left}${mid}${end}`.trim();
        title = composed || title;
        // Body stays as original message to preserve details
      } catch (_) {}

      const msg = {
        tokens: fcmTokens,
        notification: { title, body },
        data: { url: dataUrl, type: String(notification.type || ''), id: String(notification._id || '') },
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        }
      };
      const resp = await admin.messaging().sendEachForMulticast(msg);
      successCount += resp.successCount || 0;
      console.log('[push] fcm result', { successCount: resp.successCount, failureCount: resp.failureCount });
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


