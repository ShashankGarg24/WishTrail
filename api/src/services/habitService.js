const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const pgHabitService = require('./pgHabitService');
const pgHabitLogService = require('./pgHabitLogService');
const pgUserService = require('./pgUserService');
const UserPreferences = require('../models/extended/UserPreferences');
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
  const user = await pgUserService.getUserById(userId);
  
  // Create habit using PostgreSQL service
  const habit = await pgHabitService.createHabit({
    userId,
    name: payload.name,
    description: payload.description || '',
    frequency: payload.frequency || 'daily',
    daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : null,
    timezone: (payload.timezone || user?.timezone || 'UTC'),
    reminders: Array.isArray(payload.reminders) ? payload.reminders : [],
    goalId: payload.goalId || null,
    isPublic: payload.isPublic !== undefined ? !!payload.isPublic : true,
    targetCompletions: payload.targetCompletions || null,
    targetDays: payload.targetDays || null
  });

  // Optional social activity sharing (disabled by default)
  const shareEnabled = String(process.env.HABIT_SHARE_ENABLED || '').toLowerCase() === 'true';
  if (shareEnabled) {
    try {
      const currentUser = await pgUserService.findById(userId);
      await Activity.createActivity(userId, currentUser?.name, currentUser?.username, currentUser?.avatar_url, 'streak_milestone', {
        // Minimal data - metadata removed
      });
    } catch (_) {}
  }

  return habit;
}

async function listHabits(userId, { includeArchived = false, page = 1, limit = 50, sort = 'newest' } = {}) {
  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;
  
  // Determine sort order
  let sortBy = 'created_at';
  let sortOrder = 'DESC';
  if (sort === 'oldest') {
    sortOrder = 'ASC';
  } else if (sort === 'completion') {
    sortBy = 'total_completions';
    sortOrder = 'DESC';
  }
  
  // Get habits from PostgreSQL
  const habits = await pgHabitService.getUserHabits({
    userId,
    limit: limitNum,
    offset,
    sortBy,
    sortOrder
  });
  
  // Get total count
  const { query } = require('../config/supabase');
  const countSql = `
    SELECT COUNT(*) FROM habits 
    WHERE user_id = $1}
  `;
  const countResult = await query(countSql, [userId]);
  const total = parseInt(countResult.rows[0].count);
  
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
  const h = await pgHabitService.getHabitById(habitId, userId);
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  return h;
}

async function updateHabit(userId, habitId, payload) {
  const h = await pgHabitService.getHabitById(habitId, userId);
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  if (h.isArchived) throw Object.assign(new Error('Habit is archived'), { statusCode: 400 });
  
  const updates = {};
  ['name','description','frequency','timezone'].forEach(k => { if (payload[k] !== undefined) updates[k] = payload[k]; });
  if (Array.isArray(payload.daysOfWeek)) updates.daysOfWeek = payload.daysOfWeek;
  if (Array.isArray(payload.reminders)) updates.reminders = payload.reminders;
  if (payload.goalId !== undefined) updates.goalId = payload.goalId || null;
  if (payload.isPublic !== undefined) updates.isPublic = !!payload.isPublic;
  if (payload.targetCompletions !== undefined) updates.targetCompletions = payload.targetCompletions || null;
  if (payload.targetDays !== undefined) updates.targetDays = payload.targetDays || null;
  
  // Validate that only one type of target is set (check both new values and existing)
  const finalTargetCompletions = updates.targetCompletions !== undefined ? updates.targetCompletions : h.targetCompletions;
  const finalTargetDays = updates.targetDays !== undefined ? updates.targetDays : h.targetDays;
  if (finalTargetCompletions && finalTargetDays) {
    throw Object.assign(
      new Error('Only one target type is allowed: either targetCompletions or targetDays, not both'), 
      { statusCode: 400 }
    );
  }
  
  // Ensure timezone is set when editing reminders if habit has no meaningful timezone
  if (Array.isArray(payload.reminders) && (updates.timezone === undefined)) {
    try {
      if (!h.timezone || h.timezone === 'UTC') {
        const u = await pgUserService.findById(userId);
        if (u?.timezone) updates.timezone = u.timezone; else if (!h.timezone) updates.timezone = 'UTC';
      }
    } catch (_) {}
  }
  
  const updated = await pgHabitService.updateHabit(habitId, userId, updates);
  return updated;
}

async function archiveHabit(userId, habitId) {
  const h = await pgHabitService.archiveHabit(habitId, userId, true);
  if (!h) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  return h;
}

