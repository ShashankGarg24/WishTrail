const UserPreferences = require('../models/extended/UserPreferences');
const redis = require('../config/redis');
const axios = require('axios');

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
  const { runScheduled } = require('./scheduledNotificationService');
  const { normalizeUserId } = require('./notificationPolicy');
  return runScheduled('motivation_quote', async (user, context) => {
    const prefs = await UserPreferences.findOne({ userId: normalizeUserId(user.id) }).select('interests').lean();
    const interests = prefs?.interests?.length ? prefs.interests : ['general'];
    const interest = sanitizeInterestKey(interests[getDayOfYear() % interests.length]);
    let quote;
    try {
      quote = await redis.get(`motivation:${context.localDate}:interest:${interest}`);
      if (!quote) quote = await redis.get(`motivation:${context.localDate}:interest:general`);
    } catch { /* Cached personalization is optional; delivery is persisted in MongoDB. */ }
    return { title: 'Morning Motivation', message: quote || pickQuote(), priority: 'low' };
  });
}

async function generateNightlyQuotes() {
  const apiKey = process.env.GROQ_API_KEY;
  // Build a distinct interest list across users; always include a 'general' fallback
  let interests = [];
  try { 
    interests = await UserPreferences.distinct('interests');
  } catch (_) { 
    interests = []; 
  }
  if (!Array.isArray(interests)) interests = [];
  const interestList = Array.from(new Set([...(interests.filter(Boolean).map(String)), 'general']));

  const dayKey = new Date(); dayKey.setHours(0,0,0,0);
  const isoDate = dayKey.toISOString().slice(0,10);
  const ttlSeconds = 36 * 60 * 60; // keep ~36h
  // Idempotency: only generate once per day
  try {
    const genKey = `motivation:nightly:generated:${isoDate}`;
    const already = await redis.get(genKey);
    if (already) return { ok: true, skipped: true };
    await redis.set(genKey, '1', { ex: 48 * 60 * 60 });
  } catch {}

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


