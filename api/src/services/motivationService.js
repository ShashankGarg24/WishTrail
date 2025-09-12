const User = require('../models/User');
const Notification = require('../models/Notification');
const redis = require('../config/redis');
const axios = require('axios');

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

function sanitizeInterestKey(label) {
  return String(label || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

function getDayOfYear(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

async function sendMorningQuotes() {
  const users = await User.find({ isActive: true }).select('_id notificationSettings timezone interests').lean();
  const jobs = [];
  for (const u of users) {
    const ns = u.notificationSettings || {};
    const mot = ns.motivation || {};
    if (mot.enabled === false || mot.frequency === 'off') continue;
    const { hhmm, weekday } = nowInTimezoneHHmmAndWeekday(u.timezone || 'UTC');
    if (hhmm !== '08:00') continue;
    // weekly => send on Mon & Thu at 08:00
    if ((mot.frequency || 'off') === 'weekly' && !['Mon', 'Thu'].includes(weekday)) continue;
    // Choose one interest deterministically; fallback to general
    const interests = Array.isArray(u.interests) && u.interests.length ? u.interests : ['general'];
    const doy = getDayOfYear(new Date());
    const chosen = interests[doy % interests.length];
    // Prefer nightly generated quote for the chosen interest from Redis
    const dayKey = new Date(); dayKey.setHours(0,0,0,0);
    const interestKey = sanitizeInterestKey(chosen);
    const key = `motivation:${dayKey.toISOString().slice(0,10)}:interest:${interestKey}`;
    let quote = await redis.get(key);
    if (!quote && interestKey !== 'general') {
      const fallbackKey = `motivation:${dayKey.toISOString().slice(0,10)}:interest:general`;
      quote = await redis.get(fallbackKey);
    }
    if (!quote) quote = pickQuote();
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

async function generateNightlyQuotes() {
  const apiKey = process.env.GROQ_API_KEY;
  // Build a distinct interest list across users; always include a 'general' fallback
  let interests = [];
  try { interests = await User.distinct('interests', { isActive: true }); } catch (_) { interests = []; }
  if (!Array.isArray(interests)) interests = [];
  const interestList = Array.from(new Set([...(interests.filter(Boolean).map(String)), 'general']));

  const dayKey = new Date(); dayKey.setHours(0,0,0,0);
  const isoDate = dayKey.toISOString().slice(0,10);
  const ttlSeconds = 36 * 60 * 60; // keep ~36h

  for (const interest of interestList) {
    try {
      const label = String(interest || 'general');
      let quote = pickQuote();
      if (apiKey) {
        const promptInterest = label === 'general' ? 'personal growth and wellbeing' : label.replace(/_/g, ' ');
        const prompt = `Write one short morning motivation (max 16 words), positive and kind, tailored to this interest: ${promptInterest}. Output plain text only.`;
        try {
          const resp = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'Llama-3.1-8B-Instant',
            messages: [
              { role: 'system', content: 'You are a concise motivational assistant. Return a single short line, no emojis unless natural.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 60
          }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
          const text = resp?.data?.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0) quote = text.trim().replace(/^"|"$/g,'');
        } catch (_) {}
      }
      const key = `motivation:${isoDate}:interest:${sanitizeInterestKey(label)}`;
      await redis.set(key, quote, { ex: ttlSeconds });
    } catch (_) {}
  }
  return { ok: true };
}

module.exports = { sendMorningQuotes, generateNightlyQuotes };