async function checkHabitDependencies(userId, habitId) {
  const h = await pgHabitService.getHabitById(habitId, userId);
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
  const h = await pgHabitService.getHabitById(habitId, userId);
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
  
  // Delete habit from PostgreSQL (soft delete)
  await pgHabitService.deleteHabit(habitId, userId);
  
  // Delete habit logs from PostgreSQL
  await pgHabitLogService.deleteHabitLogs(habitId, userId);
  
  return { ok: true };
}

async function toggleLog(userId, habitId, { status = 'done', note = '', mood = 'neutral', journalEntryId = null, date = new Date() } = {}) {
  const habit = await pgHabitService.getHabitById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  if (habit.isArchived) throw Object.assign(new Error('Habit is archived'), { statusCode: 400 });

  const dateKey = toDateKeyUTC(date);
  
  let log;
  
  // Check if log already exists for this date
  const existingLog = await pgHabitLogService.getLogByDate(habitId, dateKey);
  
  if (status === 'skipped' || status === 'missed') {
    // If marking as skipped/missed, update existing log or create new one
    if (existingLog) {
      log = await pgHabitLogService.updateHabitLog(existingLog.id, userId, { status, mood });
    } else {
      // Create a new log with skipped/missed status (no completions)
      const { query } = require('../config/supabase');
      const result = await query(`
        INSERT INTO habit_logs (user_id, habit_id, date_key, status, mood, completion_count, completion_times)
        VALUES ($1, $2, $3, $4, $5, 0, ARRAY[]::timestamp[])
        RETURNING *
      `, [userId, habitId, dateKey, status, mood]);
      log = result.rows[0];
    }
  } else {
    // For 'done' status, use logHabit which handles creating/updating log and calculating streaks
    log = await pgHabitLogService.logHabit({
      userId,
      habitId,
      dateKey,
      status,
      note,
      mood,
      journalEntryId
    });
  }
  
  // Get updated habit stats after logging
  const updatedHabit = await pgHabitService.getHabitById(habitId, userId);
  
  // Check for target achievements and milestones
  if (status === 'done') {
    // Check if target has been achieved (for linked goals)
    const GoalDetails = require('../models/extended/GoalDetails');
    const linkedGoalDetails = await GoalDetails.find({ 
      'progress.breakdown.habits.habitId': habitId
    }).select('goalId progress').lean();
    
    // Get the goal details from PostgreSQL for each linked goal
    const pgGoalService = require('./pgGoalService');
    for (const goalDetail of linkedGoalDetails) {
      try {
        const goal = await pgGoalService.getGoalById(goalDetail.goalId);
        if (!goal) continue;
        
        let targetAchieved = false;
        let targetType = '';
        
        // Check if targetCompletions achieved
        if (updatedHabit.targetCompletions && updatedHabit.targetCompletions > 0) {
          if (updatedHabit.totalCompletions >= updatedHabit.targetCompletions) {
            targetAchieved = true;
            targetType = 'completions';
          }
        }
        
        // Check if targetDays achieved
        if (!targetAchieved && updatedHabit.targetDays && updatedHabit.targetDays > 0) {
          if (updatedHabit.totalDays >= updatedHabit.targetDays) {
            targetAchieved = true;
            targetType = 'days';
          }
        }

        // Log activity if target was just achieved
        if (targetAchieved) {
          try {
            // ✅ Optimized: Update all goal activities where this habit is linked in one query
            const targetCompletionTime = new Date();
            
            const updateResult = await Activity.updateMany(
              { 
                type: 'goal_activity',
                'data.updates.habitId': habitId.toString()
              },
              {
                $set: {
                  'data.updates.$[elem].habitTargetCompletedAt': targetCompletionTime,
                  'data.lastUpdateType': 'habit_target_achieved'
                }
              },
              {
                arrayFilters: [
                  { 
                    'elem.habitId': habitId.toString(),
                    'elem.habitTargetCompletedAt': null
                  }
                ]
              }
            );
          } catch (err) {
            console.error('[habitService] Failed to log habit target achievement:', err);
          }
        }
      } catch (err) {
        console.error('Failed to process linked goal for habit target:', err);
      }
    }

    // Milestones: 1, 7, 30, 100 (social sharing optional via flag)
    const shareEnabled = String(process.env.HABIT_SHARE_ENABLED || '').toLowerCase() === 'true';
    const currentStreak = updatedHabit.currentStreak || 0;
    if (shareEnabled && [1, 7, 30, 100].includes(currentStreak)) {
      try {
        const u = await pgUserService.findById(userId);
        await Activity.createActivity(userId, u?.name, u?.username, u?.avatar_url, 'streak_milestone', {
          streakCount: currentStreak
        });
      } catch (_) {}
    }
    
    // Mirror into community feed if a community item references this habit
    try {
      const CommunityItem = require('../models/CommunityItem');
      const CommunityActivity = require('../models/CommunityActivity');
      const link = await CommunityItem.findOne({ type: 'habit', sourceId: habitId, status: 'approved', isActive: true }).select('communityId').lean();
      if (link && link.communityId && [1,7,30,100].includes(currentStreak)) {
        const u = await pgUserService.findById(userId);
        await CommunityActivity.create({
          communityId: link.communityId,
          userId,
          name: u?.name,
          avatar: u?.avatar_url,
          type: 'streak_milestone',
          data: { streakCount: currentStreak, metadata: { habitId: updatedHabit.id, habitName: updatedHabit.name } }
        });
      }
    } catch (_) {}
  }

  return { log, habit: updatedHabit };
}

