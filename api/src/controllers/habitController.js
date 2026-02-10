const habitService = require('../services/habitService');
const pgHabitService = require('../services/pgHabitService');
const pgHabitLogService = require('../services/pgHabitLogService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');
const pgFollowService = require('../services/pgFollowService');
const { sanitizeHabit, sanitizeHabitForProfile } = require('../utility/sanitizer');
const { getCurrentDateInTimezone, getDateRangeInTimezone } = require('../utility/timezone');
const { validateHabitCreation, handleValidationResponse } = require('../utility/premiumEnforcement');
const UserPreferences = require('../models/extended/UserPreferences');

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
      // Get user from PostgreSQL
      const targetUser = await pgUserService.getUserByUsername(targetUsername);
      if (!targetUser || !targetUser.is_active) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get privacy settings from MongoDB UserPreferences
      const targetPreferences = await UserPreferences.findOne({ userId: targetUser.id });
      const showHabits = targetPreferences?.showHabits ?? true; // Default to true if not set
      
      // Check if habits are hidden (showHabits = false means private)
      if (!showHabits) {
        return res.status(403).json({
          success: false,
          message: 'This user\'s habits are private'
        });
      }
      
      // Check if profile is private and user is not following
      if (targetUser.is_private) {
        const isFollowing = await pgFollowService.isFollowing(requestingUserId, targetUser.id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: 'This profile is private'
          });
        }
      }

      targetUserId = targetUser.id;
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
      WHERE user_id = $1
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
      WHERE user_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
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
    
    // Determine date key - always use UTC for storage
    // date_key is for indexing/querying only
    // Analytics will convert completion_times_mood to user's timezone for display
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
      // Use UTC date for storage (consistent indexing)
      dateKey = new Date().toISOString().split('T')[0];
    }
    
    // Log the habit using habitService which handles target achievements
    const result = await habitService.toggleLog(userId, habitId, {
      status: status || 'done',
      mood: mood || 'neutral',
      date: new Date(dateKey)
    });
    
    const log = result.log;
    const updatedHabit = result.habit;
    
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
    
    // Extend the query range to account for timezone differences
    // Since date_key is stored in UTC, we need to fetch 1-2 days extra
    // to ensure we capture logs that will convert to today in user's timezone
    const extendedStartDate = new Date(startDateKey);
    extendedStartDate.setUTCDate(extendedStartDate.getUTCDate() - 2);
    const extendedStartKey = extendedStartDate.toISOString().split('T')[0];
    
    // Get logs for the specified period
    const { query } = require('../config/supabase');
    
    const sql = `
      SELECT date_key, status, completion_count, completion_times_mood
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3
      ORDER BY date_key ASC
    `;
    
    const result = await query(sql, [habitId, userId, extendedStartKey]);
    
    // Convert heatmap data to user's timezone by grouping completion_times_mood
    const heatmapMap = {};
    
    result.rows.forEach(row => {
      if (row.completion_times_mood && row.completion_times_mood.length > 0) {
        // Group completions by user's local date
        row.completion_times_mood.forEach(completion => {
          let localDate;
          const completionTime = completion.timestamp || completion;
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
            localDate = new Date(completionTime).toISOString().split('T')[0];
          }
          
          if (!heatmapMap[localDate]) {
            heatmapMap[localDate] = {
              dateKey: localDate,
              status: row.status,
              completionCount: 0,
              completions: []
            };
          }
          
          heatmapMap[localDate].completionCount++;
          heatmapMap[localDate].completions.push({
            timestamp: completionTime,
            mood: completion.mood || 'neutral'
          });
        });
      } else {
        // Fallback: use date_key if no completion_times_mood
        if (!heatmapMap[row.date_key]) {
          heatmapMap[row.date_key] = {
            dateKey: row.date_key,
            status: row.status,
            completionCount: row.completion_count || 0,
            completions: []
          };
        }
      }
    });
    
    const heatmap = Object.values(heatmapMap).sort((a, b) => 
      new Date(a.dateKey) - new Date(b.dateKey)
    );
    
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
        SUM(current_streak) as total_current_streak,
        MAX(current_streak) as max_current_streak,
        SUM(longest_streak) as total_longest_streak,
        MAX(longest_streak) as max_longest_streak,
        SUM(total_completions) as total_completions,
        SUM(total_days) as total_days
      FROM habits
      WHERE user_id = $1 
    `;
    
    const result = await query(statsSql, [userId]);
    const row = result.rows[0];
    
    const stats = {
      totalHabits: parseInt(row.total_habits) || 0,
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
      WHERE h.user_id = $1
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
        completion_times_mood
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
    
    // Build timeline with completion times converted to user's timezone
    const timelineMap = {};

    logs.forEach(l => {
      // Only process completion_times_mood if status is 'done'
      // Skipped and missed days should show 0 completions
      if (l.status === 'done' && l.completion_times_mood && l.completion_times_mood.length > 0) {
        l.completion_times_mood.forEach(completion => {
          const completionTime = completion.timestamp || completion;
          const mood = completion.mood || 'neutral';
          
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
          if (!timelineMap[localDate]) {
            timelineMap[localDate] = {
              date: localDate,
              status: l.status,
              completionCount: 0,
              completionTimesMood: []
            };
          }
          
          timelineMap[localDate].completionCount++;
          timelineMap[localDate].completionTimesMood.push({
            timestamp: completionTime,
            mood: mood
          });
        });
      } else if (l.status === 'skipped' || l.status === 'missed') {
        // For skipped/missed days, show the status but with 0 completions
        // Convert date_key to user timezone if needed
        let localDate;
        try {
          // If there are completion_times_mood (before it was skipped), use first one for date
          if (l.completion_times_mood && l.completion_times_mood.length > 0) {
            const firstCompletion = l.completion_times_mood[0];
            const timestamp = new Date(firstCompletion.timestamp || firstCompletion);
            const formatter = new Intl.DateTimeFormat('en-CA', {
              timeZone: userTimezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            localDate = formatter.format(timestamp);
          } else {
            // Otherwise use the date_key as-is
            localDate = l.date_key;
          }
        } catch (err) {
          localDate = l.date_key;
        }
        
        timelineMap[localDate] = {
          date: localDate,
          status: l.status,
          completionCount: 0,
          completionTimesMood: []
        };
      }
    });

    const timeline = Object.values(timelineMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate weekly breakdown (last 12 weeks or based on days parameter)
    // Use timeline (which has dates in user's timezone) for weekly aggregation
    const weeklyData = [];
    const weeksToShow = Math.min(12, Math.ceil(days / 7));
    
    // Get current date in user's timezone to calculate week boundaries
    const now = new Date();
    let weekEndDate = new Date(now);
    
    // Try to use user's timezone for date calculation, fall back to UTC if it fails
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const todayInUserTz = formatter.format(now);
      
      // Parse the formatted date string (format should be YYYY-MM-DD)
      const parts = todayInUserTz.split('-');
      if (parts.length === 3) {
        const parsedYear = parseInt(parts[0]);
        const parsedMonth = parseInt(parts[1]);
        const parsedDay = parseInt(parts[2]);
        
        if (!isNaN(parsedYear) && !isNaN(parsedMonth) && !isNaN(parsedDay)) {
          weekEndDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay));
        }
      }
    } catch (err) {
      // Fallback to UTC if timezone conversion fails
      // weekEndDate already initialized to current date in UTC above
    }
    
    // Validate the date before proceeding
    if (isNaN(weekEndDate.getTime())) {
      return res.status(500).json({ success: false, message: 'Invalid date calculation' });
    }
    
    for (let i = weeksToShow - 1; i >= 0; i--) {
      // Calculate week boundaries
      const currentWeekEndDate = new Date(weekEndDate);
      currentWeekEndDate.setUTCDate(currentWeekEndDate.getUTCDate() - (i * 7));
      const currentWeekStartDate = new Date(currentWeekEndDate);
      currentWeekStartDate.setUTCDate(currentWeekStartDate.getUTCDate() - 6);
      
      // Validate dates before converting to ISO string
      if (isNaN(currentWeekStartDate.getTime()) || isNaN(currentWeekEndDate.getTime())) {
        continue; // Skip this week if dates are invalid
      }
      
      const weekStartKey = currentWeekStartDate.toISOString().split('T')[0];
      const weekEndKey = currentWeekEndDate.toISOString().split('T')[0];
      
      // Get timeline entries for this week (timeline dates are in user's timezone)
      const weekTimelineEntries = timeline.filter(t => t.date >= weekStartKey && t.date <= weekEndKey);
      
      // Total completions from timeline
      const weekCompletions = weekTimelineEntries.reduce((sum, t) => sum + (t.completionCount || 0), 0);
      
      // Active days (only count entries with 'done' status)
      const activeDays = weekTimelineEntries.filter(t => t.status === 'done').length;
      
      // Skipped days from original logs
      const weekSkippedLogs = logs.filter(l => 
        l.date_key >= weekStartKey && 
        l.date_key <= weekEndKey && 
        l.status === 'skipped'
      );
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
      weeklyData
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

/**
 * Get habit daily logs with pagination
 * Calculates average mood for each log based on all completions
 */
exports.getHabitLogs = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    
    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }
    
    // Get user timezone for proper date display
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';
    
    const { query } = require('../config/supabase');
    
    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2
    `;
    const countResult = await query(countSql, [habitId, userId]);
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    // Get paginated logs
    const sql = `
      SELECT 
        id,
        date_key,
        status,
        completion_count,
        completion_times_mood,
        created_at
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2
      ORDER BY date_key DESC
      LIMIT $3 OFFSET $4
    `;
    
    const result = await query(sql, [habitId, userId, limit, offset]);
    
    // Map mood values to numeric scores for averaging
    const moodScores = {
      'challenging': 1,
      'okay': 2,
      'neutral': 3,
      'good': 4,
      'great': 5
    };
    
    const moodLabels = {
      1: 'challenging',
      2: 'okay',
      3: 'neutral',
      4: 'good',
      5: 'great'
    };
    
    // Process logs with average mood calculation
    const logs = result.rows.map(log => {
      let averageMood = null;
      let completionTimesMood = [];
      
      // Process completion times and calculate average mood
      if (log.completion_times_mood && Array.isArray(log.completion_times_mood) && log.completion_times_mood.length > 0) {
        const moods = [];
        
        completionTimesMood = log.completion_times_mood.map(completion => {
          const timestamp = completion.timestamp || completion;
          const mood = completion.mood || 'neutral';
          
          // Collect mood for averaging
          if (moodScores[mood]) {
            moods.push(moodScores[mood]);
          }
          
          return {
            timestamp,
            mood
          };
        });
        
        // Calculate average mood
        if (moods.length > 0) {
          const avgScore = Math.round(moods.reduce((sum, score) => sum + score, 0) / moods.length);
          averageMood = moodLabels[avgScore] || 'neutral';
        }
      }
      
      return {
        id: log.id,
        dateKey: log.date_key,
        status: log.status,
        completionCount: log.completion_count || 0,
        completionTimesMood,
        averageMood,
        createdAt: log.created_at
      };
    });
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + logs.length < total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


