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

// Quiet hours removed per new spec
function isWithinQuietHours() { return false; }

function daysSince(date) {
  if (!date) return Infinity;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

async function hasPushableDevice(userId) {
  const token = await DeviceToken.findOne({ userId, isActive: true }).select('_id').lean();
  return !!token;
}

function messageForExactDay(gapDays) {
  if (gapDays === 30) return { step: 4, title: 'We’re here for you', message: 'Take your time. When you’re ready, your journey awaits 🌟' };
  if (gapDays === 14) return { step: 3, title: 'Small step, big momentum', message: 'A quick check-in can reignite your progress. You’ve got this ✨' };
  if (gapDays === 7)  return { step: 2, title: 'Your goals miss you', message: 'Come back and check in 💡' };
  if (gapDays === 3)  return { step: 1, title: 'We miss you', message: 'Haven’t seen you in a while—ready to continue your journey?' };
  return null;
}

// Stop conditions: any activity means lastActiveAt updated externally
function shouldStop() { return false; }

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
    const msg = messageForExactDay(gap);
    if (!msg) continue;
    // ensure we haven't sent this step since last activity
    const dup = await Notification.findOne({
      userId: u._id,
      type: 'inactivity_reminder',
      createdAt: { $gte: new Date(u.lastActiveAt || 0) },
      'data.metadata.step': msg.step
    }).select('_id').lean();
    if (dup) continue;
    // quiet hours removed
    if (isWithinQuietHours(u)) continue;
    await Notification.createNotification({
      userId: u._id,
      type: 'inactivity_reminder',
      title: msg.title,
      message: msg.message,
      priority: 'low',
      channels: { push: true, inApp: true },
      data: { metadata: { step: msg.step, gapDays: gap } }
    });
    sent += 1;
  }
  return { ok: true, sent };
}

module.exports = { sendDueInactivityReminders };


