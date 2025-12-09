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
    if (notification?.type === 'journal_prompt') return `${base}/profile?tab=journal`;
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
            console.error('[push] Firebase init error: SERVICE ACCOUNT in env is not valid JSON or base64 JSON');
            console.error('[push] Raw value starts with:', rawJson.substring(0, 50));
          }
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
      // Validate required fields
      if (!creds.project_id || !creds.private_key || !creds.client_email) {
        console.error('[push] Service account JSON is missing required fields');
        console.error('[push] Has project_id:', !!creds.project_id);
        console.error('[push] Has private_key:', !!creds.private_key);
        console.error('[push] Has client_email:', !!creds.client_email);
        return;
      }
      
      admin.initializeApp({ 
        credential: admin.credential.cert(creds),
        projectId: creds.project_id // Explicitly set project ID
      });
      console.log('[push] Firebase Admin initialized successfully (service account from env)');
      console.log('[push] Project ID:', creds.project_id);
      console.log('[push] Client email:', creds.client_email);
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
  // Run in background - don't block the caller
  setImmediate(async () => {
    try {
      ensureFirebaseInitialized();
      if (!admin.apps || admin.apps.length === 0) {
        console.error('[push] FCM send aborted: Firebase not initialized');
        return;
      }
      const tokens = await DeviceToken.find({ userId, isActive: true, provider: { $in: ['fcm', 'expo'] } })
        .select('token provider platform')
        .lean();

      console.log('[push] tokens found', { userId: String(userId), count: tokens.length });
      if (!tokens.length) return;

      await sendFcmInternal(tokens, notification);
    } catch (error) {
      console.error('[push] Background FCM error:', error);
    }
  });
  
  // Return immediately
  return { ok: true, queued: true };
}

async function sendFcmInternal(tokens, notification) {

  const dataUrl = buildDeepLink(notification);
  
  // Deduplicate tokens first
  const uniqueTokens = [];
  const seenTokens = new Set();
  for (const t of tokens) {
    if (!seenTokens.has(t.token)) {
      seenTokens.add(t.token);
      uniqueTokens.push(t);
    }
  }
  
  console.log('[push] Token deduplication:', { original: tokens.length, unique: uniqueTokens.length });
  
  // Separate web and mobile tokens to avoid duplicates
  const webTokens = uniqueTokens
    .filter(t => t.platform === 'web' && t.provider === 'fcm')
    .map(t => t.token);
  
  const mobileTokens = uniqueTokens
    .filter(t => t.platform !== 'web' && (t.provider === 'fcm' || (t.token && !t.token.startsWith('ExponentPushToken'))))
    .map(t => t.token);

  const invalidFcm = [];
  let successCount = 0;

  // Send to web browsers
  if (webTokens.length) {
    try {
      await sendToWebPush(webTokens, notification, dataUrl, invalidFcm);
      successCount += webTokens.length;
    } catch (e) {
      console.error('[push] web push error:', e?.message);
    }
  }

  // Send to mobile devices
  if (mobileTokens.length) {
    try {
      // Compose notification title/body per new spec: "ActorName : action" and body shows truncated goal title when relevant
      let title = notification.title || 'Notification';
      let body = notification.message || '';
      try {
        const actorName = notification?.data?.actorName || notification?.data?.likerName || notification?.data?.followerName || '';
        const type = String(notification.type || '');
        const actionMap = {
          activity_liked: 'liked your activity',
          comment_liked: 'liked your comment',
          goal_liked: 'liked your goal',
          activity_comment: 'commented on your activity',
          comment_reply: 'replied to your comment',
          mention: 'mentioned you',
          new_follower: 'started following you',
          follow_request: 'requested to follow you',
          follow_request_accepted: 'accepted your follow request'
        };
        if (actorName && actionMap[type]) {
          title = `${actorName} : ${actionMap[type]}`;
        } else if (type === 'habit_reminder' || type === 'journal_prompt' || type === 'motivation_quote' || type === 'inactivity_reminder') {
          // keep system titles as-is
          title = notification.title || title;
        }
        // If there's a goal title, prefer it as body (truncated). Otherwise keep original message.
        const truncate = (s, n = 48) => {
          try { const t = String(s || ''); return t.length > n ? (t.slice(0, n - 3) + '...') : t; } catch { return ''; }
        };
        let goalTitle = notification?.data?.goalTitle || '';
        if (!goalTitle && notification?.data?.goalId) {
          try {
            const Goal = require('../models/Goal');
            const g = await Goal.findById(notification.data.goalId).select('title').lean();
            goalTitle = g?.title || '';
          } catch {}
        }
        if (goalTitle && (type === 'goal_liked' || type === 'activity_liked' || type === 'activity_comment')) {
          body = truncate(goalTitle, 64);
        }
      } catch (_) {}

      const msg = {
        tokens: mobileTokens,
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
            invalidFcm.push(mobileTokens[idx]);
          } else {
            console.warn('[push] mobile fcm send error', code || r.error?.message);
          }
        }
      });
    } catch (e) {
      console.error('[push] mobile fcm multicast error', e?.message || e);
    }
  }

  if (invalidFcm.length) {
    await DeviceToken.updateMany({ token: { $in: invalidFcm } }, { $set: { isActive: false } });
    console.log('[push] deactivated invalid FCM tokens', { invalidCount: invalidFcm.length });
  }

  return { ok: true, count: tokens.length, successCount };
}

async function sendToWebPush(webTokens, notification, dataUrl, invalidFcm) {
  let title = notification.title || 'Notification';
  let body = notification.message || '';
  
  try {
    const actorName = notification?.data?.actorName || notification?.data?.likerName || notification?.data?.followerName || '';
    const type = String(notification.type || '');
    const actionMap = {
      activity_liked: 'liked your activity',
      comment_liked: 'liked your comment',
      goal_liked: 'liked your goal',
      activity_comment: 'commented on your activity',
      comment_reply: 'replied to your comment',
      mention: 'mentioned you',
      new_follower: 'started following you',
      follow_request: 'requested to follow you',
      follow_request_accepted: 'accepted your follow request'
    };
    
    if (actorName && actionMap[type]) {
      title = `${actorName} : ${actionMap[type]}`;
    }
    
    const truncate = (s, n = 48) => {
      try { const t = String(s || ''); return t.length > n ? (t.slice(0, n - 3) + '...') : t; } catch { return ''; }
    };
    
    let goalTitle = notification?.data?.goalTitle || '';
    if (!goalTitle && notification?.data?.goalId) {
      try {
        const Goal = require('../models/Goal');
        const g = await Goal.findById(notification.data.goalId).select('title').lean();
        goalTitle = g?.title || '';
      } catch {}
    }
    
    if (goalTitle && (type === 'goal_liked' || type === 'activity_liked' || type === 'activity_comment')) {
      body = truncate(goalTitle, 64);
    }
  } catch {}

  const msg = {
    tokens: webTokens,
    data: { 
      title, 
      body,
      url: dataUrl, 
      type: String(notification.type || ''), 
      id: String(notification._id || ''),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png'
    },
    webpush: {
      fcmOptions: {
        link: dataUrl
      },
      notification: {
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        requireInteraction: false,
      }
    }
  };

  const resp = await admin.messaging().sendEachForMulticast(msg);
  console.log('[push] web fcm result', { successCount: resp.successCount, failureCount: resp.failureCount });
  
  (resp.responses || []).forEach((r, idx) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      if (code && (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token'))) {
        invalidFcm.push(webTokens[idx]);
      } else {
        console.warn('[push] web fcm send error', code || r.error?.message);
      }
    }
  });
}

module.exports = { sendFcmToUser };


