const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const EmotionalSummary = require('../models/EmotionalSummary');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const axios = require('axios');

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
Otherwise, produce a concise, emotionally supportive message (30-50 words) celebrating their effort.

Also perform sentiment analysis to classify the user's overall mood as EXACTLY ONE of the following strings: "very_negative", "negative", "neutral", "positive", or "very_positive".

Also extract counts of emotional aspects present in the journal:
- helpedCount: number of times they helped someone
- gratitudeCount: number of gratitude expressions
- selfSacrificeCount: number of selfless/sacrifice indications
- positiveCount: number of clearly positive moments or emotions
- kindnessCount: number of acts of kindness
- resilienceCount: number of resilient/courageous moments
- otherCount: number of other meaningful emotional aspects not covered above

Return STRICT JSON only (no markdown, no commentary) with shape:
{
  "motivation": string,
  "mood": "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
  "signals": {"helpedCount": number, "gratitudeCount": number, "selfSacrificeCount": number, "positiveCount": number, "kindnessCount": number, "resilienceCount": number, "otherCount": number}
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
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }
    if (!parsed || typeof parsed !== 'object') {
      parsed = {
        motivation: (answer || '').slice(0, 240),
        mood: 'neutral',
        signals: { helpedCount: 0, gratitudeCount: 0, selfSacrificeCount: 0, positiveCount: 0, kindnessCount: 0, resilienceCount: 0, otherCount: 0 }
      };
    } else {
      parsed.motivation = String(parsed.motivation || '').slice(0, 400);
      parsed.signals = parsed.signals || { helpedCount: 0, gratitudeCount: 0, selfSacrificeCount: 0, positiveCount: 0, kindnessCount: 0, resilienceCount: 0, otherCount: 0 };
      const allowedMoods = new Set(['very_negative','negative','neutral','positive','very_positive']);
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
  const todayKey = new Date(); todayKey.setUTCHours(0,0,0,0);
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
  entry.signals = deriveSignalsFromEntry(entry);
  await entry.save();
  // Fire-and-forget LLM enrichment
  try {
    const llm = await generateMotivationLLM({ content, promptKey: entry.promptKey });
    if (llm && llm.parsed) {
      entry.ai = { motivation: llm.parsed.motivation || '', model: 'Llama-3.1-8B-Instant' };
      const s = llm.parsed.signals || {};
      entry.aiSignals = {
        helpedCount: Number(s.helpedCount) || 0,
        gratitudeCount: Number(s.gratitudeCount) || 0,
        selfSacrificeCount: Number(s.selfSacrificeCount) || 0,
        positiveCount: Number(s.positiveCount) || 0,
        kindnessCount: Number(s.kindnessCount) || 0,
        resilienceCount: Number(s.resilienceCount) || 0,
        otherCount: Number(s.otherCount) || 0
      };
      // Set mood from LLM (user can edit later)
      if (llm.parsed.mood) {
        entry.mood = llm.parsed.mood;
      }
      // Adjust basic signals positivity if strong positiveCount
      if ((entry.aiSignals.positiveCount || 0) > 0 && (!entry.signals || typeof entry.signals.positivity !== 'number')) {
        entry.signals = entry.signals || {};
        entry.signals.positivity = 1;
      }
      await entry.save();
    }
  } catch (_) {}
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

async function getEmotionStats(targetUserId, viewerUserId) {
  const isSelf = String(targetUserId) === String(viewerUserId);
  const visibilityFilter = isSelf ? {} : { visibility: { $in: ['public', 'friends'] } };
  const entries = await JournalEntry.find({ userId: targetUserId, isActive: true, ...visibilityFilter }).select('signals aiSignals').lean();
  const stats = {
    helped: 0,
    gratitude: 0,
    selfSacrifice: 0,
    positive: 0,
    kindness: 0,
    resilience: 0,
    other: 0
  };
  for (const e of entries) {
    if (e.signals?.helpedSomeone) stats.helped += 1;
    if (e.signals?.expressedGratitude) stats.gratitude += 1;
    if (e.signals?.selfSacrifice) stats.selfSacrifice += 1;
    if ((e.signals?.positivity || 0) > 0) stats.positive += 1;
    if (e.aiSignals) {
      stats.helped += Number(e.aiSignals.helpedCount || 0);
      stats.gratitude += Number(e.aiSignals.gratitudeCount || 0);
      stats.selfSacrifice += Number(e.aiSignals.selfSacrificeCount || 0);
      stats.positive += Number(e.aiSignals.positiveCount || 0);
      stats.kindness += Number(e.aiSignals.kindnessCount || 0);
      stats.resilience += Number(e.aiSignals.resilienceCount || 0);
      stats.other += Number(e.aiSignals.otherCount || 0);
    }
  }
  return stats;
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
    } catch (_) {}
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
    if (e.signals?.helpedSomeone) highlights.push('Helped someone today 📚');
    if (e.signals?.selfSacrifice) highlights.push('Made a sacrifice for loved ones 💕');
    if (e.signals?.expressedGratitude) highlights.push('Felt grateful 🙏');
    if ((e.signals?.positivity || 0) > 0) highlights.push('Stayed positive ✨');
    // also extract a short quote from content
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
    d.setHours(0,0,0,0);
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

async function computeSummary(userId, period = 'week') {
  const from = startOfPeriod(period);
  const to = endOfPeriod(period);
  const entries = await JournalEntry.find({ userId, isActive: true, createdAt: { $gte: from, $lt: to } }).lean();
  const metrics = {
    helpedCount: 0,
    gratitudeCount: 0,
    sacrificeCount: 0,
    positiveMoments: 0,
    entriesCount: entries.length
  };
  for (const e of entries) {
    if (e.signals?.helpedSomeone) metrics.helpedCount += 1;
    if (e.signals?.expressedGratitude) metrics.gratitudeCount += 1;
    if (e.signals?.selfSacrifice) metrics.sacrificeCount += 1;
    if ((e.signals?.positivity || 0) > 0) metrics.positiveMoments += 1;
    if (e.aiSignals) {
      metrics.helpedCount += Number(e.aiSignals.helpedCount || 0);
      metrics.gratitudeCount += Number(e.aiSignals.gratitudeCount || 0);
      metrics.sacrificeCount += Number(e.aiSignals.selfSacrificeCount || 0);
      metrics.positiveMoments += Number(e.aiSignals.positiveCount || 0);
      // kindness/resilience could be surfaced in the copy later if needed
    }
  }

  const summaryText = period === 'week'
    ? `This week, you helped ${metrics.helpedCount} people, stayed positive ${metrics.positiveMoments} times, and showed gratitude ${metrics.gratitudeCount} times 💫.`
    : `This month, you helped ${metrics.helpedCount} people, stayed positive ${metrics.positiveMoments} times, and showed gratitude ${metrics.gratitudeCount} times 💫.`;

  // Simple badge logic
  let badge = null;
  if (metrics.helpedCount >= 3 && metrics.gratitudeCount >= 2) {
    badge = { code: 'compassionate_soul', label: 'Compassionate Soul', icon: '🕊️' };
  } else if (metrics.positiveMoments >= 5) {
    badge = { code: 'ray_of_sunshine', label: 'Ray of Sunshine', icon: '🌞' };
  }

  const summary = await EmotionalSummary.findOneAndUpdate(
    { userId, period, periodStart: from },
    { userId, period, periodStart: from, periodEnd: to, metrics, summaryText, badge },
    { new: true, upsert: true }
  );

  // Award emotional achievements based on badge
  try {
    if (badge?.code) {
      // Ensure default emotional achievements exist
      await Achievement.createDefaultAchievements();
      const achievement = await Achievement.findOne({ 'criteria.specialConditions.code': badge.code });
      if (achievement) {
        try {
          await UserAchievement.awardAchievement(userId, achievement._id, { badge: badge.code, period });
        } catch (e) {
          // ignore duplicate
        }
      }
    }
  } catch (_) {}

  return summary;
}

async function notifyDailyPrompt() {
  const prompt = getTodayPrompt();
  const users = await User.find({ isActive: true }).select('_id').lean();
  const jobs = users.map(u => Notification.createNotification({
    userId: u._id,
    type: 'journal_prompt',
    title: 'Daily Journal',
    message: prompt.text,
    data: { metadata: { promptKey: prompt.key } },
    priority: 'low'
  }));
  await Promise.allSettled(jobs);
}

async function notifyPeriodSummary(period) {
  const users = await User.find({ isActive: true }).select('_id').lean();
  for (const u of users) {
    const summary = await computeSummary(u._id, period);
    const notifType = period === 'week' ? 'weekly_summary' : 'monthly_summary';
    await Notification.createNotification({
      userId: u._id,
      type: notifType,
      title: period === 'week' ? 'Weekly Emotional Highlights' : 'Monthly Emotional Highlights',
      message: summary.summaryText,
      data: { metadata: { period, badge: summary.badge } },
      priority: 'medium'
    });
  }
}

module.exports = {
  getTodayPrompt,
  createEntry,
  updateEntry,
  listMyEntries,
  getUserHighlights,
  computeSummary,
  notifyDailyPrompt,
  notifyPeriodSummary,
  getEmotionStats
};


