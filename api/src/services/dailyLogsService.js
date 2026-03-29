const mongoose = require('mongoose');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const Notification = require('../models/Notification');
const UserPreferences = require('../models/extended/UserPreferences');
const { query } = require('../config/supabase');
const axios = require('axios');
const redis = require('../config/redis');
const pgUserService = require('./pgUserService');
const { getDateKeyInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utility/timezone');

const ALLOWED_DAILY_LOG_MOODS = new Set(['happy', 'motivated', 'okay', 'stressed', 'sad', 'angry']);

const PROMPTS = [
  { key: 'smile', text: 'What made you smile today?' },
  { key: 'helped', text: 'Did you help someone today?' },
  { key: 'sacrifice', text: 'One sacrifice you made for someone you love?' },
  { key: 'grateful', text: 'One thing you’re grateful for today?' }
];

let cleanupDeprecatedFieldsPromise = null;
function cleanupDeprecatedDailyLogsFields() {
  if (!cleanupDeprecatedFieldsPromise) {
    cleanupDeprecatedFieldsPromise = DailyLogsEntry.updateMany(
      {
        $or: [
          { visibility: { $exists: true } },
          { wordCount: { $exists: true } },
          { isActive: { $exists: true } }
        ]
      },
      {
        $unset: {
          visibility: '',
          wordCount: '',
          isActive: ''
        }
      }
    ).catch(() => null);
  }

  return cleanupDeprecatedFieldsPromise;
}

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
Read the user's short daily log below. If it is inappropriate or harmful, respond with motivation: "Thanks for sharing. Please keep entries respectful and safe.".
Otherwise, produce a concise, emotionally supportive message (50-70 words) celebrating their effort. Add a little bit of encouragement or motivation to keep them going (if needed).

Also perform sentiment analysis to classify the user's overall mood as EXACTLY ONE of the following strings: "happy", "motivated", "okay", "stressed", "sad", or "angry".
The Sentiment analysis should be very accurate and precise.

Return STRICT JSON only (no markdown, no commentary) with shape:
{
  "motivation": string,
  "mood": "happy" | "motivated" | "okay" | "stressed" | "sad" | "angry"
}

Daily log prompt key: ${promptKey || 'freeform'}
Daily log content: <<<${content}>>>`;

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
        mood: 'okay'
      };
    } else {
      parsed.motivation = String(parsed.motivation || '').slice(0, 400);
      const normalizedMood = String(parsed.mood || '').trim().toLowerCase();
      if (!ALLOWED_DAILY_LOG_MOODS.has(normalizedMood)) {
        // Derive a reasonable default from signals
        const pos = Number(parsed.signals?.positiveCount || 0);
        parsed.mood = pos > 1 ? 'happy' : 'okay';
      } else {
        parsed.mood = normalizedMood;
      }
    }
    return { parsed };
  } catch (e) {
    return null;
  }
}

async function createEntry(userId, { content, promptKey, mood, tags = [] }) {
  await cleanupDeprecatedDailyLogsFields();

  // Get user's timezone for proper day calculation
  const user = await pgUserService.findById(userId);
  const userTimezone = user?.timezone || 'UTC';
  
  // Calculate today's date key in user's timezone
  const dayKey = getDateKeyInTimezone(new Date(), userTimezone);
  
  // Enforce 1 per day (check by dayKey in user's timezone)
  const existing = await DailyLogsEntry.findOne({ userId, dayKey }).lean();
  if (existing) {
    const err = new Error('Daily log already submitted. Come back tomorrow.');
    err.statusCode = 429;
    throw err;
  }

  const trimmedContent = String(content || '').trim();
  const contentCharLimit = 300;
  const hasContent = trimmedContent.length > 0;

  if (trimmedContent.length > contentCharLimit) {
    const err = new Error(`Please keep your daily log text within ${contentCharLimit} characters.`);
    err.statusCode = 400;
    throw err;
  }

  const normalizedMoodInput = typeof mood === 'string' ? mood.trim().toLowerCase() : '';
  const normalizedMood = ALLOWED_DAILY_LOG_MOODS.has(normalizedMoodInput) ? normalizedMoodInput : null;

  if (!hasContent && !normalizedMood) {
    const err = new Error('Add text or emotion to submit your daily log.');
    err.statusCode = 400;
    throw err;
  }

  // Word limit (e.g., 120 words)
  const maxWords = parseInt(process.env.DAILY_LOGS_MAX_WORDS || '120', 10);
  const words = hasContent ? trimmedContent.split(/\s+/).filter(Boolean) : [];
  if (words.length > maxWords) {
    const err = new Error(`Please keep your daily log under ${maxWords} words.`);
    err.statusCode = 400;
    throw err;
  }

  const promptObj = PROMPTS.find(p => p.key === promptKey) || { key: 'freeform', text: '' };
  const entry = new DailyLogsEntry({
    userId,
    promptKey: promptObj.key,
    promptText: promptObj.text,
    content: trimmedContent,
    ...(normalizedMood ? { mood: normalizedMood } : {}),
    tags,
    dayKey
  });
  await entry.save();
  // Fire-and-forget LLM enrichment
  // try {
  //   if (!hasContent) return entry;

  //   const llm = await generateMotivationLLM({ content: trimmedContent, promptKey: entry.promptKey });
  //   if (llm && llm.parsed) {
  //     entry.ai = { motivation: llm.parsed.motivation || '', model: 'Llama-3.1-8B-Instant' };
  //     const s = llm.parsed.signals || {};
  //     await entry.save();
  //   }
  // } catch (_) { }
  return entry;
}

async function updateEntry(userId, entryId, { content, mood, tags }) {
  await cleanupDeprecatedDailyLogsFields();

  const entry = await DailyLogsEntry.findOne({ _id: entryId, userId });
  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }

  const contentCharLimit = 300;
  let nextContent = entry.content || '';
  if (content !== undefined) {
    const trimmed = String(content || '').trim();
    if (trimmed.length > contentCharLimit) {
      const err = new Error(`Please keep your daily log text within ${contentCharLimit} characters.`);
      err.statusCode = 400;
      throw err;
    }
    nextContent = trimmed;
  }

  let nextMood = entry.mood || null;
  if (nextMood === 'calm') {
    nextMood = 'motivated';
  }
  if (mood === null) {
    nextMood = null;
  }
  if (mood !== undefined && mood !== null) {
    if (typeof mood !== 'string' || !mood.trim()) {
      const err = new Error('Invalid daily log emotion selected.');
      err.statusCode = 400;
      throw err;
    }
    const normalizedMood = mood.trim().toLowerCase();
    if (!ALLOWED_DAILY_LOG_MOODS.has(normalizedMood)) {
      const err = new Error('Invalid daily log emotion selected.');
      err.statusCode = 400;
      throw err;
    }
    nextMood = normalizedMood;
  }

  if (!nextContent && !nextMood) {
    const err = new Error('Add text or emotion to submit your daily log.');
    err.statusCode = 400;
    throw err;
  }

  entry.content = nextContent;
  entry.mood = nextMood;

  if (Array.isArray(tags)) {
    entry.tags = tags;
  }

  await entry.save();
  return entry.toObject();
}

async function clearEntry(userId, entryId) {
  await DailyLogsEntry.deleteDailyLogsEntry(entryId, userId);
  return true;
}

async function listMyEntries(userId, { limit = 20, skip = 0, todayOnly = false } = {}) {
  await cleanupDeprecatedDailyLogsFields();

  if (todayOnly) {
    const user = await pgUserService.findById(userId);
    const userTimezone = user?.timezone || 'UTC';
    const dayKey = getDateKeyInTimezone(new Date(), userTimezone);
    const startOfDay = getStartOfDayInTimezone(dayKey, userTimezone);
    const endOfDay = getEndOfDayInTimezone(dayKey, userTimezone);

    return DailyLogsEntry.find({
      userId,
      $or: [
        { dayKey },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
  }

  return DailyLogsEntry.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

async function getUserHighlights(targetUserId, viewerUserId, { limit = 12 } = {}) {
  await cleanupDeprecatedDailyLogsFields();

  const entries = await DailyLogsEntry.find({
    userId: targetUserId
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
  // Query PostgreSQL for active users with timezone
  const result = await query(
    'SELECT id, timezone FROM users WHERE is_active = true',
    []
  );
  const users = result.rows;
  const userIds = users.map(u => Number(u.id)).filter(Boolean);
  const prefDocs = await UserPreferences.find({ userId: { $in: userIds } })
    .select('userId notificationSettings')
    .lean();
  const prefMap = new Map(prefDocs.map((p) => [Number(p.userId), p.notificationSettings || {}]));

  const jobs = [];
  const targetMin = parseHHmmToMinutes(targetHHmm) ?? 20 * 60;
  for (const u of users) {
    const ns = prefMap.get(Number(u.id)) || {};
    if (ns?.inAppEnabled === false) continue;
    if (ns?.dailyLogs?.enabled === false || ns?.dailyLogs?.frequency === 'off') continue;

    const tz = u.timezone || 'UTC';
    const localMin = minutesOfDayInTimezone(tz);
    // Send once any time after the target time (20:00) the same day
    if (localMin < targetMin) continue;
    // Idempotency: one per day per user
    try {
      const dateKey = localDateKeyInTimezone(tz);
      const key = `dailyLogs:promptSent:${dateKey}:${String(u.id)}`;
      const seen = await redis.get(key);
      if (seen) continue;
      // TTL until next local midnight + 1h buffer
      const ttlSeconds = Math.max(60, ((24 * 60 - localMin) * 60) + 3600);
      await redis.set(key, '1', { ex: ttlSeconds });
    } catch { }
    jobs.push(Notification.createNotification({
      userId: u.id,
      type: 'daily_logs_prompt',
      title: 'Daily Log Reminder',
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
  clearEntry,
  listMyEntries,
  getUserHighlights,
  notifyDailyPrompt
};


