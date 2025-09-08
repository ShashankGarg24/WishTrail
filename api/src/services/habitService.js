const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const User = require('../models/User');

function toDateKeyUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  return d.toISOString().split('T')[0];
}

function isScheduledForDay(habit, jsDate) {
  if (habit.frequency === 'daily') return true;
  const day = new Date(jsDate).getDay(); // 0..6
  const days = habit.daysOfWeek || [];
  return days.includes(day);
}

function computeConsistency(totalCompletions, createdAt) {
  const daysSince = Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / (24*60*60*1000)));
  return Math.min(100, Math.round((totalCompletions / daysSince) * 100));
}

async function createHabit(userId, payload) {
  const doc = new Habit({
    userId,
    name: payload.name,
    description: payload.description || '',
    frequency: payload.frequency || 'daily',
    daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : undefined,
    timezone: payload.timezone || 'UTC',
    reminders: Array.isArray(payload.reminders) ? payload.reminders : [],
    goalId: payload.goalId || undefined,
    isPublic: payload.isPublic !== undefined ? !!payload.isPublic : true
  });
  await doc.save();

  // Optional social activity sharing (disabled by default)
  const shareEnabled = String(process.env.HABIT_SHARE_ENABLED || '').toLowerCase() === 'true';
  if (shareEnabled) {
    try {
      const currentUser = await User.findById(userId).select('name avatar').lean();
      await Activity.createActivity(userId, currentUser?.name, currentUser?.avatar, 'streak_milestone', {
        metadata: { kind: 'habit_created', habitId: doc._id, habitName: doc.name }
      });
    } catch (_) {}
  }

  return doc;
}

async function listHabits(userId, { includeArchived = false } = {}) {
  const q = { userId, isActive: true };
  if (!includeArchived) q.isArchived = false;
  const habits = await Habit.find(q).sort({ createdAt: -1 }).lean();
  const enriched = habits.map(h => ({
    ...h,
    consistency: computeConsistency(h.totalCompletions || 0, h.createdAt)
  }));
  return enriched;
}

async function getHabit(userId, habitId) {
  const h = await Habit.findOne({ _id: habitId, userId, isActive: true });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  return h;
}

async function updateHabit(userId, habitId, payload) {
  const h = await Habit.findOne({ _id: habitId, userId, isActive: true });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  if (h.isArchived) throw Object.assign(new Error('Habit is archived'), { statusCode: 400 });
  const set = {};
  ['name','description','frequency','timezone'].forEach(k => { if (payload[k] !== undefined) set[k] = payload[k]; });
  if (Array.isArray(payload.daysOfWeek)) set.daysOfWeek = payload.daysOfWeek;
  if (Array.isArray(payload.reminders)) set.reminders = payload.reminders;
  if (payload.goalId !== undefined) set.goalId = payload.goalId || undefined;
  if (payload.isPublic !== undefined) set.isPublic = !!payload.isPublic;
  const updated = await Habit.findByIdAndUpdate(habitId, { $set: set }, { new: true, runValidators: true });
  return updated;
}

async function archiveHabit(userId, habitId) {
  const h = await Habit.findOneAndUpdate({ _id: habitId, userId }, { $set: { isArchived: true } }, { new: true });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  return h;
}

async function deleteHabit(userId, habitId) {
  const h = await Habit.findOne({ _id: habitId, userId });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  await Habit.deleteOne({ _id: habitId, userId });
  await HabitLog.deleteMany({ habitId, userId });
  return { ok: true };
}

