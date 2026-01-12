const habitService = require('../services/habitService');
const pgHabitService = require('../services/pgHabitService');
const pgHabitLogService = require('../services/pgHabitLogService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');
const { sanitizeHabit, sanitizeHabitForProfile } = require('../utility/sanitizer');
const { getCurrentDateInTimezone, getDateRangeInTimezone } = require('../utility/timezone');
const { validateHabitCreation, handleValidationResponse } = require('../utility/premiumEnforcement');

exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, frequency, daysOfWeek, timezone, reminders, goalId, isPublic } = req.body;
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Habit name is required' });
    }
    
    // ✅ PREMIUM CHECK: Validate habit creation limits
    const hasReminders = Array.isArray(reminders) && reminders.length > 0;
    const validation = await validateHabitCreation(req, hasReminders);
    const errorResponse = handleValidationResponse(res, validation);
    if (errorResponse) return errorResponse;
    
    const habit = await pgHabitService.createHabit({ userId: req.user.id, name, description, frequency, daysOfWeek, timezone, reminders, goalId, isPublic });
    res.status(201).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.listHabits = async (req, res, next) => {
  try {
    // If there's a search query, use search instead
    const searchQuery = req.query.q || req.query.search;
    if (searchQuery) {
      return exports.searchHabits(req, res, next);
    }

    const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === true;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const sort = req.query.sort || 'newest';

    // Support viewing other users' habits via username query param
    const targetUsername = req.query.username;
    let targetUserId = req.user.id;
    const requestingUsername = req.user.username;
    const requestingUserId = req.user.id;
    
    // Check privacy if viewing another user's habits
    if (targetUsername && targetUsername !== requestingUsername) {
      const User = require('../models/User');
      const Follow = require('../models/Follow');

      const targetUser = await User.findOne({ username: targetUsername }).select('isPrivate areHabitsPrivate isActive _id');
      if (!targetUser || !targetUser.isActive) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if habits are private
      if (targetUser.areHabitsPrivate) {
        return res.status(403).json({
          success: false,
          message: 'This user\'s habits are private'
        });
      }
      
      // Check if profile is private and user is not following
      if (targetUser.isPrivate) {
        const isFollowing = await Follow.isFollowing(requestingUserId, String(targetUser._id));
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: 'This profile is private'
          });
        }
      }

      targetUserId = String(targetUser._id);
    }
    
    // Determine sort parameters for PostgreSQL
    let sortBy = 'updated_at';
    let sortOrder = 'DESC';
    if (sort === 'oldest') {
      sortOrder = 'ASC';
    } else if (sort === 'completion') {
      sortBy = 'total_completions';
      sortOrder = 'DESC';
    }
    
    const offset = (page - 1) * limit;
    const habits = await pgHabitService.getUserHabits({
      userId: targetUserId,
      isArchived: includeArchived ? undefined : false,
      limit,
      offset,
      sortBy,
      sortOrder
    });
    
    // Count total for pagination
    const { query } = require('../config/supabase');
    const countSql = `
      SELECT COUNT(*) as total
      FROM habits
      WHERE user_id = $1 AND is_active = true
      ${!includeArchived ? 'AND is_archived = false' : ''}
    `;
    const countResult = await query(countSql, [targetUserId]);
    const total = parseInt(countResult.rows[0].total);
    
    const result = {
      habits: habits.map(h => sanitizeHabitForProfile(h)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.searchHabits = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Search using PostgreSQL service
    const habits = await pgHabitService.searchHabits({
      searchQuery: q.trim(),
      userId,
      limit: limitNum,
      offset
    });
    
    // Count total for pagination
    const { query } = require('../config/supabase');
    const countSql = `
      SELECT COUNT(*) as total
      FROM habits
      WHERE user_id = $1 AND is_active = true AND is_archived = false
        AND (name ILIKE $2 OR description ILIKE $2)
    `;
    const countResult = await query(countSql, [userId, `%${q.trim()}%`]);
    const total = parseInt(countResult.rows[0].total);
    
    // Sanitize habits
    const sanitizedHabits = habits.map(h => sanitizeHabitForProfile(h));
    
    res.status(200).json({
      success: true,
      data: {
        habits: sanitizedHabits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) { next(error); }
};

exports.getHabit = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const habit = await pgHabitService.getHabitById(habitId, req.user.id);
    
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // ✅ Sanitize habit
    const sanitizedHabit = sanitizeHabit(habit);
    
    res.status(200).json({ success: true, data: { habit: sanitizedHabit } });
  } catch (error) { next(error); }
};

exports.updateHabit = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const habit = await pgHabitService.updateHabit(habitId, req.user.id, req.body || {});
    
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    res.status(200).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.archiveHabit = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const habit = await pgHabitService.archiveHabit(habitId, req.user.id, true);
    
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    res.status(200).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.checkHabitDependencies = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const userId = req.user.id;
    
    // Check if habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // Check for habit logs (PostgreSQL)
    const { query } = require('../config/supabase');
    const logCountSql = 'SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = $1';
    const logResult = await query(logCountSql, [habitId]);
    const logCount = parseInt(logResult.rows[0].count);
    
    // Check for activities (MongoDB)
    const Activity = require('../models/Activity');
    const activityCount = await Activity.countDocuments({ 'metadata.habitId': String(habitId) });
    
    // Check for notifications (MongoDB)
    const Notification = require('../models/Notification');
    const notificationCount = await Notification.countDocuments({ 'metadata.habitId': String(habitId) });
    
    const dependencies = {
      logs: logCount,
      activities: activityCount,
      notifications: notificationCount,
      canDelete: logCount === 0 && activityCount === 0 && notificationCount === 0
    };
    
    res.status(200).json({ success: true, data: dependencies });
  } catch (error) { next(error); }
};

