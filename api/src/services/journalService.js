const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const Notification = require('../models/Notification');
const User = require('../models/User');
const axios = require('axios');
const redis = require('../config/redis');

const PROMPTS = [
  { key: 'smile', text: 'What made you smile today?' },
  { key: 'helped', text: 'Did you help someone today?' },
  { key: 'sacrifice', text: 'One sacrifice you made for someone you love?' },
  { key: 'grateful', text: 'One thing you’re grateful for today?' }
];

function getDayOfYear(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date - start;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function getTodayPrompt() {
  const dayIndex = getDayOfYear(new Date()) % PROMPTS.length;
  return PROMPTS[dayIndex];
}

function deriveSignalsFromEntry(entry) {
  const signals = {
    helpedSomeone: false,
    expressedGratitude: false,
    selfSacrifice: false,
    positivity: 0
  };
  if (entry.promptKey === 'helped') signals.helpedSomeone = true;
  if (entry.promptKey === 'grateful') signals.expressedGratitude = true;
  if (entry.promptKey === 'sacrifice') signals.selfSacrifice = true;
  if (entry.promptKey === 'smile') signals.positivity = 2;
  return signals;
}

async function generateMotivationLLM({ content, promptKey }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const userPrompt = `You are an encouraging coach.
Read the user's short daily journal below. If it is inappropriate or harmful, respond with motivation: "Thanks for sharing. Please keep entries respectful and safe.".
Otherwise, produce a concise, emotionally supportive message (50-70 words) celebrating their effort. Add a little bit of encouragement or motivation to keep them going (if needed).

Also perform sentiment analysis to classify the user's overall mood as EXACTLY ONE of the following strings: "very_negative", "negative", "neutral", "positive", or "very_positive".
The Sentiment analysis should be very accurate and precise.

Return STRICT JSON only (no markdown, no commentary) with shape:
{
  "motivation": string,
  "mood": "very_negative" | "negative" | "neutral" | "positive" | "very_positive"
}

Journal prompt key: ${promptKey || 'freeform'}
Journal content: <<<${content}>>>`;

    const body = {
      model: 'Llama-3.1-8B-Instant',
      messages: [
        { role: 'system', content: 'You are a kind, concise motivational assistant. Always return valid JSON only.' },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 300,
    };
    const resp = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    const answer = resp?.data?.choices?.[0]?.message?.content || '';
    let parsed = null;
    try { parsed = JSON.parse(answer); } catch (_) {
      // Try to extract JSON substring
      const m = answer.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) { } }
    }
    if (!parsed || typeof parsed !== 'object') {
      parsed = {
        motivation: (answer || '').slice(0, 240),
        mood: 'neutral'
      };
    } else {
      parsed.motivation = String(parsed.motivation || '').slice(0, 400);
      const allowedMoods = new Set(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']);
      if (!allowedMoods.has(String(parsed.mood || '').toLowerCase())) {
        // Derive a reasonable default from signals
        const pos = Number(parsed.signals?.positiveCount || 0);
        parsed.mood = pos > 1 ? 'positive' : 'neutral';
      } else {
        parsed.mood = String(parsed.mood).toLowerCase();
      }
    }
    return { parsed };
  } catch (e) {
    return null;
  }
}

async function createEntry(userId, { content, promptKey, visibility = 'private', mood = 'neutral', tags = [] }) {
  // Enforce 1 per day
  const todayKey = new Date(); todayKey.setUTCHours(0, 0, 0, 0);
  const dayKey = todayKey.toISOString().split('T')[0];
  const existing = await JournalEntry.findOne({ userId, dayKey, isActive: true }).lean();
  if (existing) {
    const err = new Error('Daily journal already submitted. Come back tomorrow.');
    err.statusCode = 429;
    throw err;
  }

  // Word limit (e.g., 120 words)
  const maxWords = parseInt(process.env.JOURNAL_MAX_WORDS || '120', 10);
  const words = String(content || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    const err = new Error('Content is required');
    err.statusCode = 400;
    throw err;
  }
  if (words.length > maxWords) {
    const err = new Error(`Please keep your journal under ${maxWords} words.`);
    err.statusCode = 400;
    throw err;
  }

  const promptObj = PROMPTS.find(p => p.key === promptKey) || { key: 'freeform', text: '' };
  const entry = new JournalEntry({
    userId,
    promptKey: promptObj.key,
    promptText: promptObj.text,
    content,
    visibility,
    mood,
    tags,
    dayKey,
    wordCount: words.length
  });
  await entry.save();
  // Fire-and-forget LLM enrichment
  try {
    const llm = await generateMotivationLLM({ content, promptKey: entry.promptKey });
    if (llm && llm.parsed) {
      entry.ai = { motivation: llm.parsed.motivation || '', model: 'Llama-3.1-8B-Instant' };
      const s = llm.parsed.signals || {};
      // Set mood from LLM (user can edit later)
      if (llm.parsed.mood) {
        entry.mood = llm.parsed.mood;
      }
      await entry.save();
    }
  } catch (_) { }
  return entry;
}

