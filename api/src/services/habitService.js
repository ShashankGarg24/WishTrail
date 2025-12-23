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
  // Validate that only one type of target is set
  if (payload.targetCompletions && payload.targetDays) {
    throw Object.assign(
      new Error('Only one target type is allowed: either targetCompletions or targetDays, not both'), 
      { statusCode: 400 }
    );
  }
  
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
    isPublic: payload.isPublic !== undefined ? !!payload.isPublic : true,
    targetCompletions: payload.targetCompletions || null,
    targetDays: payload.targetDays || null
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

async function listHabits(userId, { includeArchived = false, page = 1, limit = 50, sort = 'newest' } = {}) {
  const q = { userId, isActive: true };
  
  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  
  // Determine sort order
  let sortOrder = { updatedAt: -1 };
  if (sort === 'oldest') {
    sortOrder = { updatedAt: 1 };
  } else if (sort === 'completion') {
    sortOrder = { totalCompletions: -1, updatedAt: -1 };
  } else { // 'newest' or default
    sortOrder = { updatedAt: -1 };
  }
  
  // Get total count and paginated habits
  const [total, habits] = await Promise.all([
    Habit.countDocuments(q),
    Habit.find(q).sort(sortOrder).skip(skip).limit(limitNum).lean()
  ]);
  
  const enriched = habits.map(h => ({
    ...h,
    consistency: computeConsistency(h.totalCompletions || 0, h.createdAt)
  }));
  
  return {
    habits: enriched,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
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
  if (payload.targetCompletions !== undefined) set.targetCompletions = payload.targetCompletions || null;
  if (payload.targetDays !== undefined) set.targetDays = payload.targetDays || null;
  
  // Validate that only one type of target is set (check both new values and existing)
  const finalTargetCompletions = set.targetCompletions !== undefined ? set.targetCompletions : h.targetCompletions;
  const finalTargetDays = set.targetDays !== undefined ? set.targetDays : h.targetDays;
  if (finalTargetCompletions && finalTargetDays) {
    throw Object.assign(
      new Error('Only one target type is allowed: either targetCompletions or targetDays, not both'), 
      { statusCode: 400 }
    );
  }
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

async function checkHabitDependencies(userId, habitId) {
  const h = await Habit.findOne({ _id: habitId, userId });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  
  const Goal = require('../models/Goal');
  
  // Find goals that have this habit linked
  const linkedGoals = await Goal.find(
    { 'habitLinks.habitId': habitId },
    { title: 1, _id: 1 }
  ).lean();
  
  return {
    hasParents: linkedGoals.length > 0,
    linkedGoals: linkedGoals.map(g => ({ id: g._id, title: g.title }))
  };
}

async function deleteHabit(userId, habitId) {
  const h = await Habit.findOne({ _id: habitId, userId });
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  
  const Goal = require('../models/Goal');
  
  // Remove from linked goals and normalize weights
  const linkedGoals = await Goal.find({ 'habitLinks.habitId': habitId });
  for (const goal of linkedGoals) {
    // Remove the habit link
    goal.habitLinks = goal.habitLinks.filter(
      hl => hl.habitId?.toString() !== habitId.toString()
    );
    
    // Normalize weights if there are remaining subgoals or habitLinks
    const totalItems = (goal.subGoals?.length || 0) + goal.habitLinks.length;
    if (totalItems > 0) {
      const currentSubGoalWeight = (goal.subGoals || []).reduce((sum, sg) => sum + (sg.weight || 0), 0);
      const currentHabitWeight = goal.habitLinks.reduce((sum, hl) => sum + (hl.weight || 0), 0);
      const currentTotal = currentSubGoalWeight + currentHabitWeight;
      
      if (currentTotal > 0) {
        // Normalize all weights proportionally to sum to 100
        const scale = 100 / currentTotal;
        if (goal.subGoals) {
          goal.subGoals.forEach(sg => {
            sg.weight = Math.round((sg.weight || 0) * scale);
          });
        }
        goal.habitLinks.forEach(hl => {
          hl.weight = Math.round((hl.weight || 0) * scale);
        });
      }
    }
    
    await goal.save();
  }
  
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

  // Check if this is a new day being logged
  const existingLog = await HabitLog.findOne({ userId, habitId, dateKey, status: 'done' });
  const isNewDay = !existingLog && isDone;
  
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
    const previousTotalCompletions = habit.totalCompletions || 0;
    const previousTotalDays = habit.totalDays || 0;
    const update = {
      currentStreak: nextStreak,
      longestStreak: longest,
      lastLoggedDateKey: dateKey,
      totalCompletions: previousTotalCompletions + 1
    };
    
    // Increment totalDays only if this is a new day
    if (isNewDay) {
      update.totalDays = previousTotalDays + 1;
    }
    
    await Habit.updateOne({ _id: habit._id }, { $set: update });

    // Check if target has been achieved (for linked goals)
    const Goal = require('../models/Goal');
    const linkedGoals = await Goal.find({ 
      'habitLinks.habitId': habit._id,
      userId: userId
    }).select('_id title category habitLinks').lean();

    for (const goal of linkedGoals) {
      let targetAchieved = false;
      let targetType = '';
      
      // Check if targetCompletions achieved
      if (habit.targetCompletions && habit.targetCompletions > 0) {
        const wasNotAchieved = previousTotalCompletions < habit.targetCompletions;
        const nowAchieved = (previousTotalCompletions + 1) >= habit.targetCompletions;
        if (wasNotAchieved && nowAchieved) {
          targetAchieved = true;
          targetType = 'completions';
        }
      }
      
      // Check if targetDays achieved
      if (!targetAchieved && habit.targetDays && habit.targetDays > 0) {
        const newTotalDays = isNewDay ? previousTotalDays + 1 : previousTotalDays;
        const wasNotAchieved = previousTotalDays < habit.targetDays;
        const nowAchieved = newTotalDays >= habit.targetDays;
        if (wasNotAchieved && nowAchieved) {
          targetAchieved = true;
          targetType = 'days';
        }
      }

      // Log activity if target was just achieved
      if (targetAchieved) {
        try {
          const u = await User.findById(userId).select('name avatar').lean();
          await Activity.createOrUpdateGoalActivity(
            userId,
            u?.name,
            u?.avatar,
            'habit_target_achieved',
            {
              goalId: goal._id,
              goalTitle: goal.title,
              goalCategory: goal.category,
              habitId: habit._id,
              habitName: habit.name,
              targetType: targetType,
              targetValue: targetType === 'completions' ? habit.targetCompletions : habit.targetDays,
              currentValue: targetType === 'completions' ? (previousTotalCompletions + 1) : (isNewDay ? previousTotalDays + 1 : previousTotalDays)
            },
            { createNew: true } // Always create new activity
          );
        } catch (err) {
          console.error('Failed to log habit target achievement:', err);
        }
      }
    }

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
  const top = habits
    .sort((a,b) => (b.currentStreak||0) - (a.currentStreak||0))
    .slice(0, 5)
    .map(h => ({
      id: h._id,
      name: h.name,
      currentStreak: h.currentStreak || 0,
      longestStreak: h.longestStreak || 0,
      totalCompletions: h.totalCompletions || 0
    }));
  return { totals, byHabit, topHabits: top };
}

// Individual habit detailed analytics
async function getHabitAnalytics(userId, habitId, { days = 90 } = {}) {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(1, days));
  const fromKey = toDateKeyUTC(from);
  
  // Get all logs for this habit in the timeframe
  const logs = await HabitLog.find({ userId, habitId, dateKey: { $gte: fromKey } })
    .sort({ dateKey: 1 })
    .lean();
  
  // Calculate stats
  const stats = {
    totalCompletions: habit.totalCompletions || 0,
    totalDays: habit.totalDays || 0,
    currentStreak: habit.currentStreak || 0,
    longestStreak: habit.longestStreak || 0,
    targetCompletions: habit.targetCompletions || null,
    targetDays: habit.targetDays || null
  };
  
  // Calculate completion percentage
  if (stats.targetCompletions) {
    stats.completionPercentage = Math.min(100, Math.round((stats.totalCompletions / stats.targetCompletions) * 100));
  }
  if (stats.targetDays) {
    stats.daysPercentage = Math.min(100, Math.round((stats.totalDays / stats.targetDays) * 100));
  }
  
  // Timeline data for charts (grouped by date)
  const timeline = {};
  const statusCounts = { done: 0, missed: 0, skipped: 0 };
  
  logs.forEach(log => {
    timeline[log.dateKey] = {
      date: log.dateKey,
      status: log.status,
      mood: log.mood,
      note: log.note
    };
    if (statusCounts[log.status] !== undefined) {
      statusCounts[log.status]++;
    }
  });
  
  // Calculate consistency for the period
  const daysSinceStart = Math.ceil((Date.now() - new Date(habit.createdAt).getTime()) / (24*60*60*1000));
  const consistency = Math.min(100, Math.round((stats.totalDays / Math.max(1, daysSinceStart)) * 100));
  
  // Weekly breakdown (last 12 weeks)
  const weeklyData = [];
  const weeksToShow = Math.min(12, Math.ceil(days / 7));
  for (let i = weeksToShow - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - (i * 7) - 6);
    const weekEnd = new Date();
    weekEnd.setUTCDate(weekEnd.getUTCDate() - (i * 7));
    
    const weekStartKey = toDateKeyUTC(weekStart);
    const weekEndKey = toDateKeyUTC(weekEnd);
    
    const weekLogs = logs.filter(l => l.dateKey >= weekStartKey && l.dateKey <= weekEndKey && l.status === 'done');
    const uniqueDays = new Set(weekLogs.map(l => l.dateKey)).size;
    
    weeklyData.push({
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      completions: weekLogs.length,
      days: uniqueDays
    });
  }
  
  // Mood distribution
  const moodCounts = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
  logs.forEach(log => {
    if (log.mood && moodCounts[log.mood] !== undefined) {
      moodCounts[log.mood]++;
    }
  });
  
  return {
    habit: {
      _id: habit._id,
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      daysOfWeek: habit.daysOfWeek,
      createdAt: habit.createdAt,
      targetCompletions: habit.targetCompletions || null,
      targetDays: habit.targetDays || null
    },
    stats,
    consistency,
    statusCounts,
    timeline: Object.values(timeline),
    weeklyData,
    moodCounts
  };
}

module.exports = {
  createHabit,
  listHabits,
  getHabit,
  updateHabit,
  archiveHabit,
  checkHabitDependencies,
  deleteHabit,
  toggleLog,
  getHeatmap,
  getStats,
  sendReminderNotifications,
  analytics,
  getHabitAnalytics,
};


