const User = require('../models/User');
const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');

// Helper: minutes now in user's timezone
function localNowMinutes(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: timezone || 'UTC' });
    const parts = fmt.formatToParts(new Date());
    const hh = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const mm = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return hh * 60 + mm;
  } catch (_) {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

function isWithinQuietHours(user) {
  const ns = user?.notificationSettings || {};
  const quiet = ns.quietHours || { start: '22:00', end: '07:00' };
  const tz = user?.timezone || 'UTC';
  const nowM = localNowMinutes(tz);
  const [sh, sm] = String(quiet.start || '22:00').split(':').map(n => parseInt(n, 10));
  const [eh, em] = String(quiet.end || '07:00').split(':').map(n => parseInt(n, 10));
  const startM = (isNaN(sh) ? 22 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  const endM = (isNaN(eh) ? 7 : eh) * 60 + (isNaN(em) ? 0 : em);
  if (startM <= endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

function daysSince(date) {
  if (!date) return Infinity;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

async function hasPushableDevice(userId) {
  const token = await DeviceToken.findOne({ userId, isActive: true }).select('_id').lean();
  return !!token;
}

// Basic 24h rate limit via last inactivity reminder of any step
async function canSendInactivity(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await Notification.findOne({ userId, type: 'inactivity_reminder', createdAt: { $gte: since } }).select('_id').lean();
  return !recent;
}

function messageForDay(gapDays) {
  if (gapDays >= 30) return { step: 4, title: 'We’re here for you', message: 'Take your time. When you’re ready, your journey awaits 🌟' };
  if (gapDays >= 14) return { step: 3, title: 'Small step, big momentum', message: 'A quick check-in can reignite your progress. You’ve got this ✨' };
  if (gapDays >= 7)  return { step: 2, title: 'Your goals miss you', message: 'Come back and check in 💡' };
  if (gapDays >= 3)  return { step: 1, title: 'We miss you', message: 'Haven’t seen you in a while—ready to continue your journey?' };
  return null;
}

// Stop conditions: any activity means lastActiveAt updated externally
function shouldStop(user) {
  const ns = user?.notificationSettings || {};
  if (ns.enabled === false) return true;
  if (ns.inactivity && ns.inactivity.enabled === false) return true;
  return false;
}

async function sendDueInactivityReminders({ batchLimit = 1000 } = {}) {
  // Consider active users only
  const users = await User.find({ isActive: true }).select('_id lastActiveAt notificationSettings timezone').lean();
  let sent = 0;
  for (const u of users) {
    if (sent >= batchLimit) break;
    if (shouldStop(u)) continue;
    // device presence check; also covers NotRegistered cleanup via push layer
    const hasDevice = await hasPushableDevice(u._id);
    if (!hasDevice) continue;
    const gap = daysSince(u.lastActiveAt);
    const msg = messageForDay(gap);
    if (!msg) continue;
    // 24h cooldown
    if (!(await canSendInactivity(u._id))) continue;
    // quiet hours
    if (isWithinQuietHours(u)) continue;
    await Notification.createNotification({
      userId: u._id,
      type: 'inactivity_reminder',
      title: msg.title,
      message: msg.message,
      priority: 'low',
      channels: { push: true, inApp: true }
    });
    sent += 1;
  }
  return { ok: true, sent };
}

module.exports = { sendDueInactivityReminders };