async function updateEntry(userId, entryId, { mood, visibility }) {
  const entry = await JournalEntry.findOne({ _id: entryId, userId, isActive: true });
  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }
  if (typeof mood === 'string' && mood.trim()) entry.mood = mood.trim();
  if (typeof visibility === 'string' && ['private', 'friends', 'public'].includes(visibility)) entry.visibility = visibility;
  await entry.save();
  return entry.toObject();
}
async function listMyEntries(userId, { limit = 20, skip = 0 } = {}) {
  return JournalEntry.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

async function getUserHighlights(targetUserId, viewerUserId, { limit = 12 } = {}) {
  const isSelf = String(targetUserId) === String(viewerUserId);
  let allowedVisibility = ['public'];
  if (isSelf) {
    allowedVisibility = ['public', 'friends', 'private'];
  } else {
    // TODO: optionally check friendship/follow. For now, treat as friends if viewer follows target (approx)
    try {
      const Follow = mongoose.model('Follow');
      const follows = await Follow.findOne({ followerId: viewerUserId, followingId: targetUserId }).lean();
      if (follows) allowedVisibility = ['public', 'friends'];
    } catch (_) { }
  }

  const entries = await JournalEntry.find({
    userId: targetUserId,
    isActive: true,
    visibility: { $in: allowedVisibility }
  })
    .sort({ createdAt: -1 })
    .limit(100) // fetch more to generate highlights
    .lean();

  const highlights = [];
  for (const e of entries) {
    if (e.content) {
      const snippet = e.content.length > 60 ? `${e.content.slice(0, 57)}…` : e.content;
      highlights.push(`“${snippet}”`);
    }
    if (highlights.length >= limit) break;
  }
  // de-duplicate while preserving order
  const seen = new Set();
  const unique = [];
  for (const h of highlights) { if (!seen.has(h)) { unique.push(h); seen.add(h); } }
  return unique.slice(0, limit);
}

function startOfPeriod(period) {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    const day = d.getDay(); // 0=Sun
    const diff = (day + 6) % 7; // start Monday
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
  }
  if (period === 'month') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return d;
  }
  throw new Error('Unsupported period');
}

function endOfPeriod(period) {
  const start = startOfPeriod(period);
  if (period === 'week') {
    const d = new Date(start);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (period === 'month') {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d;
  }
  throw new Error('Unsupported period');
}


function minutesOfDayInTimezone(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour12: false, timeZone: timezone || 'UTC', hour: '2-digit', minute: '2-digit' });
    const parts = fmt.formatToParts(new Date());
    const hh = Number(parts.find(p => p.type === 'hour')?.value || '0');
    const mm = Number(parts.find(p => p.type === 'minute')?.value || '0');
    return hh * 60 + mm;
  } catch {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

function localDateKeyInTimezone(timezone) {
  try {
    // en-CA yields ISO-like YYYY-MM-DD
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function parseHHmmToMinutes(text) {
  try {
    const [hh, mm] = String(text || '').split(':');
    const H = Number(hh), M = Number(mm);
    if (Number.isNaN(H) || Number.isNaN(M)) return null;
    if (H < 0 || H > 23 || M < 0 || M > 59) return null;
    return H * 60 + M;
  } catch { return null; }
}

async function notifyDailyPrompt(windowMinutes = 30, targetHHmm = '20:00') {
  const prompt = getTodayPrompt();
  const users = await User.find({ isActive: true }).select('_id notificationSettings timezone').lean();
  const jobs = [];
  const targetMin = parseHHmmToMinutes(targetHHmm) ?? 20 * 60;
  for (const u of users) {
    const ns = u.notificationSettings || {};
    if (ns.journal && ns.journal.enabled === false) continue;
    const tz = u.timezone || 'UTC';
    const localMin = minutesOfDayInTimezone(tz);
    // Send once any time after the target time (20:00) the same day
    if (localMin < targetMin) continue;
    // Idempotency: one per day per user
    try {
      const dateKey = localDateKeyInTimezone(tz);
      const key = `journal:promptSent:${dateKey}:${String(u._id)}`;
      const seen = await redis.get(key);
      if (seen) continue;
      // TTL until next local midnight + 1h buffer
      const ttlSeconds = Math.max(60, ((24 * 60 - localMin) * 60) + 3600);
      await redis.set(key, '1', { ex: ttlSeconds });
    } catch { }
    jobs.push(Notification.createNotification({
      userId: u._id,
      type: 'journal_prompt',
      title: 'Daily Journal',
      message: prompt.text,
      data: { metadata: { promptKey: prompt.key } },
      priority: 'low'
    }));
  }
  await Promise.allSettled(jobs);
}

module.exports = {
  getTodayPrompt,
  createEntry,
  updateEntry,
  listMyEntries,
  getUserHighlights,
  notifyDailyPrompt
};