async function getHeatmap(userId, habitId, { months = 3 } = {}) {
  const habit = await pgHabitService.getHabitById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - months);
  const fromKey = toDateKeyUTC(from);
  
  const logs = await pgHabitLogService.getLogsByDateRange(habitId, fromKey, toDateKeyUTC(new Date()));
  
  const map = {};
  for (const l of logs) map[l.dateKey] = l.status;
  return map;
}

async function getStats(userId) {
  const habits = await pgHabitService.getUserHabits({
    userId,
    limit: 1000
  });
  
  if (!habits || habits.length === 0) {
    return { totalHabits: 0, totalCurrentStreak: 0, bestStreak: 0, avgConsistency: 0 };
  }
  
  let totalCurrentStreak = 0;
  let bestStreak = 0;
  let totalConsistency = 0;
  
  for (const habit of habits) {
    totalCurrentStreak += habit.currentStreak || 0;
    bestStreak = Math.max(bestStreak, habit.longestStreak || 0);
    const consistency = computeConsistency(habit.totalCompletions || 0, habit.createdAt);
    totalConsistency += consistency;
  }
  
  const avgConsistency = Math.round(totalConsistency / habits.length);
  
  return {
    totalHabits: habits.length,
    totalCurrentStreak,
    bestStreak,
    avgConsistency
  };
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
  // Use PostgreSQL for habits
  const habits = await pgHabitService.getUserHabits({ 
    userId, 
    limit: 1000
  });
  
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
  // Get active users from PostgreSQL
  const { query } = require('../config/supabase');
  const result = await query('SELECT id, timezone FROM users WHERE is_active = true', []);
  const users = result.rows;
  
  const jobs = [];
  for (const u of users) {
    // Check notification preferences in MongoDB
    const prefs = await UserPreferences.findOne({ userId: u.id }).select('notificationSettings').lean();
    const ns = prefs?.notificationSettings || {};
    if (ns.habits && ns.habits.enabled === false) continue;
    
    // Quiet hours removed
    const due = await dueHabitsForReminder(u.id, u.timezone || 'Asia/Kolkata', windowMinutes);
    for (const job of due) {
      const h = job.habit;
      // Skip if already done today (default true)
      const skipIfDone = ns.habits && typeof ns.habits.skipIfDone === 'boolean' ? ns.habits.skipIfDone : true;
      if (skipIfDone) {
        const todayKey = toDateKeyUTC(new Date());
        const done = await pgHabitLogService.isLoggedToday(h.id, todayKey);
        if (done) continue;
      }
      // Idempotency guard (10-min window key)
      try {
        const dateKey = toDateKeyUTC(new Date());
        const key = `habit:reminder:${String(u.id)}:${String(h.id)}:${dateKey}:${job.matchedMinutes}`;
        const exists = await redis.get(key);
        if (!exists) {
          const ttl = Math.max(600, windowMinutes * 60); // >=10min
          await redis.set(key, '1', { ex: ttl });
          const timeHHmm = `${String(Math.floor(job.matchedMinutes / 60)).padStart(2,'0')}:${String(job.matchedMinutes % 60).padStart(2,'0')}`;
          jobs.push(Notification.createHabitReminderNotification(u.id, h.id, h.name, timeHHmm));
        }
      } catch (_) {
        // If redis unavailable, fall back to sending (dedup relies on notification rules/user settings)
        const timeHHmm = `${String(Math.floor(job.matchedMinutes / 60)).padStart(2,'0')}:${String(job.matchedMinutes % 60).padStart(2,'0')}`;
        jobs.push(Notification.createHabitReminderNotification(u.id, h.id, h.name, timeHHmm));
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
  
  const logs = await pgHabitLogService.getUserHabitLogs({
    userId,
    startDate: fromKey,
    endDate: toDateKeyUTC(new Date()),
    limit: 10000
  });
  
  const totals = { done: 0, missed: 0, skipped: 0 };
  const byHabit = {};
  for (const l of logs) {
    if (l.status === 'done') totals.done++; else if (l.status === 'missed') totals.missed++; else totals.skipped++;
    if (!byHabit[l.habitId]) byHabit[l.habitId] = { done: 0, missed: 0, skipped: 0 };
    byHabit[l.habitId][l.status] = (byHabit[l.habitId][l.status] || 0) + 1;
  }
  // top streaks snapshot from PostgreSQL
  const habitsResult = await pgHabitService.getUserHabits({ 
    userId, 
    limit: 1000 
  });
  const habits = habitsResult || []; // getUserHabits returns array directly, not wrapped
  const top = habits
    .sort((a,b) => (b.currentStreak||0) - (a.currentStreak||0))
    .slice(0, 5)
    .map(h => ({
      id: h.id,
      name: h.name,
      currentStreak: h.currentStreak || 0,
      longestStreak: h.longestStreak || 0,
      totalCompletions: h.totalCompletions || 0
    }));
  return { totals, byHabit, topHabits: top };
}

// Individual habit detailed analytics
async function getHabitAnalytics(userId, habitId, { days = 90, userTimezone = 'UTC' } = {}) {
  const habit = await pgHabitService.getHabitById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
  
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(1, days));
  const fromKey = toDateKeyUTC(from);
  
  // Get all logs for this habit in the timeframe
  // Add 1 day to ensure we include today's logs regardless of timezone
  const toDate = new Date();
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const logs = await pgHabitLogService.getLogsByDateRange(habitId, fromKey, toDateKeyUTC(toDate));
  
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
  
  // Timeline data for charts (grouped by date in user's timezone)
  // Convert completion_times to user's local date for proper grouping
  const timeline = {};
  const statusCounts = { done: 0, missed: 0, skipped: 0 };
  
  logs.forEach(log => {
    // If log has completion_times, group them by user's local date
    if (log.completionTimes && log.completionTimes.length > 0) {
      log.completionTimes.forEach(completionTime => {
        // Convert UTC timestamp to user's local date
        let localDate;
        try {
          const timestamp = new Date(completionTime);
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          localDate = formatter.format(timestamp);
        } catch (err) {
          // Fallback to UTC if timezone conversion fails
          localDate = new Date(completionTime).toISOString().split('T')[0];
        }
        
        // Initialize or update timeline entry for this date
        if (!timeline[localDate]) {
          timeline[localDate] = {
            date: localDate,
            status: log.status,
            mood: log.mood,
            note: log.note,
            completionCount: 0,
            completionTimes: []
          };
        }
        
        timeline[localDate].completionCount++;
        timeline[localDate].completionTimes.push(completionTime);
      });
    } else {
      // Fallback: use date_key if no completion_times
      timeline[log.dateKey] = {
        date: log.dateKey,
        status: log.status,
        mood: log.mood,
        note: log.note,
        completionCount: log.completionCount || 0,
        completionTimes: []
      };
    }
    
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
    
    // Get all logs for this week
    const weekLogs = logs.filter(l => l.dateKey >= weekStartKey && l.dateKey <= weekEndKey);
    
    // Done logs for this week
    const doneLogs = weekLogs.filter(l => l.status === 'done');
    
    // Completions: sum of completionCount across all done logs (multiple completions per day)
    const completions = doneLogs.reduce((sum, l) => sum + (l.completionCount || 1), 0);
    
    // Active days: unique days with at least 1 done
    const activeDays = new Set(doneLogs.map(l => l.dateKey)).size;
    
    // Skipped days: unique days marked as skipped
    const skippedLogs = weekLogs.filter(l => l.status === 'skipped');
    const skippedDays = new Set(skippedLogs.map(l => l.dateKey)).size;
    
    // Calculate expected days for this week based on habit frequency
    let expectedDays = 0;
    if (habit.frequency === 'daily') {
      expectedDays = 7;
    } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0) {
      // Count how many scheduled days fall within this week
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setUTCDate(dayDate.getUTCDate() + d);
        const dayOfWeek = dayDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
        if (habit.daysOfWeek.includes(dayOfWeek)) {
          expectedDays++;
        }
      }
    } else {
      expectedDays = 1; // Default weekly once
    }
    
    // Missed days: expected - active - skipped (but not negative)
    const missedDays = Math.max(0, expectedDays - activeDays - skippedDays);
    
    weeklyData.push({
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      completions,
      activeDays,
      skippedDays,
      missedDays,
      expectedDays
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


