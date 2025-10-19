const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const User = require('../models/User');
const redis = require('../config/redis');

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
  // Default timezone to user's stored timezone if available, else UTC
  const user = await User.findById(userId).select('timezone').lean();
  const doc = new Habit({
    userId,
    name: payload.name,
    description: payload.description || '',
    frequency: payload.frequency || 'daily',
    daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : undefined,
    timezone: (payload.timezone || user?.timezone || 'UTC'),
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
  // Ensure timezone is set when editing reminders if habit has no meaningful timezone
  if (Array.isArray(payload.reminders) && (set.timezone === undefined)) {
    try {
      if (!h.timezone || h.timezone === 'UTC') {
        const u = await User.findById(userId).select('timezone').lean();
        if (u?.timezone) set.timezone = u.timezone; else if (!h.timezone) set.timezone = 'UTC';
      }
    } catch (_) {}
  }
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
    // Mirror into community feed if a community item references this habit
    try {
      const CommunityItem = require('../models/CommunityItem');
      const CommunityActivity = require('../models/CommunityActivity');
      const link = await CommunityItem.findOne({ type: 'habit', sourceId: habit._id, status: 'approved', isActive: true }).select('communityId').lean();
      if (link && link.communityId && [1,7,30,100].includes(nextStreak)) {
        const u = await User.findById(userId).select('name avatar').lean();
        await CommunityActivity.create({
          communityId: link.communityId,
          userId,
          name: u?.name,
          avatar: u?.avatar,
          type: 'streak_milestone',
          data: { streakCount: nextStreak, metadata: { habitId: habit._id, habitName: habit.name } }
        });
      }
    } catch (_) {}
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
  // Use aggregation to compute stats efficiently in MongoDB
  const dayMs = 24 * 60 * 60 * 1000;
  const stats = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true, isArchived: false } },
    {
      $project: {
        currentStreak: { $ifNull: ["$currentStreak", 0] },
        longestStreak: { $ifNull: ["$longestStreak", 0] },
        totalCompletions: { $ifNull: ["$totalCompletions", 0] },
        createdAt: 1,
        daysSince: {
          $max: [
            1,
            {
              $ceil: {
                $divide: [
                  { $subtract: ["$$NOW", "$createdAt"] },
                  dayMs
                ]
              }
            }
          ]
        }
      }
    },
    {
      $project: {
        currentStreak: 1,
        longestStreak: 1,
        consistency: {
          $min: [
            100,
            {
              $round: [
                {
                  $multiply: [
                    { $cond: [{ $gt: ["$daysSince", 0] }, { $divide: ["$totalCompletions", "$daysSince"] }, 0] },
                    100
                  ]
                },
                0
              ]
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalHabits: { $sum: 1 },
        totalCurrentStreak: { $sum: "$currentStreak" },
        bestStreak: { $max: "$longestStreak" },
        avgConsistency: { $avg: "$consistency" }
      }
    },
    {
      $project: {
        _id: 0,
        totalHabits: 1,
        totalCurrentStreak: 1,
        bestStreak: 1,
        avgConsistency: { $ifNull: [{ $round: ["$avgConsistency", 0] }, 0] }
      }
    }
  ]);

  const result = stats[0] || { totalHabits: 0, totalCurrentStreak: 0, bestStreak: 0, avgConsistency: 0 };
  return result;
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

function minutesOfDayInTimezone(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour12: false, timeZone: timezone, hour: '2-digit', minute: '2-digit' });
    const parts = fmt.formatToParts(new Date());
    const hh = Number(parts.find(p => p.type === 'hour')?.value || '0');
    const mm = Number(parts.find(p => p.type === 'minute')?.value || '0');
    return hh * 60 + mm;
  } catch {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

function parseHHmmToMinutes(text) {
  try {
    if (!text || typeof text !== 'string') return null;
    const parts = text.split(':');
    if (parts.length < 2) return null;
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  } catch {
    return null;
  }
}

// Return due habits for this exact minute considering timezone and schedule
async function dueHabitsForReminder(userId, userTimezone, windowMinutes = 10) {
  const habits = await Habit.find({ userId, isActive: true, isArchived: false }).lean();
  const todayUTC = new Date();
  const jobs = [];
  for (const h of habits) {
    if (!isScheduledForDay(h, todayUTC)) continue;
    // Prefer user's timezone when habit timezone is empty or left at default 'UTC'
    const tz = (h.timezone && h.timezone !== 'UTC') ? h.timezone : (userTimezone || 'UTC');
    const localNowMin = minutesOfDayInTimezone(tz);
    const times = (h.reminders || []).map(r => (typeof r === 'string' ? r : (r?.time))).filter(Boolean);
    for (const t of times) {
      const tMin = parseHHmmToMinutes(t);
      if (tMin == null) continue;
      const delta = (localNowMin - tMin + 1440) % 1440; // minutes since scheduled time, wrapped
      if (delta >= 0 && delta <= windowMinutes) {
        jobs.push({ habit: h, timezone: tz, matchedMinutes: tMin });
      }
    }
  }
  return jobs;
}

// Quiet hours removed per new spec
function isWithinQuietHours() { return false; }

async function sendReminderNotifications({ windowMinutes = 10 } = {}) {
  const users = await User.find({ isActive: true }).select('_id notificationSettings timezone').lean();
  const jobs = [];
  for (const u of users) {
    const ns = u.notificationSettings || {};
    if (ns.habits && ns.habits.enabled === false) continue;
    // Quiet hours removed
    const due = await dueHabitsForReminder(u._id, u.timezone || 'Asia/Kolkata', windowMinutes);
    for (const job of due) {
      const h = job.habit;
      // Skip if already done today (default true)
      const skipIfDone = ns.habits && typeof ns.habits.skipIfDone === 'boolean' ? ns.habits.skipIfDone : true;
      if (skipIfDone) {
        const todayKey = toDateKeyUTC(new Date());
        const done = await HabitLog.findOne({ userId: u._id, habitId: h._id, dateKey: todayKey, status: 'done' }).select('_id').lean();
        if (done) continue;
      }
      // Idempotency guard (10-min window key)
      try {
        const dateKey = toDateKeyUTC(new Date());
        const key = `habit:reminder:${String(u._id)}:${String(h._id)}:${dateKey}:${job.matchedMinutes}`;
        const exists = await redis.get(key);
        if (!exists) {
          const ttl = Math.max(600, windowMinutes * 60); // >=10min
          await redis.set(key, '1', { ex: ttl });
          const timeHHmm = `${String(Math.floor(job.matchedMinutes / 60)).padStart(2,'0')}:${String(job.matchedMinutes % 60).padStart(2,'0')}`;
          jobs.push(Notification.createHabitReminderNotification(u._id, h._id, h.name, timeHHmm));
        }
      } catch (_) {
        // If redis unavailable, fall back to sending (dedup relies on notification rules/user settings)
        const timeHHmm = `${String(Math.floor(job.matchedMinutes / 60)).padStart(2,'0')}:${String(job.matchedMinutes % 60).padStart(2,'0')}`;
        jobs.push(Notification.createHabitReminderNotification(u._id, h._id, h.name, timeHHmm));
      }
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


