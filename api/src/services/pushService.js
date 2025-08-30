const axios = require('axios');
const DeviceToken = require('../models/DeviceToken');

function getClientBaseUrl() {
  const envs = [process.env.CLIENT_URL, process.env.WEB_URL, process.env.FRONTEND_URL];
  for (const v of envs) { if (v && /^https?:\/\//i.test(v)) return v.replace(/\/$/, ''); }
  return 'http://localhost:5173';
}

function buildDeepLink(notification) {
  const base = getClientBaseUrl();
  try {
    if (notification?.data?.goalId) {
      const id = typeof notification.data.goalId === 'object' ? notification.data.goalId._id || notification.data.goalId : notification.data.goalId;
      if (id) return `${base}/goal/${id}`;
    }
  } catch {}
  return `${base}/explore?tab=notifications`;
}

async function sendExpoPushToUser(userId, notification) {
  const tokens = await DeviceToken.find({ userId, isActive: true, provider: 'expo' }).select('token').lean();
  if (!tokens || tokens.length === 0) return { ok: true, count: 0 };
  const dataUrl = buildDeepLink(notification);
  const messages = tokens.map(t => ({
    to: t.token,
    title: notification.title || 'Notification',
    body: notification.message || '',
    data: { url: dataUrl, type: notification.type, id: String(notification._id) },
    priority: 'high'
  }));
  try {
    const resp = await axios.post('https://exp.host/--/api/v2/push/send', messages, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
    const results = Array.isArray(resp.data?.data) ? resp.data.data : [];
    // best-effort cleanup
    const invalid = [];
    results.forEach((r, idx) => { if (r?.status === 'error' && /DeviceNotRegistered|InvalidCredentials|MessageRateExceeded/i.test(r?.details?.error || r?.message || '')) invalid.push(tokens[idx]?.token); });
    if (invalid.length) {
      await DeviceToken.updateMany({ token: { $in: invalid } }, { $set: { isActive: false } });
    }
    return { ok: true, count: tokens.length };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

module.exports = { sendExpoPushToUser };


