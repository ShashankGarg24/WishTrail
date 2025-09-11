const User = require('../models/User');
const Notification = require('../models/Notification');

function nowInTimezoneHHmmAndWeekday(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour12: false,
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
    const parts = fmt.formatToParts(new Date());
    const hh = parts.find(p => p.type === 'hour')?.value || '00';
    const mm = parts.find(p => p.type === 'minute')?.value || '00';
    const wd = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    return { hhmm: `${hh}:${mm}`, weekday: wd };
  } catch {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    // get UTC weekday
    const map = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return { hhmm: `${hh}:${mm}`, weekday: map[d.getUTCDay()] };
  }
}

// Curated quotes (rotate by day)
const QUOTES = [
  'Small steps every day lead to big results.',
  'Show up for yourself today. Future you will thank you.',
  'Progress over perfection — just begin.',
  'Your effort today plants tomorrow’s success.',
  'You’ve got this. One focused win this morning.',
  'Be 1% better than yesterday.',
  'Consistency turns dreams into plans.',
  'Start where you are. Use what you have. Do what you can.'
];

function pickQuote() {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return QUOTES[day % QUOTES.length];
}

async function sendMorningQuotes() {
  const users = await User.find({ isActive: true }).select('_id notificationSettings timezone').lean();
  const jobs = [];
  for (const u of users) {
    const ns = u.notificationSettings || {};
    const mot = ns.motivation || {};
    if (mot.enabled === false || mot.frequency === 'off') continue;
    const { hhmm, weekday } = nowInTimezoneHHmmAndWeekday(u.timezone || 'UTC');
    if (hhmm !== '08:00') continue;
    // weekly => send on Mon & Thu at 08:00
    if ((mot.frequency || 'off') === 'weekly' && !['Mon', 'Thu'].includes(weekday)) continue;
    // Create quote notification
    const quote = pickQuote();
    jobs.push(Notification.createNotification({
      userId: u._id,
      type: 'motivation_quote',
      title: 'Morning Motivation',
      message: quote,
      priority: 'low'
    }));
  }
  await Promise.allSettled(jobs);
  return { ok: true, count: jobs.length };
}

module.exports = { sendMorningQuotes };


