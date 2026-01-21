/**
 * PostgreSQL Habit Service
 * Handles all habit-related database operations for PostgreSQL
 */

const { query, getClient, transaction } = require('../config/supabase');

class PgHabitService {
  /**
   * Create a new habit
   * @param {Object} habitData - Habit creation data
   * @returns {Promise<Object>} Created habit
   */
  async createHabit(habitData) {
    const {
      userId,
      name,
      description = '',
      frequency = 'daily',
      daysOfWeek = null,
      reminders = [],
      targetCompletions = null,
      targetDays = null,
      isPublic = true
    } = habitData;

    const sql = `
      INSERT INTO habits (
        user_id, name, description, frequency, days_of_week,
        reminders, target_completions, target_days, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      userId, name, description, frequency,
      daysOfWeek ? `{${daysOfWeek.join(',')}}` : null,
      JSON.stringify(reminders),
      targetCompletions,
      targetDays,
      isPublic
    ];

    const result = await query(sql, values);
    return this._formatHabit(result.rows[0]);
  }

  /**
   * Get habit by ID
   * @param {number} id - Habit ID
   * @param {number} userId - Optional user ID for ownership check
   * @returns {Promise<Object|null>} Habit or null
   */
  async getHabitById(id, userId = null) {
    let sql = `
      SELECT h.*, u.username, u.name as user_name, u.avatar_url
      FROM habits h
      INNER JOIN users u ON h.user_id = u.id
      WHERE h.id = $1
    `;
    const values = [id];

    if (userId) {
      sql += ' AND h.user_id = $2';
      values.push(userId);
    }

    const result = await query(sql, values);
    return result.rows[0] ? this._formatHabit(result.rows[0]) : null;
  }

  /**
   * Get user's habits with filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of habits
   */
  async getUserHabits({
    userId,
    frequency = null,
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  }) {
    const conditions = ['h.user_id = $1'];
    const values = [userId];
    let paramIndex = 2;

    if (frequency) {
      conditions.push(`h.frequency = $${paramIndex++}`);
      values.push(frequency);
    }

    const allowedSortFields = ['created_at', 'name', 'current_streak', 'total_completions'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT h.*, u.username, u.name as user_name, u.avatar_url
      FROM habits h
      INNER JOIN users u ON h.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY h.${sortField} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows.map(row => this._formatHabit(row));
  }

  /**
   * Update habit
   * @param {number} id - Habit ID
   * @param {number} userId - User ID for ownership check
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated habit or null
   */
  async updateHabit(id, userId, updates) {
    const allowedFields = [
      'name', 'description', 'frequency', 'days_of_week',
      'reminders', 'target_completions', 'target_days',
      'is_public'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === 'days_of_week' && Array.isArray(value)) {
          setClause.push(`${dbKey} = $${paramIndex++}`);
          values.push(`{${value.join(',')}}`);
        } else if (dbKey === 'reminders' && Array.isArray(value)) {
          setClause.push(`${dbKey} = $${paramIndex++}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbKey} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (setClause.length === 0) {
      return null;
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE habits
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    values.push(id, userId);

    const result = await query(sql, values);
    return result.rows[0] ? this._formatHabit(result.rows[0]) : null;
  }

