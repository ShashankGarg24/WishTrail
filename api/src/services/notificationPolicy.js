const { getDateKeyInTimezone, getStartOfDayInTimezone, shiftDateKey, isValidTimezone } = require('../utility/timezone');
const SOCIAL_TYPES = new Set(['new_follower', 'follow_request', 'follow_request_accepted', 'activity_comment', 'comment_reply', 'mention', 'activity_liked', 'comment_liked', 'goal_liked']);
const LIKE_TYPES = new Set(['goal_liked', 'activity_liked', 'comment_liked']);
function normalizeUserId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('invalid_user_id');
  return id;
}
function localContext(timezone, now = new Date()) {
  const zone = timezone || 'UTC';
  if (!isValidTimezone(zone)) throw new Error('invalid_timezone');
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
  const localDate = getDateKeyInTimezone(now, zone);
  return { timezone: zone, localDate, minute, startUtc: getStartOfDayInTimezone(localDate, zone), endUtc: getStartOfDayInTimezone(shiftDateKey(localDate, 1), zone) };
}
function preferenceReason(prefs, type) {
  const app = prefs?.notifications?.inApp || {};
  if (app.enabled === false) return 'master_disabled';
  const topic = type === 'motivation_quote' ? 'motivationReminder' : type === 'daily_logs_prompt' ? 'dailyLogReminder' : type === 'habit_reminder' ? 'habitReminders' : SOCIAL_TYPES.has(type) ? 'socialUpdates' : null;
  if (topic && app[topic] === false) return 'preference_disabled';
  return null;
}
function scheduledReason(type, context) {
  const [start, end] = type === 'motivation_quote' ? [480, 630] : [1200, 1320];
  return context.minute < start || context.minute >= end ? 'outside_time_window' : null;
}
function quietHours(context) { return context.minute < 480 || context.minute >= 1320; }
// Current mobile clients use FCM. Legacy Expo-format tokens are not FCM-capable.
function activeDeviceFilter(userId) {
  return { userId: normalizeUserId(userId), isActive: true, platform: { $in: ['android', 'ios', 'unknown'] }, provider: { $in: ['fcm', 'expo'] }, token: { $type: 'string', $ne: '', $not: /^(ExponentPushToken|ExpoPushToken)\[/ } };
}
module.exports = { normalizeUserId, localContext, preferenceReason, scheduledReason, quietHours, activeDeviceFilter, SOCIAL_TYPES, LIKE_TYPES };
