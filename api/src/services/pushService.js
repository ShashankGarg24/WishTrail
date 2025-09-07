const axios = require('axios');
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
    if (notification?.data?.activityId) return `${base}/explore?tab=activities`;
  } catch {}
  return `${base}/explore?tab=notifications`;
}

async function sendExpoPushToUser(userId, notification) {
  const tokens = await DeviceToken.find({ userId, isActive: true, provider: 'expo' })
    .select('token')
    .lean();

  console.log('[push] tokens found', { userId: String(userId), count: tokens.length });
  if (!tokens.length) return { ok: true, count: 0 };

  const dataUrl = buildDeepLink(notification);
  const messages = tokens.map(t => ({
    to: t.token,
    title: notification.title || 'Notification',
    body: notification.message || '',
    data: { url: dataUrl, type: notification.type, id: String(notification._id) },
    priority: 'high'
  }));

  const invalid = [];
  const tickets = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const resp = await axios.post('https://exp.host/--/api/v2/push/send', batch, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      });
      const results = Array.isArray(resp.data?.data) ? resp.data.data : [];
      results.forEach((r, idx) => {
        if (r?.status === 'ok' && r.id) tickets.push(r.id);
        else if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
          invalid.push(batch[idx].to);
        } else if (r?.status === 'error') {
          console.warn('[push] expo error', r?.details?.error || r?.message);
        }
      });
    } catch (err) {
      console.error('[push] expo send error', err.message);
    }
  }

  if (invalid.length) {
    await DeviceToken.updateMany({ token: { $in: invalid } }, { $set: { isActive: false } });
    console.log('[push] deactivated invalid tokens', { invalidCount: invalid.length });
  }

  return { ok: true, count: tokens.length, tickets };
}

module.exports = { sendExpoPushToUser };


