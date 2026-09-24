const { logger } = require('./../config/observability');
/**
 * PostgreSQL Habit Log Service
 * Handles all habit log-related database operations for PostgreSQL
 */

const { query, getClient, transaction } = require('../config/supabase');
const pgHabitService = require('./pgHabitService');

class PgHabitLogService {
  /**
   * Create or update habit log
   * @param {Object} logData - Habit log data
   * @returns {Promise<Object>} Created/updated habit log
   */
  async logHabit(logData) {
    const {
      userId,
      habitId,
      dateKey,
      status = 'done',
      mood = 'neutral',
      completionCount = 1
    } = logData;

    return await transaction(async (client) => {
      // Check if log already exists
      const existingSql = `
        SELECT * FROM habit_logs
        WHERE user_id = $1 AND habit_id = $2 AND date_key = $3::date
      `;
      const existingResult = await client.query(existingSql, [userId, habitId, dateKey]);

      let log;
      if (existingResult.rows.length > 0) {
        // Update existing log - append new completion with timestamp and mood
        const updateSql = `
          UPDATE habit_logs
          SET status = $1,
              completion_count = completion_count + $2,
              completion_times_mood = array_append(completion_times_mood, jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'mood', $3::text))
          WHERE id = $4
          RETURNING *
        `;
        const updateResult = await client.query(updateSql, [
          status, completionCount, mood, existingResult.rows[0].id
        ]);
        log = updateResult.rows[0];
      } else {
        // Create new log with first completion
        const insertSql = `
          INSERT INTO habit_logs (
            user_id, habit_id, date_key, status,
            completion_count, completion_times_mood
          ) VALUES ($1, $2, $3::date, $4, $5, ARRAY[jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'mood', $6::text)])
          RETURNING *
        `;
        const insertResult = await client.query(insertSql, [
          userId, habitId, dateKey, status, completionCount, mood
        ]);
        log = insertResult.rows[0];
      }

      // Update habit stats
      if (status === 'done') {
        // Recalculate streaks using pgHabitService within the same transaction for correctness
        const streakInfo = await pgHabitService.calculateStreak(habitId, dateKey, client);
        const currentStreak = streakInfo.currentStreak || 0;
        const longestStreak = streakInfo.longestStreak || 0;

        await client.query(`
          UPDATE habits
          SET current_streak = $3,
              longest_streak = $4,
              last_logged_date_key = $2,
              total_completions = (
                SELECT COALESCE(SUM(completion_count), 0)
                FROM habit_logs
                WHERE habit_id = $1 AND status = 'done'
              ),
              total_days = (
                SELECT COUNT(DISTINCT date_key)
                FROM habit_logs
                WHERE habit_id = $1 AND status = 'done'
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [habitId, dateKey, currentStreak, longestStreak]);
      }

      return this._formatHabitLog(log);
    });
  }

  /**
   * Get habit log by ID
   * @param {number} id - Habit log ID
   * @returns {Promise<Object|null>} Habit log or null
   */
  async getHabitLogById(id) {
    const sql = `
      SELECT hl.*, h.name as habit_name, h.frequency, u.username
      FROM habit_logs hl
      INNER JOIN habits h ON hl.habit_id = h.id
      INNER JOIN users u ON hl.user_id = u.id
      WHERE hl.id = $1
    `;

    const result = await query(sql, [id]);
    return result.rows[0] ? this._formatHabitLog(result.rows[0]) : null;
  }

  /**
   * Get habit logs for a specific habit
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of habit logs
   */
  async getHabitLogs({
    habitId,
    userId = null,
    startDate = null,
    endDate = null,
    status = null,
    limit = 100,
    offset = 0
  }) {
    const conditions = ['habit_id = $1'];
    const values = [habitId];
    let paramIndex = 2;

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(userId);
    }

    if (startDate) {
      conditions.push(`date_key >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`date_key <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const sql = `
      SELECT hl.*, h.name as habit_name, h.frequency, u.username
      FROM habit_logs hl
      INNER JOIN habits h ON hl.habit_id = h.id
      INNER JOIN users u ON hl.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY hl.date_key DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows.map(row => this._formatHabitLog(row));
  }

  /**
   * Get user's habit logs across all habits
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of habit logs
   */
  async getUserHabitLogs({
    userId,
    startDate = null,
    endDate = null,
    status = null,
    limit = 100,
    offset = 0
  }) {
    const conditions = ['hl.user_id = $1'];
    const values = [userId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`hl.date_key >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`hl.date_key <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (status) {
      conditions.push(`hl.status = $${paramIndex++}`);
      values.push(status);
    }

    const sql = `
      SELECT hl.*, h.name as habit_name, h.frequency, u.username
      FROM habit_logs hl
      INNER JOIN habits h ON hl.habit_id = h.id
      INNER JOIN users u ON hl.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY hl.date_key DESC, hl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows.map(row => this._formatHabitLog(row));
  }

  /**
   * Get habit log for specific date
   * @param {number} habitId - Habit ID
   * @param {string} dateKey - Date key (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Habit log or null
   */
  async getLogByDate(habitId, dateKey) {
    const sql = `
      SELECT hl.*, h.name as habit_name, h.frequency, u.username
      FROM habit_logs hl
      INNER JOIN habits h ON hl.habit_id = h.id
      INNER JOIN users u ON hl.user_id = u.id
      WHERE hl.habit_id = $1 AND hl.date_key = $2
    `;

    const result = await query(sql, [habitId, dateKey]);
    return result.rows[0] ? this._formatHabitLog(result.rows[0]) : null;
  }

  /**
   * Update habit log
   * @param {number} id - Habit log ID
   * @param {number} userId - User ID for ownership check
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated habit log or null
   */
  async updateHabitLog(id, userId, updates) {
    return await transaction(async (client) => {
      const allowedFields = ['status', 'mood'];

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbKey)) {
          setClause.push(`${dbKey} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (setClause.length === 0) {
        return null;
      }

      // Get the current log to check previous state
      const getLogSql = `SELECT * FROM habit_logs WHERE id = $1 AND user_id = $2`;
      const logResult = await client.query(getLogSql, [id, userId]);

      if (logResult.rows.length === 0) {
        return null;
      }

      const currentLog = logResult.rows[0];
      const previousCompletionCount = currentLog.completion_count || 0;
      const previousStatus = currentLog.status;

      logger.info('[updateHabitLog] Current log:', {
        id: currentLog.id,
        status: previousStatus,
        completionCount: previousCompletionCount
      });
      logger.info('[updateHabitLog] Update to:', updates);

      // If status is being changed to 'skipped' or 'missed', clear completion data
      if (updates.status === 'skipped' || updates.status === 'missed') {
        setClause.push(`completion_count = 0`);
        setClause.push(`completion_times_mood = ARRAY[]::jsonb[]`);

        logger.info('[updateHabitLog] Clearing completions, adjusting habit stats');

        // Adjust habit stats if previous status was 'done'
        if (previousStatus === 'done' && previousCompletionCount > 0) {
          // Subtract completions and days
          await client.query(`
            UPDATE habits
            SET total_completions = GREATEST(0, total_completions - $1),
                total_days = GREATEST(0, total_days - 1)
            WHERE id = $2
          `, [previousCompletionCount, currentLog.habit_id]);

          // Recalculate streaks using centralized service inside transaction
          const streakInfo = await pgHabitService.calculateStreak(
            currentLog.habit_id,
            new Date().toISOString().split('T')[0],
            client
          );

          let currentStreak = streakInfo.currentStreak || 0;
          let longestStreak = streakInfo.longestStreak || 0;

          // Determine if there are remaining done logs to decide final longest
          const remainingResult = await client.query(`
            SELECT COUNT(*)::int AS cnt FROM habit_logs WHERE habit_id = $1 AND status = 'done'
          `, [currentLog.habit_id]);
          const remaining = remainingResult.rows[0]?.cnt || 0;

          let finalLongestStreak = 0;
          if (remaining > 0) {
            const currentHabitResult = await client.query(`
              SELECT longest_streak FROM habits WHERE id = $1
            `, [currentLog.habit_id]);
            const existingLongestStreak = currentHabitResult.rows[0]?.longest_streak || 0;
            finalLongestStreak = Math.max(longestStreak, existingLongestStreak);
          }

          await client.query(`
            UPDATE habits
            SET current_streak = $1,
                longest_streak = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [currentStreak, finalLongestStreak, currentLog.habit_id]);
        }
      }

      const sql = `
        UPDATE habit_logs
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(id, userId);

      const result = await client.query(sql, values);

      logger.info('[updateHabitLog] Log updated, returning');

      return result.rows[0] ? this._formatHabitLog(result.rows[0]) : null;
    });
  }

  /**
   * Update a specific completion entry (time + mood) inside habit log's completion_times_mood
   * @param {number} habitId - Habit ID
   * @param {number} logId - Habit log ID
   * @param {number} userId - User ID for ownership check
   * @param {number} completionIndex - Zero-based completion index
   * @param {Object} payload - Entry update payload
   * @returns {Promise<Object|null>} Updated habit log or null
   */
  async updateCompletionEntry(habitId, logId, userId, completionIndex, payload = {}) {
    const mood = String(payload.mood || 'neutral').toLowerCase();
    const timestamp = payload.timestamp;

    if (!timestamp) return null;

    const validMoods = new Set(['great', 'good', 'okay', 'challenging', 'neutral']);
    if (!validMoods.has(mood)) return null;

    const getSql = `
      SELECT *
      FROM habit_logs
      WHERE id = $1 AND habit_id = $2 AND user_id = $3
    `;
    const getResult = await query(getSql, [logId, habitId, userId]);
    if (!getResult.rows[0]) return null;

    const currentLog = getResult.rows[0];
    const entries = Array.isArray(currentLog.completion_times_mood) ? [...currentLog.completion_times_mood] : [];

    if (completionIndex < 0 || completionIndex >= entries.length) return null;

    entries[completionIndex] = {
      ...entries[completionIndex],
      timestamp: new Date(timestamp).toISOString(),
      mood
    };

    const updateSql = `
      WITH payload AS (
        SELECT value AS entry
        FROM jsonb_array_elements($1::jsonb)
      )
      UPDATE habit_logs
      SET completion_times_mood = COALESCE((SELECT array_agg(entry) FROM payload), ARRAY[]::jsonb[])
      WHERE id = $2 AND habit_id = $3 AND user_id = $4
      RETURNING *
    `;

    const updateResult = await query(updateSql, [JSON.stringify(entries), logId, habitId, userId]);
    return updateResult.rows[0] ? this._formatHabitLog(updateResult.rows[0]) : null;
  }

  /**
   * Delete a specific completion entry from habit log's completion_times_mood
   * @param {number} habitId - Habit ID
   * @param {number} logId - Habit log ID
   * @param {number} userId - User ID for ownership check
   * @param {number} completionIndex - Zero-based completion index
   * @returns {Promise<Object|null>} Result with deleted flag and updated log
   */
  async deleteCompletionEntry(habitId, logId, userId, completionIndex) {
    const getSql = `
      SELECT *
      FROM habit_logs
      WHERE id = $1 AND habit_id = $2 AND user_id = $3
    `;
    const getResult = await query(getSql, [logId, habitId, userId]);
    if (!getResult.rows[0]) return null;

    const currentLog = getResult.rows[0];
    const entries = Array.isArray(currentLog.completion_times_mood) ? [...currentLog.completion_times_mood] : [];

    if (completionIndex < 0 || completionIndex >= entries.length) return null;

    entries.splice(completionIndex, 1);

    if (entries.length === 0) {
      const deleted = await this.deleteHabitLog(logId, userId);
      if (!deleted) return null;
      return { deleted: true, log: null };
    }

    const updateSql = `
      WITH payload AS (
        SELECT value AS entry
        FROM jsonb_array_elements($1::jsonb)
      )
      UPDATE habit_logs
      SET completion_times_mood = COALESCE((SELECT array_agg(entry) FROM payload), ARRAY[]::jsonb[]),
          completion_count = $2
      WHERE id = $3 AND habit_id = $4 AND user_id = $5
      RETURNING *
    `;

    const updateResult = await query(updateSql, [JSON.stringify(entries), entries.length, logId, habitId, userId]);
    const updatedRow = updateResult.rows[0];
    if (!updatedRow) return null;

    await query(`
      UPDATE habits
      SET total_completions = (
            SELECT COALESCE(SUM(completion_count), 0)
            FROM habit_logs
            WHERE habit_id = $1 AND status = 'done'
          ),
          total_days = (
            SELECT COUNT(DISTINCT date_key)
            FROM habit_logs
            WHERE habit_id = $1 AND status = 'done'
          ),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [habitId]);

    return { deleted: false, log: this._formatHabitLog(updatedRow) };
  }

  /**
   * Delete habit log
   * @param {number} id - Habit log ID
   * @param {number} userId - User ID for ownership check
   * @returns {Promise<boolean>} Success status
   */
  async deleteHabitLog(id, userId) {
    return await transaction(async (client) => {
      // Get the log first
      const logSql = `SELECT * FROM habit_logs WHERE id = $1 AND user_id = $2`;
      const logResult = await client.query(logSql, [id, userId]);

      if (logResult.rows.length === 0) {
        return false;
      }

      const log = logResult.rows[0];

      // Delete the log
      await client.query(`DELETE FROM habit_logs WHERE id = $1`, [id]);

      // Recalculate habit stats
      if (log.status === 'done') {
        // Calculate through this transaction so the just-deleted completion is
        // excluded from both the current and best streaks.
        const streakInfo = await pgHabitService.calculateStreak(
          log.habit_id,
          new Date().toISOString().split('T')[0],
          client
        );

        await client.query(`
          UPDATE habits
          SET current_streak = $1,
              longest_streak = $2,
              last_logged_date_key = (
                SELECT MAX(date_key)
                FROM habit_logs
                WHERE habit_id = $3 AND status = 'done'
              ),
              total_completions = (
                SELECT COALESCE(SUM(completion_count), 0)
                FROM habit_logs
                WHERE habit_id = $3 AND status = 'done'
              ),
              total_days = (
                SELECT COUNT(DISTINCT date_key)
                FROM habit_logs
                WHERE habit_id = $3 AND status = 'done'
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [streakInfo.currentStreak, streakInfo.longestStreak, log.habit_id]);
      }

      return true;
    });
  }

  /**
   * Get habit completion stats for date range
   * @param {number} habitId - Habit ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Completion stats
   */
  async getCompletionStats(habitId, startDate, endDate) {
    const sql = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_count,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_count,
        SUM(completion_count) as total_completions,
        AVG(CASE WHEN status = 'done' THEN completion_count ELSE 0 END) as avg_completions_per_day
      FROM habit_logs
      WHERE habit_id = $1 AND date_key >= $2 AND date_key <= $3
    `;

    const result = await query(sql, [habitId, startDate, endDate]);
    const row = result.rows[0];

    return {
      totalLogs: parseInt(row.total_logs),
      completedCount: parseInt(row.completed_count),
      missedCount: parseInt(row.missed_count),
      skippedCount: parseInt(row.skipped_count),
      totalCompletions: parseInt(row.total_completions || 0),
      avgCompletionsPerDay: parseFloat(row.avg_completions_per_day || 0),
      completionRate: row.total_logs > 0
        ? (parseInt(row.completed_count) / parseInt(row.total_logs) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Get habit logs grouped by date (for calendar/heatmap view)
   * @param {number} habitId - Habit ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of date stats
   */
  async getLogsByDateRange(habitId, startDate, endDate) {
    const sql = `
      SELECT 
        date_key,
        status,
        completion_count,
        mood,
      FROM habit_logs
      WHERE habit_id = $1 AND date_key >= $2 AND date_key <= $3
      ORDER BY date_key ASC
    `;

    const result = await query(sql, [habitId, startDate, endDate]);
    return result.rows.map(row => ({
      dateKey: row.date_key,
      status: row.status,
      completionCount: row.completion_count,
      mood: row.mood
    }));
  }

  /**
   * Get user's activity summary for date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Activity summary
   */
  async getUserActivitySummary(userId, startDate, endDate) {
    const sql = `
      SELECT
        date_key,
        COUNT(DISTINCT habit_id) as habits_logged,
        SUM(completion_count) as total_completions,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_habits
      FROM habit_logs
      WHERE user_id = $1 AND date_key >= $2 AND date_key <= $3
      GROUP BY date_key
      ORDER BY date_key ASC
    `;

    const result = await query(sql, [userId, startDate, endDate]);
    return result.rows.map(row => ({
      dateKey: row.date_key,
      habitsLogged: parseInt(row.habits_logged),
      totalCompletions: parseInt(row.total_completions),
      completedHabits: parseInt(row.completed_habits)
    }));
  }

  /**
   * Check if habit was logged today
   * @param {number} habitId - Habit ID
   * @param {string} dateKey - Date key (YYYY-MM-DD)
   * @returns {Promise<boolean>} True if logged today
   */
  async isLoggedToday(habitId, dateKey) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM habit_logs
        WHERE habit_id = $1 AND date_key = $2
      ) as exists
    `;

    const result = await query(sql, [habitId, dateKey]);
    return result.rows[0].exists;
  }

  /**
   * Get total habit logs count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total logs count
   */
  async getUserLogsCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM habit_logs
      WHERE user_id = $1
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Format habit log data from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted habit log
   */
  _formatHabitLog(row) {
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      habitId: row.habit_id,
      dateKey: row.date_key,
      status: row.status,
      mood: row.mood,
      completionCount: row.completion_count,
      completionTimesMood: row.completion_times_mood,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Joined data if available
      habitName: row.habit_name,
      frequency: row.frequency,
      username: row.username
    };
  }
}

module.exports = new PgHabitLogService();