exports.deleteHabit = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const deleted = await pgHabitService.deleteHabit(habitId, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    res.status(200).json({ success: true, message: 'Habit deleted' });
  } catch (error) { next(error); }
};

exports.toggleLog = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const { status, mood, journalEntryId, date } = req.body || {};
    const userId = req.user.id;
    
    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // Determine date key
    // If date is provided, use it directly (frontend calculates in user's timezone)
    // Otherwise, fallback to server UTC date (for backward compatibility)
    let dateKey;
    if (date) {
      // If date is already in YYYY-MM-DD format, use it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateKey = date;
      } else {
        // If it's a full date string, extract the date part
        dateKey = new Date(date).toISOString().split('T')[0];
      }
    } else {
      // Fallback to server time (less accurate for global users)
      dateKey = new Date().toISOString().split('T')[0];
    }
    
    // Log the habit
    const log = await pgHabitLogService.logHabit({
      userId,
      habitId,
      dateKey,
      status: status || 'done',
      mood: mood || 'neutral',
      journalEntryId
    });
    
    // Fetch updated habit to return current counts
    const updatedHabit = await pgHabitService.getHabitById(habitId);
    
    res.status(200).json({ 
      success: true, 
      data: { 
        log, 
        habit: {
          id: updatedHabit.id,
          totalCompletions: updatedHabit.totalCompletions,
          totalDays: updatedHabit.totalDays,
          currentStreak: updatedHabit.currentStreak,
          longestStreak: updatedHabit.longestStreak
        } 
      } 
    });
  } catch (error) { next(error); }
};

exports.getHeatmap = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const months = Math.min(parseInt(req.query.months) || 3, 12);
    const userId = req.user.id;
    
    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // Get user timezone
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';
    
    // Calculate date range in user's timezone (months * 30 days approximation)
    const days = months * 30;
    const { startDate: startDateKey } = getDateRangeInTimezone(days, userTimezone);
    
    // Get logs for the specified period
    const { query } = require('../config/supabase');
    
    const sql = `
      SELECT date_key, status, completion_count, mood
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3
      ORDER BY date_key ASC
    `;
    
    const result = await query(sql, [habitId, userId, startDateKey]);
    const heatmap = result.rows.map(row => ({
      dateKey: row.date_key,
      status: row.status,
      completionCount: row.completion_count,
      mood: row.mood
    }));
    
    res.status(200).json({ success: true, data: { heatmap } });
  } catch (error) { next(error); }
};

exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { query } = require('../config/supabase');
    
    // Get habit counts and stats from PostgreSQL
    const statsSql = `
      SELECT 
        COUNT(*) as total_habits,
        COUNT(*) FILTER (WHERE is_archived = false) as active_habits,
        COUNT(*) FILTER (WHERE is_archived = true) as archived_habits,
        SUM(current_streak) as total_current_streak,
        MAX(current_streak) as max_current_streak,
        SUM(longest_streak) as total_longest_streak,
        MAX(longest_streak) as max_longest_streak,
        SUM(total_completions) as total_completions,
        SUM(total_days) as total_days
      FROM habits
      WHERE user_id = $1 AND is_active = true
    `;
    
    const result = await query(statsSql, [userId]);
    const row = result.rows[0];
    
    const stats = {
      totalHabits: parseInt(row.total_habits) || 0,
      activeHabits: parseInt(row.active_habits) || 0,
      archivedHabits: parseInt(row.archived_habits) || 0,
      totalCurrentStreak: parseInt(row.total_current_streak) || 0,
      maxCurrentStreak: parseInt(row.max_current_streak) || 0,
      totalLongestStreak: parseInt(row.total_longest_streak) || 0,
      maxLongestStreak: parseInt(row.max_longest_streak) || 0,
      totalCompletions: parseInt(row.total_completions) || 0,
      totalDays: parseInt(row.total_days) || 0
    };
    
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const userId = req.user.id;
    const { query } = require('../config/supabase');
    
    // Get user timezone
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';
    
    // Get analytics for the specified period - calculate date range in user's timezone
    const { startDate: startDateKey } = getDateRangeInTimezone(days, userTimezone);
    
    const sql = `
      SELECT 
        h.id,
        h.name,
        COUNT(hl.id) as log_count,
        SUM(CASE WHEN hl.status = 'done' THEN 1 ELSE 0 END) as completions,
        SUM(CASE WHEN hl.status = 'skipped' THEN 1 ELSE 0 END) as skips,
        h.current_streak,
        h.longest_streak,
        h.total_completions
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date_key >= $2
      WHERE h.user_id = $1 AND h.is_active = true AND h.is_archived = false
      GROUP BY h.id, h.name, h.current_streak, h.longest_streak, h.total_completions
      ORDER BY completions DESC
    `;
    
    const result = await query(sql, [userId, startDateKey]);
    const analytics = {
      period: { days, startDate: startDateKey },
      habits: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        logCount: parseInt(row.log_count) || 0,
        completions: parseInt(row.completions) || 0,
        skips: parseInt(row.skips) || 0,
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        totalCompletions: row.total_completions
      }))
    };
    
    res.status(200).json({ success: true, data: { analytics } });
  } catch (error) { next(error); }
};