  /**
   * @param {number} id - Habit ID
   * @param {number} userId - User ID for ownership check
   * @returns {Promise<boolean>} Success status
   */
  async deleteHabit(id, userId) {
    const sql = `
      DELETE FROM habits
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await query(sql, [id, userId]);
    return result.rowCount > 0;
  }
 
  /**
   * Update habit streak and stats
   * @param {number} id - Habit ID
   * @param {Object} stats - Stats to update
   * @returns {Promise<Object|null>} Updated habit or null
   */
  async updateHabitStats(id, stats) {
    const {
      currentStreak,
      longestStreak,
      lastLoggedDateKey,
      totalCompletions,
      totalDays
    } = stats;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (currentStreak !== undefined) {
      setClause.push(`current_streak = $${paramIndex++}`);
      values.push(currentStreak);
    }
    if (longestStreak !== undefined) {
      setClause.push(`longest_streak = $${paramIndex++}`);
      values.push(longestStreak);
    }
    if (lastLoggedDateKey !== undefined) {
      setClause.push(`last_logged_date_key = $${paramIndex++}`);
      values.push(lastLoggedDateKey);
    }
    if (totalCompletions !== undefined) {
      setClause.push(`total_completions = $${paramIndex++}`);
      values.push(totalCompletions);
    }
    if (totalDays !== undefined) {
      setClause.push(`total_days = $${paramIndex++}`);
      values.push(totalDays);
    }

    if (setClause.length === 0) {
      return null;
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE habits
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await query(sql, values);
    return result.rows[0] ? this._formatHabit(result.rows[0]) : null;
  }

  /**
   * Increment habit stats
   * @param {number} id - Habit ID
   * @param {Object} increments - Fields to increment
   * @returns {Promise<Object|null>} Updated habit or null
   */
  async incrementHabitStats(id, increments) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (increments.totalCompletions) {
      setClause.push(`total_completions = total_completions + $${paramIndex++}`);
      values.push(increments.totalCompletions);
    }
    if (increments.totalDays) {
      setClause.push(`total_days = total_days + $${paramIndex++}`);
      values.push(increments.totalDays);
    }

    if (setClause.length === 0) {
      return null;
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE habits
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await query(sql, values);
    return result.rows[0] ? this._formatHabit(result.rows[0]) : null;
  }

  /**
   * Get habits by multiple IDs
   * @param {Array<number>} ids - Array of habit IDs
   * @returns {Promise<Array>} Array of habits
   */
  async getHabitsByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const sql = `
      SELECT h.*, u.username, u.name as user_name, u.avatar_url
      FROM habits h
      INNER JOIN users u ON h.user_id = u.id
      WHERE h.id = ANY($1) 
      ORDER BY h.created_at DESC
    `;

    const result = await query(sql, [ids]);
    return result.rows.map(row => this._formatHabit(row));
  }

  /**
   * Get public habits
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of public habits
   */
  async getPublicHabits({ limit = 20, offset = 0, userId = null }) {
    let sql = `
      SELECT h.*, u.username, u.name as user_name, u.avatar_url
      FROM habits h
      INNER JOIN users u ON h.user_id = u.id
      WHERE h.is_public = true
    `;

    const values = [limit, offset];

    if (userId) {
      sql += ' AND h.user_id != $3';
      values.push(userId);
    }

    sql += ' ORDER BY h.created_at DESC LIMIT $1 OFFSET $2';

    const result = await query(sql, values);
    return result.rows.map(row => this._formatHabit(row));
  }

  /**
   * Calculate streak for habit based on logs
   * @param {number} habitId - Habit ID
   * @param {string} currentDateKey - Current date key (YYYY-MM-DD)
   * @returns {Promise<Object>} Streak information
   */
  async calculateStreak(habitId, currentDateKey) {
    // This will be called from habitLogService after logging
    // Gets the habit's frequency and calculates streak based on expected days
    const habit = await this.getHabitById(habitId);
    if (!habit) return { currentStreak: 0, longestStreak: 0 };

    // Get all logs for this habit, ordered by date descending
    const logSql = `
      SELECT date_key, status
      FROM habit_logs
      WHERE habit_id = $1 AND status = 'done'
      ORDER BY date_key DESC
    `;

    const logResult = await query(logSql, [habitId]);
    const logs = logResult.rows;

    if (logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate current streak (consecutive days back from current/last logged date)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const isExpectedDay = (dateKey, frequency, daysOfWeek) => {
      if (frequency === 'daily') return true;
      const date = new Date(dateKey + 'T00:00:00Z');
      const dayOfWeek = date.getUTCDay();
      return daysOfWeek && daysOfWeek.includes(dayOfWeek);
    };

    const daysOfWeek = habit.daysOfWeek;
    const frequency = habit.frequency;

    // Calculate streaks
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      if (i === 0) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        const prevDate = new Date(logs[i - 1].date_key + 'T00:00:00Z');
        const currDate = new Date(log.date_key + 'T00:00:00Z');
        const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

        // Check if consecutive expected day
        if (diffDays === 1 || (frequency !== 'daily' && diffDays <= 7)) {
          // Check if this day should be logged based on frequency
          if (isExpectedDay(log.date_key, frequency, daysOfWeek)) {
            tempStreak++;
            if (i < 10) currentStreak = tempStreak; // Only count recent streak
          }
        } else {
          // Streak broken
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Check if current streak should be reset (no log today or yesterday)
    const lastLogDate = new Date(logs[0].date_key + 'T00:00:00Z');
    const today = new Date(currentDateKey + 'T00:00:00Z');
    const daysSinceLastLog = Math.floor((today - lastLogDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLastLog > 1) {
      currentStreak = 0;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Get habit count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Habit count
   */
  async getUserHabitCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM habits
      WHERE user_id = $1
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Search habits
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of habits
   */
  async searchHabits({ searchQuery, userId = null, limit = 20, offset = 0 }) {
    let sql = `
      SELECT h.*, u.username, u.name as user_name, u.avatar_url,
             ts_rank(to_tsvector('english', h.name || ' ' || COALESCE(h.description, '')), 
                     plainto_tsquery('english', $1)) as rank
      FROM habits h
      INNER JOIN users u ON h.user_id = u.id
      WHERE h.is_public = true
        AND (
          h.name ILIKE $2
          OR h.description ILIKE $2
        )
    `;

    const values = [searchQuery, `%${searchQuery}%`];
    let paramIndex = 3;

    if (userId) {
      sql += ` AND h.user_id = $${paramIndex++}`;
      values.push(userId);
    }

    sql += ` ORDER BY rank DESC, h.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows.map(row => this._formatHabit(row));
  }

  /**
   * Format habit data from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted habit
   */
  _formatHabit(row) {
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      frequency: row.frequency,
      daysOfWeek: row.days_of_week,
      // reminders: typeof row.reminders === 'string' ? JSON.parse(row.reminders) : row.reminders,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastLoggedDateKey: row.last_logged_date_key,
      totalCompletions: row.total_completions,
      totalDays: row.total_days,
      targetCompletions: row.target_completions,
      targetDays: row.target_days,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // User data if joined
      username: row.username,
      userName: row.user_name,
      avatarUrl: row.avatar_url
    };
  }

  /**
   * Count active habits for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Count of active habits
   */
  async countActiveHabits(userId) {
    const queryText = `
      SELECT COUNT(*) as count
      FROM habits
      WHERE user_id = $1 
    `;
    const result = await query(queryText, [userId]);
    return parseInt(result.rows[0]?.count || 0);
  }
}

module.exports = new PgHabitService();