async function toggleLog(userId, habitId, { status = 'done', note = '', mood = 'neutral', journalEntryId = null, date = new Date() } = {}) {
  const habit = await Habit.findOne({ _id: habitId, userId, isActive: true });
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  if (habit.isArchived) throw Object.assign(new Error('Habit is archived'), { statusCode: 400 });

  const dateKey = toDateKeyUTC(date);
  const scheduled = isScheduledForDay(habit, date);
  const isDone = status === 'done';

  // Upsert log
  const log = await HabitLog.findOneAndUpdate(
    { userId, habitId, dateKey },
    { $set: { status, note, mood, journalEntryId: journalEntryId || undefined } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Update streaks if marking done on a scheduled day
  if (isDone && scheduled) {
    const prevKey = habit.lastLoggedDateKey;
    const yesterday = (() => { const d = new Date(date); d.setUTCDate(d.getUTCDate() - 1); return toDateKeyUTC(d); })();
    let nextStreak = 1;
    if (prevKey === yesterday) {
      nextStreak = (habit.currentStreak || 0) + 1;
    }
    const longest = Math.max(habit.longestStreak || 0, nextStreak);
    const update = {
      currentStreak: nextStreak,
      longestStreak: longest,
      lastLoggedDateKey: dateKey,
      totalCompletions: (habit.totalCompletions || 0) + 1
    };
    await Habit.updateOne({ _id: habit._id }, { $set: update });

    // Milestones: 1, 7, 30, 100 (social sharing optional via flag)
    const shareEnabled = String(process.env.HABIT_SHARE_ENABLED || '').toLowerCase() === 'true';
    if (shareEnabled && [1, 7, 30, 100].includes(nextStreak)) {
      try {
        const u = await User.findById(userId).select('name avatar').lean();
        const metadata = { kind: 'habit_streak', habitId: habit._id, habitName: habit.name };
        // Keep OG image path generation internal; only used if sharing enabled
        if (nextStreak === 30) {
          metadata.shareImagePath = `/api/v1/habits/${habit._id}/og-image?count=${nextStreak}`;
        }
        await Activity.createActivity(userId, u?.name, u?.avatar, 'streak_milestone', {
          streakCount: nextStreak,
          metadata
        });
      } catch (_) {}
    }
  } else if (!isDone) {
    // If missed or skipped, reset current streak only if dateKey is today
    const todayKey = toDateKeyUTC(new Date());
    if (dateKey === todayKey && (habit.currentStreak || 0) > 0) {
      await Habit.updateOne({ _id: habit._id }, { $set: { currentStreak: 0 } });
    }
  }

  return log;
}

async function getHeatmap(userId, habitId, { months = 3 } = {}) {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - months);
  const fromKey = toDateKeyUTC(from);
  const logs = await HabitLog.find({ userId, habitId, dateKey: { $gte: fromKey } })
    .select('dateKey status')
    .lean();
  const map = {};
  for (const l of logs) map[l.dateKey] = l.status;
  return map;
}

async function getStats(userId) {
  const habits = await Habit.find({ userId, isActive: true, isArchived: false }).lean();
  const total = habits.length;
  const streaks = habits.reduce((acc, h) => ({
    totalCurrent: acc.totalCurrent + (h.currentStreak || 0),
    best: Math.max(acc.best, h.longestStreak || 0),
  }), { totalCurrent: 0, best: 0 });
  const avgConsistency = habits.length === 0 ? 0 : Math.round(habits.reduce((s, h) => s + computeConsistency(h.totalCompletions || 0, h.createdAt), 0) / habits.length);
  return { totalHabits: total, totalCurrentStreak: streaks.totalCurrent, bestStreak: streaks.best, avgConsistency };
}

// Timezone-aware reminder: build local time from habit.timezone and compare to current UTC
function nowInTimezoneHHmm(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour12: false, timeZone: timezone, hour: '2-digit', minute: '2-digit' });
    const parts = fmt.formatToParts(new Date());
    const hh = parts.find(p => p.type === 'hour')?.value || '00';
    const mm = parts.find(p => p.type === 'minute')?.value || '00';
    return `${hh}:${mm}`;
  } catch {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

// Return due habits for this exact minute considering timezone and schedule
async function dueHabitsForReminder(userId) {
  const habits = await Habit.find({ userId, isActive: true, isArchived: false }).lean();
  const todayUTC = new Date();
  const jobs = [];
  for (const h of habits) {
    if (!isScheduledForDay(h, todayUTC)) continue;
    const localHHmm = nowInTimezoneHHmm(h.timezone || 'UTC');
    const times = (h.reminders || []).map(r => r?.time).filter(Boolean);
    if (times.includes(localHHmm)) jobs.push(h);
  }
  return jobs;
}

async function sendReminderNotifications() {
  const users = await User.find({ isActive: true }).select('_id').lean();
  const jobs = [];
  for (const u of users) {
    const habits = await dueHabitsForReminder(u._id);
    for (const h of habits) {
      const localTime = nowInTimezoneHHmm(h.timezone || 'UTC');
      jobs.push(Notification.createNotification({
        userId: u._id,
        type: 'habit_reminder',
        title: 'Habit Reminder',
        message: `Time to do: ${h.name}`,
        data: { habitId: h._id, metadata: { habitName: h.name, time: localTime, timezone: h.timezone || 'UTC' } },
        priority: 'low'
      }));
    }
  }
  await Promise.allSettled(jobs);
  return { ok: true, count: jobs.length };
}

async function analytics(userId, { days = 30 } = {}) {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(1, days));
  const fromKey = toDateKeyUTC(from);
  const logs = await HabitLog.find({ userId, dateKey: { $gte: fromKey } }).lean();
  const totals = { done: 0, missed: 0, skipped: 0 };
  const byHabit = {};
  for (const l of logs) {
    if (l.status === 'done') totals.done++; else if (l.status === 'missed') totals.missed++; else totals.skipped++;
    if (!byHabit[l.habitId]) byHabit[l.habitId] = { done: 0, missed: 0, skipped: 0 };
    byHabit[l.habitId][l.status] = (byHabit[l.habitId][l.status] || 0) + 1;
  }
  // top streaks snapshot
  const habits = await Habit.find({ userId, isActive: true }).select('name currentStreak longestStreak totalCompletions').lean();
  const top = habits.sort((a,b) => (b.currentStreak||0) - (a.currentStreak||0)).slice(0, 5);
  return { totals, byHabit, topHabits: top };
}

module.exports = {
  createHabit,
  listHabits,
  getHabit,
  updateHabit,
  archiveHabit,
  deleteHabit,
  toggleLog,
  getHeatmap,
  getStats,
  sendReminderNotifications,
  analytics,
};


