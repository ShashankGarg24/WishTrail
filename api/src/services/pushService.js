const { logger } = require('./../config/observability');
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
    if (notification?.data?.activityId) {
      // Prefer goal modal if goalId present
      const g = notification?.data?.goalId;
      if (g) {
        const gid = typeof g === 'object' ? (g._id || g) : g;
        if (gid) return `${base}/goal/${gid}`;
      }
      return `${base}/feed`;
    }
    if (notification?.data?.habitId) return `${base}/dashboard`;
    if (notification?.type === 'follow_request' || notification?.type === 'follow_request_accepted' || notification?.type === 'new_follower') {
      const actor = notification?.data?.actorId || notification?.data?.followerId;
      // Prefer username if populated, else fall back to raw id
      if (actor && typeof actor === 'object') {
        if (actor.username) return `${base}/profile/@${encodeURIComponent(actor.username)}?tab=overview`;
        if (actor._id) return `${base}/profile/${actor._id}`;
      }
      if (actor) return `${base}/profile/${actor}`;
      return `${base}/notifications`;
    }
    if (notification?.type === 'daily_logs_prompt') return `${base}/dashboard`;
    if (notification?.type === 'motivation_quote') return `${base}/dashboard`;
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
        // First, try parsing as-is (might be already proper JSON)
        creds = JSON.parse(rawJson);
      } catch (e1) {
        try {
          // Try unescaping common escape sequences
          const unescaped = rawJson
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          creds = JSON.parse(unescaped);
        } catch (e2) {
          try {
            // Try to decode as base64 JSON
            const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
            creds = JSON.parse(decoded);
          } catch (e3) {
            logger.error('[push] Firebase init error: SERVICE ACCOUNT in env is not valid JSON or base64 JSON');

          }
        }
      }
    } else if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        creds = JSON.parse(decoded);
      } catch (e3) {
        logger.error('[push] Firebase init error: FIREBASE_SERVICE_ACCOUNT_B64 not valid');
      }
    }

    if (creds) {
      // Validate required fields
      if (!creds.project_id || !creds.private_key || !creds.client_email) {
        logger.error('[push] Service account JSON is missing required fields');
        logger.error('[push] Has project_id:', !!creds.project_id);
        logger.error('[push] Has private_key:', !!creds.private_key);
        logger.error('[push] Has client_email:', !!creds.client_email);
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId: creds.project_id // Explicitly set project ID
      });
      return;
    }

    // Fall back to ADC / GOOGLE_APPLICATION_CREDENTIALS file path
    admin.initializeApp();
  } catch (e) {
    logger.error('[push] Firebase init error', e?.message || e);
  }
}

// No current type is designated critical. Non-critical pushes use normal, silent delivery.
async function sendFcmToUser(userId, notification, options = {}) {
  const { normalizeUserId, localContext, quietHours, preferenceReason, SOCIAL_TYPES } = require('./notificationPolicy');
  const failure = (code, retryable = false) => ({ ok: false, queued: false, code, retryable });
  try {
    userId = normalizeUserId(userId);
    const prefs = await require('../models/extended/UserPreferences').findOne({ userId }).select('notifications').lean();
    const reason = preferenceReason(prefs, notification.type);
    if (reason) return failure(reason);
    const user = await require('./pgUserService').findById(userId);
    if (!user) return failure('user_not_found');
    const context = localContext(user.timezone);
    if (quietHours(context)) {
      logger.info('[notification-push]', { userId, notificationType: notification.type, userTimezone: context.timezone, localDate: context.localDate, skipReason: 'quiet_hours' });
      return failure('quiet_hours');
    }
    if (['motivation_quote', 'daily_logs_prompt'].includes(notification.type) && require('./notificationPolicy').scheduledReason(notification.type, context)) return failure('outside_time_window');
    let tokens = await DeviceToken.find({ userId, isActive: true, provider: { $in: ['fcm', 'expo'] }, token: { $type: 'string', $ne: '', $not: /^(ExponentPushToken|ExpoPushToken)\[/ } }).select('token platform').lean();
    if (SOCIAL_TYPES.has(notification.type) || ['motivation_quote', 'daily_logs_prompt'].includes(notification.type)) tokens = tokens.filter(t => t.platform !== 'web');
    tokens = [...new Map(tokens.map(t => [t.token, t])).values()];
    if (!tokens.length) return failure('no_active_device');
    // Optional cap: disabled unless explicitly configured. Actionable requests bypass it.
    const cap = Number(process.env.NOTIFICATION_DAILY_PUSH_CAP || 0);
    if (Number.isInteger(cap) && cap > 0 && !['follow_request', 'community_join_request'].includes(notification.type)) {
      const Budget = require('../models/NotificationPushBudget');
      await Budget.init();
      try {
        await Budget.findOneAndUpdate({ userId, localDate: context.localDate, count: { $lt: cap } }, { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, new: true });
      } catch (error) { if (error.code === 11000) { logger.info('[notification-push]', { userId, notificationType: notification.type, skipReason: 'rate_limited' }); return failure('rate_limited'); } throw error; }
    }
    ensureFirebaseInitialized();
    if (!admin.apps?.length) return failure('provider_unavailable', true);
    const send = () => sendFcmInternal(tokens, notification);
    if (options.waitForDelivery) return await send();
    setImmediate(async () => {
      try {
        const result = await send();
        if (result.ok) await require('../models/Notification').updateOne({ _id: notification._id }, { $set: { isDelivered: true, deliveredAt: new Date() } });
      } catch { logger.warn('[notification-push]', { userId, notificationType: notification.type, code: 'send_failed' }); }
    });
    return { ok: true, queued: true, tokenCount: tokens.length };
  } catch { return failure('provider_or_database_unavailable', true); }
}

async function sendFcmInternal(tokens, notification) {
  let successCount = 0;
  let retryable = false;
  const invalid = [];
  const transient = new Set(['messaging/internal-error', 'messaging/server-unavailable', 'messaging/quota-exceeded', 'messaging/unknown-error']);
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const chunk = tokens.slice(offset, offset + 500);
    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: chunk.map(t => t.token),
        notification: { title: notification.title || 'WishTrail', body: notification.message || '' },
        data: { url: buildDeepLink(notification), type: String(notification.type), id: String(notification._id) },
        android: { priority: 'normal', notification: { tag: String(notification._id) } },
        apns: { headers: { 'apns-priority': '5' }, payload: { aps: {} } },
        webpush: { headers: { Urgency: 'normal' }, notification: { tag: String(notification._id) } }
      });
      successCount += result.successCount;
      result.responses.forEach((response, index) => {
        const code = response.error?.code;
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) invalid.push(chunk[index].token);
        else if (code && transient.has(code)) retryable = true;
      });
    } catch (error) { retryable = retryable || !error.code || transient.has(error.code) || error.code.startsWith('app/network'); }
  }
  // Cleanup failures must not turn a provider-accepted submission into a retry.
  if (invalid.length) {
    try { await DeviceToken.updateMany({ token: { $in: invalid } }, { $set: { isActive: false } }); }
    catch { logger.warn('[notification-push]', { code: 'invalid_token_cleanup_failed', count: invalid.length }); }
  }
  // Partial acceptance is successful: do not resend to devices that already accepted it.
  return { ok: successCount > 0, successCount, retryable: successCount === 0 && retryable, code: successCount ? null : (retryable ? 'provider_transient' : 'provider_rejected') };
}
module.exports = { sendFcmToUser, sendFcmInternal };