exports.getHabitAnalytics = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const days = Math.min(parseInt(req.query.days) || 90, 365);
    const userId = req.user.id;
    
    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // Get user timezone
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';
    
    // Calculate date range in user's timezone
    const { startDate: startDateKey, endDate: endDateKey } = getDateRangeInTimezone(days - 1, userTimezone);
    
    const { query } = require('../config/supabase');
    
    // Get logs for analytics
    const sql = `
      SELECT 
        date_key,
        status,
        completion_count,
        completion_times,
        mood
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3
      ORDER BY date_key ASC
    `;
    
    const result = await query(sql, [habitId, userId, startDateKey]);
    // Calculate analytics matching previous MongoDB implementation
    const logs = result.rows;
    const doneLogs = logs.filter(l => l.status === 'done');
    const skippedLogs = logs.filter(l => l.status === 'skipped');
    
    const completions = doneLogs.length;
    const skips = skippedLogs.length;
    
    // Use sanitizer to ensure proper field mapping
    const sanitizedHabit = sanitizeHabit(habit);
    
    // Calculate consistency based on days since creation
    const daysSinceStart = Math.ceil((Date.now() - new Date(sanitizedHabit.createdAt).getTime()) / (24*60*60*1000));
    const consistency = Math.min(100, Math.round((sanitizedHabit.totalDays / Math.max(1, daysSinceStart)) * 100));
    
    // Build timeline with completion times
    const timelineMap = {};

    logs.forEach(l => {
      timelineMap[l.date_key] = {
        date: l.date_key,
        status: l.status,
        mood: l.mood || 'neutral',
        completionCount: l.completion_count || 0,
        completionTimes: l.completion_times || []
      };
    });

    const timeline = Object.values(timelineMap);
    
    // Calculate weekly breakdown (last 12 weeks or based on days parameter)
    const weeklyData = [];
    const weeksToShow = Math.min(12, Math.ceil(days / 7));
    console.log('log to show:', logs);
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setUTCDate(weekStart.getUTCDate() - (i * 7) - 6);
      const weekEnd = new Date();
      weekEnd.setUTCDate(weekEnd.getUTCDate() - (i * 7));
      
      const weekStartKey = weekStart.toISOString().split('T')[0];
      const weekEndKey = weekEnd.toISOString().split('T')[0];
      
      // Get logs for this week
      const weekLogs = logs.filter(l => l.date_key >= weekStartKey && l.date_key <= weekEndKey);
      console.log(weekStartKey, weekEndKey);
      console.log(weekLogs);
      const weekDoneLogs = weekLogs.filter(l => l.status === 'done');
      const weekSkippedLogs = weekLogs.filter(l => l.status === 'skipped');
      
      // Total completions (sum of completion_count)
      console.log(weekDoneLogs);
      const weekCompletions = weekDoneLogs.reduce((sum, l) => sum + (l.completion_count || 1), 0);
      console.log(weekCompletions);
      // Active days (unique dates with done status)
      const activeDays = new Set(weekDoneLogs.map(l => l.date_key)).size;
      const skippedDays = new Set(weekSkippedLogs.map(l => l.date_key)).size;
      
      // Calculate expected days based on frequency, only counting days within the filter range
      let expectedDays = 0;
      const effectiveWeekStart = weekStartKey < startDateKey ? startDateKey : weekStartKey;
      const effectiveWeekEnd = weekEndKey > endDateKey ? endDateKey : weekEndKey;
      
      if (sanitizedHabit.frequency === 'daily') {
        // Count all days in the effective week range
        const startDay = new Date(effectiveWeekStart);
        const endDay = new Date(effectiveWeekEnd);
        expectedDays = Math.ceil((endDay - startDay) / (24*60*60*1000)) + 1;
      } else if (sanitizedHabit.frequency === 'weekly' && Array.isArray(sanitizedHabit.daysOfWeek) && sanitizedHabit.daysOfWeek.length > 0) {
        // Count only matching days of week within the effective range
        const startDay = new Date(effectiveWeekStart);
        const endDay = new Date(effectiveWeekEnd);
        const daysInRange = Math.ceil((endDay - startDay) / (24*60*60*1000)) + 1;
        
        for (let d = 0; d < daysInRange; d++) {
          const dayDate = new Date(startDay);
          dayDate.setUTCDate(dayDate.getUTCDate() + d);
          const dayOfWeek = dayDate.getUTCDay();
          if (sanitizedHabit.daysOfWeek.includes(dayOfWeek)) {
            expectedDays++;
          }
        }
      } else {
        expectedDays = 1;
      }
      
      const missedDays = Math.max(0, expectedDays - activeDays - skippedDays);
      
      weeklyData.push({
        weekStart: weekStartKey,
        weekEnd: weekEndKey,
        completions: weekCompletions,
        activeDays,
        skippedDays,
        missedDays,
        expectedDays
      });
    }
    
    // Mood distribution
    const moodCounts = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };
    logs.forEach(log => {
      const mood = log.mood || 'neutral';
      if (moodCounts[mood] !== undefined) {
        moodCounts[mood]++;
      }
    });
    
    // Build stats object
    const stats = {
      totalCompletions: sanitizedHabit.totalCompletions,
      totalDays: sanitizedHabit.totalDays,
      currentStreak: sanitizedHabit.currentStreak,
      longestStreak: sanitizedHabit.longestStreak,
      targetCompletions: sanitizedHabit.targetCompletions,
      targetDays: sanitizedHabit.targetDays
    };
    
    // Add completion percentage if target is set
    if (stats.targetCompletions) {
      stats.completionPercentage = Math.min(100, Math.round((stats.totalCompletions / stats.targetCompletions) * 100));
    }
    if (stats.targetDays) {
      stats.daysPercentage = Math.min(100, Math.round((stats.totalDays / stats.targetDays) * 100));
    }
    
    // Calculate total expected days and missed days for the entire filter period
    let totalExpectedDays = 0;
    weeklyData.forEach(w => {
      totalExpectedDays += w.expectedDays;
    });
    
    // Missing days = expected days in filter - (done + skipped days)
    const missed = Math.max(0, totalExpectedDays - completions - skips);
    
    // Format response to match previous MongoDB implementation
    const analytics = {
      habit: {
        _id: sanitizedHabit.id, // Keep _id for backward compatibility
        name: sanitizedHabit.name,
        description: sanitizedHabit.description,
        frequency: sanitizedHabit.frequency,
        daysOfWeek: sanitizedHabit.daysOfWeek,
        createdAt: sanitizedHabit.createdAt,
        targetCompletions: sanitizedHabit.targetCompletions,
        targetDays: sanitizedHabit.targetDays
      },
      stats,
      consistency,
      statusCounts: {
        done: completions,
        missed,
        skipped: skips
      },
      timeline,
      weeklyData,
      moodCounts
    };
    
    res.status(200).json({ success: true, data: { analytics } });
  } catch (error) { next(error); }
};

// Simple OG image for 30-day streak share
exports.generateStreakOGImage = async (req, res, next) => {
  try {
    const { createCanvas } = require('canvas');
    const habitId = req.params.id;
    const count = parseInt(req.query.count) || 30;
    const width = 1200, height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${count}-Day Streak!`, width/2, height/2 - 20);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '32px Arial';
    ctx.fillText('Keep the momentum going', width/2, height/2 + 40);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(canvas.toBuffer('image/png'));
  } catch (e) { next(e); }
};


