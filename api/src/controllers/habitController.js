const habitService = require('../services/habitService');
const pgHabitService = require('../services/pgHabitService');
const pgHabitLogService = require('../services/pgHabitLogService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');
const pgFollowService = require('../services/pgFollowService');
const { sanitizeHabit, sanitizeHabitForProfile } = require('../utility/sanitizer');
const { getCurrentDateInTimezone, getDateKeyInTimezone, getDateRangeInTimezone, shiftDateKey } = require('../utility/timezone');
const { habitCompletion, isScheduledOccurrence, scheduledOccurrences, percentagePointTrend } = require('../utility/metrics');
const { validateHabitCreation, handleValidationResponse } = require('../utility/premiumEnforcement');
const UserPreferences = require('../models/extended/UserPreferences');
const { HABIT_CATEGORIES, normalizeHabitCategory } = require('../constants/habitCategories');

const MAX_HABIT_TITLE_CHARS = 100;
const MAX_HABIT_DESC_CHARS = 200;
const MIN_HABIT_YEAR = 2020;
const MAX_HABIT_YEAR = 2100;

const parseHabitYear = value => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_HABIT_YEAR && parsed <= MAX_HABIT_YEAR ? parsed : null;
};

exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, category, year, frequency, daysOfWeek, reminders, goalId, isPublic, dailyTargetCount, targetDays } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedDescription = typeof description === 'string' ? description.trimEnd() : '';
    if (!normalizedName) {
      return res.status(400).json({ success: false, message: 'Habit name is required' });
    }
    if (normalizedName.length > MAX_HABIT_TITLE_CHARS) {
      return res.status(400).json({ success: false, message: `Habit name cannot exceed ${MAX_HABIT_TITLE_CHARS} characters` });
    }
    if (normalizedDescription.length > MAX_HABIT_DESC_CHARS) {
      return res.status(400).json({ success: false, message: `Description cannot exceed ${MAX_HABIT_DESC_CHARS} characters` });
    }
    const normalizedYear = year == null ? new Date().getFullYear() : parseHabitYear(year);
    if (!normalizedYear) {
      return res.status(400).json({ success: false, message: `Year must be between ${MIN_HABIT_YEAR} and ${MAX_HABIT_YEAR}` });
    }

    // ✅ PREMIUM CHECK: Validate habit creation limits
    const validation = await validateHabitCreation(req, reminders);
    const errorResponse = handleValidationResponse(res, validation);
    if (errorResponse) return errorResponse;

    if (category != null && !HABIT_CATEGORIES.includes(String(category).trim().toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid habit category' });
    }
    const habit = await pgHabitService.createHabit({ userId: req.user.id, name: normalizedName, description: normalizedDescription, category: normalizeHabitCategory(category), year: normalizedYear, frequency, daysOfWeek, reminders, goalId, isPublic, dailyTargetCount, targetDays });
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
    const year = req.query.year == null ? null : parseHabitYear(req.query.year);
    if (req.query.year != null && !year) {
      return res.status(400).json({ success: false, message: `Year must be between ${MIN_HABIT_YEAR} and ${MAX_HABIT_YEAR}` });
    }

    // Support viewing other users' habits via username query param
    const targetUsername = req.query.username;
    let targetUserId = req.user.id;
    let targetUser = null;
    const requestingUsername = req.user.username;
    const requestingUserId = req.user.id;

    // Check privacy if viewing another user's habits
    if (targetUsername && targetUsername !== requestingUsername) {
      // Get user from PostgreSQL
      targetUser = await pgUserService.getUserByUsername(targetUsername);
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
    } else if (sort === 'recent_logged') {
      sortBy = 'recent_logged';
    }

    const offset = (page - 1) * limit;
    const habits = await pgHabitService.getUserHabits({
      userId: targetUserId,
      year,
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
      ${year ? 'AND year = $2' : ''}
      ${sort === 'recent_logged' ? 'AND EXISTS (SELECT 1 FROM habit_logs hl WHERE hl.habit_id = habits.id AND hl.user_id = habits.user_id)' : ''}
    `;
    const countResult = await query(countSql, year ? [targetUserId, year] : [targetUserId]);
    const total = parseInt(countResult.rows[0].total);

    // Attach today's log status to each habit (use client-supplied local date if provided)
    const today = req.query.today || new Date().toISOString().slice(0, 10);
    let todayStatusMap = {};
    let todayCompletionCountMap = {};
    let weeklyCompletedDaysMap = {};
    let weeklyCompletionsMap = {};
    let recentDoneDaysMap = {};
    let previousDoneDaysMap = {};
    if (habits.length > 0) {
      const todayDate = new Date(`${today}T12:00:00.000Z`);
      const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
      const weekStartDate = new Date(todayDate);
      weekStartDate.setUTCDate(weekStartDate.getUTCDate() - mondayOffset);
      const weekStart = weekStartDate.toISOString().slice(0, 10);
      const recentStartDate = new Date(todayDate);
      recentStartDate.setUTCDate(recentStartDate.getUTCDate() - 6);
      const recentStart = recentStartDate.toISOString().slice(0, 10);
      const previousEndDate = new Date(recentStartDate);
      previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);
      const previousEnd = previousEndDate.toISOString().slice(0, 10);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setUTCDate(previousStartDate.getUTCDate() - 6);
      const previousStart = previousStartDate.toISOString().slice(0, 10);
      const [todayLogsResult, weeklyLogsResult, recentLogsResult] = await Promise.all([
        query(
          `SELECT habit_id, status, completion_count FROM habit_logs WHERE user_id = $1 AND date_key = $2`,
          [targetUserId, today]
        ),
        query(
          `SELECT hl.habit_id,
                  COUNT(DISTINCT hl.date_key) FILTER (
                    WHERE hl.status = 'done' AND hl.completion_count >= COALESCE(h.daily_target_count, 1)
                  )::int AS completed_days,
                  COALESCE(SUM(hl.completion_count) FILTER (WHERE hl.status = 'done'), 0)::int AS weekly_completions
           FROM habit_logs hl
           INNER JOIN habits h ON h.id = hl.habit_id
           WHERE hl.user_id = $1 AND hl.date_key >= $2 AND hl.date_key <= $3
           GROUP BY hl.habit_id`,
          [targetUserId, weekStart, today]
        ),
        query(
          `SELECT hl.habit_id,
                  COUNT(DISTINCT hl.date_key) FILTER (
                    WHERE hl.status = 'done'
                      AND hl.completion_count >= COALESCE(h.daily_target_count, 1)
                      AND hl.date_key >= $2 AND hl.date_key <= $3
                  )::int AS recent_done_days,
                  COUNT(DISTINCT hl.date_key) FILTER (
                    WHERE hl.status = 'done'
                      AND hl.completion_count >= COALESCE(h.daily_target_count, 1)
                      AND hl.date_key >= $4 AND hl.date_key <= $5
                  )::int AS previous_done_days
           FROM habit_logs hl
           INNER JOIN habits h ON h.id = hl.habit_id
           WHERE hl.user_id = $1 AND hl.date_key >= $4 AND hl.date_key <= $3
           GROUP BY hl.habit_id`,
          [targetUserId, recentStart, today, previousStart, previousEnd]
        )
      ]);
      for (const row of todayLogsResult.rows) {
        todayStatusMap[row.habit_id] = row.status;
        todayCompletionCountMap[row.habit_id] = row.completion_count || 0;
      }
      for (const row of weeklyLogsResult.rows) {
        weeklyCompletedDaysMap[row.habit_id] = Number(row.completed_days) || 0;
        weeklyCompletionsMap[row.habit_id] = Number(row.weekly_completions) || 0;
      }
      for (const row of recentLogsResult.rows) {
        recentDoneDaysMap[row.habit_id] = Number(row.recent_done_days) || 0;
        previousDoneDaysMap[row.habit_id] = Number(row.previous_done_days) || 0;
      }
    }

    const todayDate = new Date(`${today}T12:00:00.000Z`);
    const recentStartDate = new Date(todayDate);
    recentStartDate.setUTCDate(recentStartDate.getUTCDate() - 6);
    const recentStart = recentStartDate.toISOString().slice(0, 10);
    const previousEndDate = new Date(recentStartDate);
    previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);
    const previousEnd = previousEndDate.toISOString().slice(0, 10);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setUTCDate(previousStartDate.getUTCDate() - 6);
    const previousStart = previousStartDate.toISOString().slice(0, 10);
    const userTimezone = targetUser?.timezone || req.user.timezone || 'UTC';

    const result = {
      habits: habits.map(h => {
        const sh = sanitizeHabitForProfile(h);
        // Expire a stored streak only when a scheduled occurrence has actually
        // passed. Calendar gaps must not break custom/weekly habits.
        try {
          const lastKey = sh.lastLoggedDateKey;
          if (!lastKey) {
            sh.currentStreak = 0;
          } else {
            for (let dateKey = shiftDateKey(lastKey, 1); dateKey < today; dateKey = shiftDateKey(dateKey, 1)) {
              if (isScheduledOccurrence(sh, dateKey)) {
                sh.currentStreak = 0;
                break;
              }
            }
            if (todayStatusMap[h.id] === 'skipped') sh.currentStreak = 0;
          }
        } catch (err) { /* ignore parsing errors and keep existing streak */ }

        const todayIsPending = isScheduledOccurrence(sh, today) && !todayStatusMap[h.id];
        const recentExpected = Math.max(
          0,
          scheduledOccurrences(sh, recentStart, today, userTimezone) - (todayIsPending ? 1 : 0)
        );
        const previousExpected = scheduledOccurrences(sh, previousStart, previousEnd, userTimezone);
        const recentCompletion = habitCompletion({ expected: recentExpected, done: recentDoneDaysMap[h.id] || 0 });
        const previousCompletion = habitCompletion({ expected: previousExpected, done: previousDoneDaysMap[h.id] || 0 });

        return {
          ...sh,
          ...(sort === 'recent_logged' ? { lastLoggedAt: h.lastLoggedAt } : {}),
          todayStatus: todayStatusMap[h.id] === 'done' && (todayCompletionCountMap[h.id] || 0) < Math.max(1, Number(sh.dailyTargetCount || 1))
            ? 'partial'
            : (todayStatusMap[h.id] || null),
          todayCompletionCount: todayCompletionCountMap[h.id] || 0,
          weeklyCompletedDays: weeklyCompletedDaysMap[h.id] || 0,
          weeklyCompletions: weeklyCompletionsMap[h.id] || 0,
          last7ExpectedDays: recentExpected,
          last7CompletedDays: recentCompletion.done,
          last7CompletionRate: recentCompletion.percentage,
          last7TrendPoints: previousExpected > 0
            ? percentagePointTrend(recentCompletion.percentage, previousCompletion.percentage)
            : null
        };
      }),
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
    const year = req.query.year == null ? null : parseHabitYear(req.query.year);
    if (req.query.year != null && !year) {
      return res.status(400).json({ success: false, message: `Year must be between ${MIN_HABIT_YEAR} and ${MAX_HABIT_YEAR}` });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Search using PostgreSQL service
    const habits = await pgHabitService.searchHabits({
      searchQuery: q.trim(),
      userId,
      year,
      limit: limitNum,
      offset
    });

    // Count total for pagination
    const { query } = require('../config/supabase');
    const countSql = `
      SELECT COUNT(*) as total
      FROM habits
      WHERE user_id = $1 AND (name ILIKE $2 OR description ILIKE $2 OR category ILIKE $2)
      ${year ? 'AND year = $3' : ''}
    `;
    const countResult = await query(countSql, year ? [userId, `%${q.trim()}%`, year] : [userId, `%${q.trim()}%`]);
    const total = parseInt(countResult.rows[0].total);

    // Attach today's log status
    const today = req.query.today || new Date().toISOString().slice(0, 10);
    let todayStatusMap = {};
    let todayCompletionCountMap = {};
    if (habits.length > 0) {
      const todayLogsResult = await query(
        `SELECT habit_id, status, completion_count FROM habit_logs WHERE user_id = $1 AND date_key = $2`,
        [userId, today]
      );
      for (const row of todayLogsResult.rows) {
        todayStatusMap[row.habit_id] = row.status;
        todayCompletionCountMap[row.habit_id] = row.completion_count || 0;
      }
    }

    const sanitizedHabits = habits.map(h => {
      const sh = sanitizeHabitForProfile(h);
      try {
        const lastKey = sh.lastLoggedDateKey;
        const todayKey = today;
        if (!lastKey) {
          sh.currentStreak = 0;
        } else {
          const lastDate = new Date(lastKey + 'T00:00:00Z');
          const tDate = new Date(todayKey + 'T00:00:00Z');
          const daysSince = Math.floor((tDate - lastDate) / (1000 * 60 * 60 * 24));
          if (daysSince > 1) sh.currentStreak = 0;
        }
      } catch (err) { /* ignore parsing errors */ }

      return {
        ...sh,
        todayStatus: todayStatusMap[h.id] === 'done' && (todayCompletionCountMap[h.id] || 0) < Math.max(1, Number(sh.dailyTargetCount || 1))
          ? 'partial'
          : (todayStatusMap[h.id] || null),
        todayCompletionCount: todayCompletionCountMap[h.id] || 0
      };
    });

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

    const updates = { ...(req.body || {}) };
    if (typeof updates.name === 'string') {
      updates.name = updates.name.trim();
      if (!updates.name) {
        return res.status(400).json({ success: false, message: 'Habit name is required' });
      }
      if (updates.name.length > MAX_HABIT_TITLE_CHARS) {
        return res.status(400).json({ success: false, message: `Habit name cannot exceed ${MAX_HABIT_TITLE_CHARS} characters` });
      }
    }
    if (typeof updates.description === 'string') {
      updates.description = updates.description.trimEnd();
      if (updates.description.length > MAX_HABIT_DESC_CHARS) {
        return res.status(400).json({ success: false, message: `Description cannot exceed ${MAX_HABIT_DESC_CHARS} characters` });
      }
    }
    if (updates.category !== undefined) {
      const requestedCategory = String(updates.category || '').trim().toUpperCase();
      if (!HABIT_CATEGORIES.includes(requestedCategory)) {
        return res.status(400).json({ success: false, message: 'Invalid habit category' });
      }
      updates.category = requestedCategory;
    }
    if (updates.year !== undefined) {
      const normalizedYear = parseHabitYear(updates.year);
      if (!normalizedYear) {
        return res.status(400).json({ success: false, message: `Year must be between ${MIN_HABIT_YEAR} and ${MAX_HABIT_YEAR}` });
      }
      updates.year = normalizedYear;
    }

    if (Array.isArray(updates.reminders)) {
      const validation = await validateHabitCreation(req, updates.reminders);
      const errorResponse = handleValidationResponse(res, validation);
      if (errorResponse) return errorResponse;
    }

    const habit = await pgHabitService.updateHabit(habitId, req.user.id, updates);

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

    const archived = req.body?.archived !== false;
    const habit = await pgHabitService.archiveHabit(habitId, req.user.id, archived);

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

    const userId = req.user.id;

    // Verify ownership
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // 1. Remove habitId from all GoalDetails progress breakdown (MongoDB)
    const GoalDetails = require('../models/extended/GoalDetails');
    await GoalDetails.updateMany(
      { 'progress.breakdown.habits.habitId': String(habitId) },
      { $pull: { 'progress.breakdown.habits': { habitId: String(habitId) } } }
    );

    // 2. Delete related Activity + Notification records (MongoDB)
    const Activity     = require('../models/Activity');
    const Notification = require('../models/Notification');
    await Promise.all([
      Activity.deleteMany({ 'data.habitId': String(habitId) }),
      Notification.deleteMany({ 'data.habitId': String(habitId) }),
    ]);

    // 3. Delete all habit logs from PostgreSQL (bulk delete by habit_id)
    const { query: pgQuery } = require('../config/supabase');
    await pgQuery('DELETE FROM habit_logs WHERE habit_id = $1 AND user_id = $2', [habitId, userId]);

    // 4. Hard-delete the habit row from PostgreSQL
    await pgHabitService.deleteHabit(habitId, userId);

    res.status(200).json({ success: true, message: 'Habit deleted' });
  } catch (error) { next(error); }
};

exports.toggleLog = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id);
    if (!habitId || isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }

    const { status, mood, date } = req.body || {};
    const completionCount = status === 'skipped' || status === 'missed'
      ? 0
      : Math.min(100, Math.max(1, parseInt(req.body?.count, 10) || 1));
    const userId = req.user.id;
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';

    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // date_key is the user's local calendar day. Completion timestamps remain UTC.
    let dateKey;
    if (date) {
      // If date is already in YYYY-MM-DD format, use it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateKey = date;
      } else {
        dateKey = getDateKeyInTimezone(date, userTimezone);
      }
    } else {
      dateKey = getCurrentDateInTimezone(userTimezone);
    }

    // Log the habit using habitService which handles target achievements
    const result = await habitService.toggleLog(userId, habitId, {
      status: status || 'done',
      mood: mood || 'neutral',
      completionCount,
      dateKey
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

    const userId = req.user.id;

    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // Get user timezone
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';

    // ✅ PREMIUM CHECK: Enforce analytics history limit based on premium status
    const { getFeatureLimits } = require('../config/premiumFeatures');
    const analyticsLimits = getFeatureLimits('analytics', pgUser?.premium_expires_at);
    const maxHistoryDays = analyticsLimits.maxHistoryDays || 60;

    // Support days-based filter; fallback to months (legacy)
    const requestedDays = parseInt(req.query.days);
    const months = Math.min(parseInt(req.query.months) || 3, 12);
    const rangeDays = !isNaN(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, maxHistoryDays)
      : Math.min(months * 30, maxHistoryDays);

    // Calculate requested date range in user's timezone
    const { startDate: requestedStartDateKey, endDate: endDateKey } = getDateRangeInTimezone(rangeDays - 1, userTimezone);

    // Clamp range start to habit creation date in user's timezone
    let habitCreatedDateKey = requestedStartDateKey;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      habitCreatedDateKey = formatter.format(new Date(habit.created_at || habit.createdAt));
    } catch (err) {
      habitCreatedDateKey = new Date(habit.created_at || habit.createdAt).toISOString().split('T')[0];
    }

    const startDateKey = requestedStartDateKey > habitCreatedDateKey
      ? requestedStartDateKey
      : habitCreatedDateKey;

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
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3 AND date_key <= $4
      ORDER BY date_key ASC
    `;

    const result = await query(sql, [habitId, userId, extendedStartKey, endDateKey]);

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

    const heatmap = Object.values(heatmapMap)
      .filter(entry => entry.dateKey >= startDateKey && entry.dateKey <= endDateKey)
      .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));

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
    const userId = req.user.id;
    const { query } = require('../config/supabase');

    // Get user timezone + premium status
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';

    // ✅ PREMIUM CHECK: Enforce analytics history limit based on premium status
    const { getFeatureLimits } = require('../config/premiumFeatures');
    const analyticsLimits = getFeatureLimits('analytics', pgUser?.premium_expires_at);
    const maxHistoryDays = analyticsLimits.maxHistoryDays || 60;
    const days = Math.min(parseInt(req.query.days) || 30, maxHistoryDays);

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

    const userId = req.user.id;

    // Get user timezone + premium status
    const pgUser = await pgUserService.getUserById(userId);
    const userTimezone = pgUser?.timezone || 'UTC';

    // ✅ PREMIUM CHECK: Enforce analytics history limit based on premium status
    const { getFeatureLimits } = require('../config/premiumFeatures');
    const analyticsLimits = getFeatureLimits('analytics', pgUser?.premium_expires_at);
    const maxHistoryDays = analyticsLimits.maxHistoryDays || 60;
    const days = Math.min(parseInt(req.query.days) || 60, maxHistoryDays);

    // Verify habit exists and belongs to user
    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // Calculate requested date range in user's timezone
    const { startDate: requestedStartDateKey, endDate: endDateKey } = getDateRangeInTimezone(days - 1, userTimezone);

    // Clamp range start to habit creation date in user's timezone
    let habitCreatedDateKey = requestedStartDateKey;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      habitCreatedDateKey = formatter.format(new Date(habit.created_at || habit.createdAt));
    } catch (err) {
      habitCreatedDateKey = new Date(habit.created_at || habit.createdAt).toISOString().split('T')[0];
    }

    const startDateKey = requestedStartDateKey > habitCreatedDateKey
      ? requestedStartDateKey
      : habitCreatedDateKey;

    const { query } = require('../config/supabase');

    // Get logs for analytics
    const sql = `
      SELECT 
        date_key,
        status,
        completion_count,
        completion_times_mood
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3 AND date_key <= $4
      ORDER BY date_key ASC
    `;

    const result = await query(sql, [habitId, userId, startDateKey, endDateKey]);
    // Calculate analytics matching previous MongoDB implementation
    const logs = result.rows;
    const sanitizedHabit = sanitizeHabit(habit);
    const dailyTargetCount = Math.max(1, Number(habit.daily_target_count || habit.dailyTargetCount || 1));
    const scheduledLogs = logs.filter(log => isScheduledOccurrence(sanitizedHabit, String(log.date_key).slice(0, 10)));
    const doneLogs = scheduledLogs.filter(log => log.status === 'done' && Number(log.completion_count || 0) >= dailyTargetCount);
    const partialLogs = scheduledLogs.filter(log => log.status === 'done' && Number(log.completion_count || 0) < dailyTargetCount);
    const skippedLogs = scheduledLogs.filter(log => log.status === 'skipped');

    const completions = doneLogs.length;
    const skips = skippedLogs.length;
    const totalPeriodCompletions = scheduledLogs
      .filter(log => log.status === 'done')
      .reduce((sum, log) => sum + Number(log.completion_count || 0), 0);

    // Keep every completion attached to its one canonical daily log. Individual
    // timestamps are used for time-of-day insights, not for changing the day.
    const timelineMap = {};

    logs.forEach(l => {
      const dateKey = String(l.date_key).slice(0, 10);
      const entries = Array.isArray(l.completion_times_mood)
        ? l.completion_times_mood.map(completion => ({
          timestamp: completion?.timestamp || completion,
          mood: completion?.mood || 'neutral'
        }))
        : [];
      timelineMap[dateKey] = {
        date: dateKey,
        status: l.status === 'done'
          ? (Number(l.completion_count || 0) >= dailyTargetCount ? 'done' : 'partial')
          : l.status,
        scheduled: isScheduledOccurrence(sanitizedHabit, dateKey),
        completionCount: l.status === 'done' ? Number(l.completion_count || entries.length || 0) : 0,
        completionTimesMood: l.status === 'done' ? entries : []
      };
    });

    const pendingDateKeys = new Set();
    for (let dateKey = startDateKey; dateKey <= endDateKey; dateKey = shiftDateKey(dateKey, 1)) {
      if (!isScheduledOccurrence(sanitizedHabit, dateKey) || timelineMap[dateKey]) continue;
      const isToday = dateKey === endDateKey;
      if (isToday) pendingDateKeys.add(dateKey);
      timelineMap[dateKey] = {
        date: dateKey,
        status: isToday ? 'pending' : 'missed',
        scheduled: true,
        completionCount: 0,
        completionTimesMood: []
      };
    }

    const timeline = Object.values(timelineMap)
      .filter(t => t.date >= startDateKey && t.date <= endDateKey)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate weekly breakdown (last 12 weeks or based on days parameter)
    // Use timeline (which has dates in user's timezone) for weekly aggregation
    const weeklyData = [];
    const effectiveRangeDays = Math.max(
      1,
      Math.ceil((new Date(endDateKey) - new Date(startDateKey)) / (24 * 60 * 60 * 1000)) + 1
    );
    const weeksToShow = Math.min(12, Math.ceil(effectiveRangeDays / 7));

    // Anchor weekly breakdown to effective range end (user timezone)
    let weekEndDate = new Date(`${endDateKey}T00:00:00.000Z`);

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

      const effectiveWeekStart = weekStartKey < startDateKey ? startDateKey : weekStartKey;
      const effectiveWeekEnd = weekEndKey > endDateKey ? endDateKey : weekEndKey;

      if (effectiveWeekStart > effectiveWeekEnd) {
        continue;
      }

      const weekLogs = scheduledLogs.filter(log => {
        const dateKey = String(log.date_key).slice(0, 10);
        return dateKey >= effectiveWeekStart && dateKey <= effectiveWeekEnd;
      });
      const weekCompletions = weekLogs
        .filter(log => log.status === 'done')
        .reduce((sum, log) => sum + Number(log.completion_count || 0), 0);
      const activeDays = weekLogs.filter(log => log.status === 'done' && Number(log.completion_count || 0) >= dailyTargetCount).length;
      const partialDays = weekLogs.filter(log => log.status === 'done' && Number(log.completion_count || 0) < dailyTargetCount).length;
      const weekSkippedLogs = weekLogs.filter(log => log.status === 'skipped');
      const skippedDays = new Set(weekSkippedLogs.map(l => l.date_key)).size;

      const pendingDays = [...pendingDateKeys].filter(dateKey => dateKey >= effectiveWeekStart && dateKey <= effectiveWeekEnd).length;
      const expectedDays = Math.max(0, scheduledOccurrences(sanitizedHabit, effectiveWeekStart, effectiveWeekEnd, userTimezone) - pendingDays);
      const missedDays = Math.max(0, expectedDays - activeDays - partialDays - skippedDays);

      weeklyData.push({
        weekStart: effectiveWeekStart,
        weekEnd: effectiveWeekEnd,
        completions: weekCompletions,
        activeDays,
        partialDays,
        skippedDays,
        missedDays,
        expectedDays,
        completionRate: expectedDays > 0 ? Math.round((activeDays / expectedDays) * 100) : 0
      });
    }

    // Recalculate schedule-aware streaks for the detail response so habits
    // created before this analytics fix do not keep displaying stale values.
    const streakInfo = await pgHabitService.calculateStreak(habitId, endDateKey);

    // Build stats object
    const stats = {
      totalCompletions: sanitizedHabit.totalCompletions,
      totalDays: streakInfo.totalScheduledDays ?? sanitizedHabit.totalDays,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      dailyTargetCount: sanitizedHabit.dailyTargetCount,
      targetDays: sanitizedHabit.targetDays
    };

    // Add completion percentage if target is set
    if (stats.targetDays) {
      stats.daysPercentage = Math.min(100, Math.round((stats.totalDays / stats.targetDays) * 100));
    }

    const totalExpectedDays = Math.max(0, scheduledOccurrences(sanitizedHabit, startDateKey, endDateKey, userTimezone) - pendingDateKeys.size);

    const periodCompletion = habitCompletion({ expected: totalExpectedDays, done: completions, skipped: skips });
    const consistency = periodCompletion.percentage;
    const attemptedDays = completions + partialLogs.length;
    const targetHitRate = attemptedDays > 0 ? Math.round((completions / attemptedDays) * 100) : 0;
    const averageCompletionsPerScheduledDay = totalExpectedDays > 0
      ? Math.round((totalPeriodCompletions / totalExpectedDays) * 10) / 10
      : 0;
    const missedDays = Math.max(0, totalExpectedDays - completions - partialLogs.length - skips);
    const periodLength = Math.max(1, Math.round((new Date(`${endDateKey}T12:00:00Z`) - new Date(`${startDateKey}T12:00:00Z`)) / 86400000) + 1);
    const previousEnd = new Date(`${startDateKey}T12:00:00Z`);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - (periodLength - 1));
    const previousStartKey = previousStart.toISOString().slice(0, 10);
    const previousEndKey = previousEnd.toISOString().slice(0, 10);
    const previousResult = await query(
      `SELECT date_key, status, completion_count
       FROM habit_logs
       WHERE habit_id = $1
         AND user_id = $2
         AND date_key >= $3
         AND date_key <= $4`,
      [habitId, userId, previousStartKey, previousEndKey]
    );
    const previousCounts = previousResult.rows.reduce((counts, row) => {
      const dateKey = String(row.date_key).slice(0, 10);
      if (!isScheduledOccurrence(sanitizedHabit, dateKey)) return counts;
      if (row.status === 'done' && Number(row.completion_count || 0) < dailyTargetCount) return counts;
      counts[row.status] = (counts[row.status] || 0) + 1;
      return counts;
    }, {});
    const previousExpected = scheduledOccurrences(sanitizedHabit, previousStartKey, previousEndKey, userTimezone);
    const previousCompletion = habitCompletion({ expected: previousExpected, done: previousCounts.done, skipped: previousCounts.skipped });
    const trendPoints = previousExpected > 0 ? percentagePointTrend(consistency, previousCompletion.percentage) : null;

    // Format response to match previous MongoDB implementation
    const analytics = {
      rangeStart: startDateKey,
      rangeEnd: endDateKey,
      habit: {
        _id: sanitizedHabit.id, // Keep _id for backward compatibility
        name: sanitizedHabit.name,
        description: sanitizedHabit.description,
        frequency: sanitizedHabit.frequency,
        daysOfWeek: sanitizedHabit.daysOfWeek,
        createdAt: sanitizedHabit.createdAt,
        dailyTargetCount: sanitizedHabit.dailyTargetCount,
        targetDays: sanitizedHabit.targetDays
      },
      stats,
      consistency,
      trendPoints,
      followThroughRate: periodCompletion.followThroughRate,
      targetHitRate,
      averageCompletionsPerScheduledDay,
      statusCounts: {
        done: periodCompletion.done,
        partial: partialLogs.length,
        missed: missedDays,
        pending: pendingDateKeys.size,
        skipped: periodCompletion.skipped,
        expected: periodCompletion.expected,
        activeDays: new Set(doneLogs.map(log => log.date_key)).size
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
    ctx.fillText(`🔥 ${count}-Day Streak!`, width / 2, height / 2 - 20);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '32px Arial';
    ctx.fillText('Keep the momentum going', width / 2, height / 2 + 40);
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
    const requestedDays = parseInt(req.query.days, 10);
    // Log history is independently paginated and is not constrained by the
    // Analytics timeframe/retention selector.
    const days = Math.min(Math.max(Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : 36500, 1), 36500);
    const { startDate: startDateKey } = getDateRangeInTimezone(days - 1, userTimezone);

    const { query } = require('../config/supabase');

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $3
    `;
    const countResult = await query(countSql, [habitId, userId, startDateKey]);
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
      WHERE habit_id = $1 AND user_id = $2 AND date_key >= $5
      ORDER BY date_key DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(sql, [habitId, userId, limit, offset, startDateKey]);

    let targetCompletedDate = null;
    const targetDays = Number(habit.targetDays || habit.target_days || 0);
    if (targetDays > 0) {
      const dailyTargetCount = Math.max(1, Number(habit.dailyTargetCount || habit.daily_target_count || 1));
      const targetResult = await query(
        `SELECT date_key
         FROM habit_logs
         WHERE habit_id = $1
           AND user_id = $2
           AND status = 'done'
           AND completion_count >= $3
         ORDER BY date_key ASC
         OFFSET $4 LIMIT 1`,
        [habitId, userId, dailyTargetCount, targetDays - 1]
      );
      targetCompletedDate = targetResult.rows[0]?.date_key || null;
    }

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
        targetCompletedDate,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + logs.length < total,
          days
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update one completion entry (time + mood) in a habit daily log
 */
exports.updateHabitLogCompletionEntry = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id, 10);
    const logId = parseInt(req.params.logId, 10);
    const completionIndex = parseInt(req.params.completionIndex, 10);

    if (!habitId || Number.isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }
    if (!logId || Number.isNaN(logId)) {
      return res.status(400).json({ success: false, message: 'Invalid log ID' });
    }
    if (Number.isNaN(completionIndex) || completionIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid completion index' });
    }

    const userId = req.user.id;
    const { timestamp, mood } = req.body || {};

    if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid timestamp is required' });
    }

    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const log = await pgHabitLogService.updateCompletionEntry(
      habitId,
      logId,
      userId,
      completionIndex,
      { timestamp, mood }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: 'Habit log entry not found' });
    }

    res.json({
      success: true,
      data: { log }
    });
  } catch (error) {
    next(error);
  }
};

exports.replaceHabitLog = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id, 10);
    const logId = parseInt(req.params.logId, 10);
    if (!habitId || !logId) return res.status(400).json({ success: false, message: 'Invalid habit log' });

    const habit = await pgHabitService.getHabitById(habitId, req.user.id);
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const status = req.body?.status === 'skipped' ? 'skipped' : 'done';
    const count = status === 'done' ? Math.min(100, Math.max(1, parseInt(req.body?.count, 10) || 1)) : 0;
    const mood = ['great', 'good', 'okay', 'challenging', 'neutral'].includes(req.body?.mood) ? req.body.mood : 'neutral';
    const sourceEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const dateKey = String(req.body?.dateKey || '').slice(0, 10);
    const entries = Array.from({ length: count }, (_, index) => ({
      timestamp: !Number.isNaN(new Date(sourceEntries[index]?.timestamp).getTime())
        ? sourceEntries[index].timestamp
        : `${dateKey}T12:00:00.000Z`,
      mood: ['great', 'good', 'okay', 'challenging', 'neutral'].includes(sourceEntries[index]?.mood)
        ? sourceEntries[index].mood
        : mood
    }));
    const user = await pgUserService.getUserById(req.user.id);
    const currentDateKey = getCurrentDateInTimezone(user?.timezone || 'UTC');
    const log = await pgHabitLogService.replaceHabitLog(habitId, logId, req.user.id, { status, entries, currentDateKey });
    if (!log) return res.status(404).json({ success: false, message: 'Habit log entry not found' });
    return res.json({ success: true, data: { log } });
  } catch (error) { return next(error); }
};

exports.deleteHabitLog = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id, 10);
    const logId = parseInt(req.params.logId, 10);
    if (!habitId || !logId) return res.status(400).json({ success: false, message: 'Invalid habit log' });

    const habit = await pgHabitService.getHabitById(habitId, req.user.id);
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const deleted = await pgHabitLogService.deleteHabitLog(logId, req.user.id, habitId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Habit log entry not found' });
    return res.json({ success: true, message: 'Habit log deleted successfully', data: { deleted: true } });
  } catch (error) { return next(error); }
};

/**
 * Delete one completion entry from a habit daily log
 */
exports.deleteHabitLogCompletionEntry = async (req, res, next) => {
  try {
    const habitId = parseInt(req.params.id, 10);
    const logId = parseInt(req.params.logId, 10);
    const completionIndex = parseInt(req.params.completionIndex, 10);

    if (!habitId || Number.isNaN(habitId)) {
      return res.status(400).json({ success: false, message: 'Invalid habit ID' });
    }
    if (!logId || Number.isNaN(logId)) {
      return res.status(400).json({ success: false, message: 'Invalid log ID' });
    }
    if (Number.isNaN(completionIndex) || completionIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid completion index' });
    }

    const userId = req.user.id;

    const habit = await pgHabitService.getHabitById(habitId, userId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const result = await pgHabitLogService.deleteCompletionEntry(
      habitId,
      logId,
      userId,
      completionIndex
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Habit log entry not found' });
    }

    res.json({
      success: true,
      data: {
        deleted: result.deleted,
        log: result.log
      }
    });
  } catch (error) {
    next(error);
  }
};

