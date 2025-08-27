const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const EmotionalSummary = require('../models/EmotionalSummary');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');

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

async function createEntry(userId, { content, promptKey, visibility = 'private', mood = 'neutral', tags = [] }) {
  const promptObj = PROMPTS.find(p => p.key === promptKey) || { key: 'freeform', text: '' };
  const entry = new JournalEntry({
    userId,
    promptKey: promptObj.key,
    promptText: promptObj.text,
    content,
    visibility,
    mood,
    tags
  });
  entry.signals = deriveSignalsFromEntry(entry);
  await entry.save();
  return entry;
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
  listMyEntries,
  getUserHighlights,
  computeSummary,
  notifyDailyPrompt,
  notifyPeriodSummary
};


