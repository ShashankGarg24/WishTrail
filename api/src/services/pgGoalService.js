const { pool, query, getClient, transaction } = require('../config/supabase');

/**
 * PostgreSQL Service Layer for Goal operations
 * Handles all goal-related database operations in PostgreSQL
 */
class GoalService {
  /**
   * Create a new goal
   */
  async createGoal({ userId, title, category, year, targetDate, isPublic = false, isDiscoverable = false }) {
    const currentYear = year || new Date().getFullYear();
    
    const queryText = `
      INSERT INTO goals (user_id, title, category, year, target_date, is_public, is_discoverable)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, title, category, year, target_date, completed, completed_at,
                is_public, is_discoverable, is_active, is_community_source,
                like_count, created_at, updated_at
    `;
    
    const result = await query(queryText, [
      userId, title, category, currentYear, targetDate, isPublic, isDiscoverable
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Get goal by ID
   */
  async getGoalById(id) {
    const queryText = `
      SELECT g.id, g.user_id, g.title, g.category, g.year, g.target_date,
             g.completed, g.completed_at, g.is_public, g.is_discoverable,
             g.is_active, g.is_community_source, g.like_count,
             g.created_at, g.updated_at,
             u.name as user_name, u.username, u.avatar_url as user_avatar
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      WHERE g.id = $1 AND g.is_active = true
    `;
    
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Get user goals with filters
   */
  async getUserGoals({ userId, year, category, completed, page = 1, limit = 10, sort = 'newest' }) {
    const offset = (page - 1) * limit;
    const conditions = ['user_id = $1', 'is_active = true'];
    const values = [userId];
    let paramIndex = 2;
    
    if (year) {
      conditions.push(`year = $${paramIndex}`);
      values.push(year);
      paramIndex++;
    }
    
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    if (completed !== undefined) {
      conditions.push(`completed = $${paramIndex}`);
      values.push(completed);
      paramIndex++;
    }
    
    let orderBy = 'completed ASC, updated_at DESC'; // In-progress first, then by update
    if (sort === 'oldest') {
      orderBy = 'completed ASC, created_at ASC';
    } else if (sort === 'newest') {
      orderBy = 'completed ASC, created_at DESC';
    }
    
    const queryText = `
      SELECT id, user_id, title, category, year, target_date,
             completed, completed_at, is_public, is_discoverable,
             like_count, created_at, updated_at
      FROM goals
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    values.push(limit, offset);
    const result = await query(queryText, values);
    
    // Get total count (exclude LIMIT and OFFSET parameters)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM goals
      WHERE ${conditions.join(' AND ')}
    `;
    const countValues = values.slice(0, -2); // Remove limit and offset
    const countResult = await query(countQuery, countValues);
    
    return {
      goals: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }
  
  /**
   * Update goal
   */
  async updateGoal(id, userId, updates) {
    const allowedFields = ['title', 'category', 'target_date', 'is_public', 'is_discoverable'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id, userId);
    
    const queryText = `
      UPDATE goals
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND is_active = true AND completed = false
      RETURNING id, user_id, title, category, year, target_date,
                completed, completed_at, is_public, is_discoverable,
                like_count, created_at, updated_at
    `;
    
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }
  
  /**
   * Toggle goal completion
   */
  async completeGoal(id, userId) {
    const queryText = `
      UPDATE goals
      SET completed = true, 
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND completed = false AND is_active = true
      RETURNING id, user_id, title, category, year, completed, completed_at, created_at, updated_at
    `;
    
    const result = await query(queryText, [id, userId]);
    return result.rows[0] || null;
  }
  
  /**
   * Delete goal (soft delete)
   */
  async deleteGoal(id, userId) {
    const queryText = `
      UPDATE goals
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await query(queryText, [id, userId]);
    return result.rows[0] || null;
  }
  
  /**
   * Hard delete goal (for cleanup/migration)
   */
  async hardDeleteGoal(id) {
    const queryText = 'DELETE FROM goals WHERE id = $1 RETURNING id';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Search goals (discoverable, public users)
   */
  async searchGoals({ query: searchQuery, category, page = 1, limit = 20, excludeUserIds = [] }) {
    const offset = (page - 1) * limit;
    const conditions = ['is_discoverable = true', 'is_active = true', 'completed = true'];
    const values = [`%${searchQuery}%`, searchQuery];
    let paramIndex = 3;
    
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    if (excludeUserIds.length > 0) {
      conditions.push(`user_id != ALL($${paramIndex})`);
      values.push(excludeUserIds);
      paramIndex++;
    }
    
    const queryText = `
      SELECT g.id, g.user_id, g.title, g.category, g.year,
             g.completed, g.completed_at, g.like_count,
             g.created_at,
             u.name as user_name, u.username, u.avatar_url as user_avatar
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      WHERE ${conditions.join(' AND ')}
        AND (
          g.title ILIKE $1 OR
          to_tsvector('english', g.title) @@ plainto_tsquery('english', $2)
        )
        AND u.is_active = true
        AND u.is_private = false
      ORDER BY g.like_count DESC, g.completed_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    values.push(limit, offset);
    const result = await query(queryText, values);
    
    return {
      goals: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  }
  
  /**
   * Get trending goals
   */
  async getTrendingGoals({ category, page = 1, limit = 20, days = 7 }) {
    const offset = (page - 1) * limit;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const conditions = [
      'g.is_discoverable = true',
      'g.is_active = true',
      'g.completed = true',
      'g.completed_at > $1',
      'u.is_active = true',
      'u.is_private = false'
    ];
    
    const values = [cutoffDate];
    let paramIndex = 2;
    
    if (category) {
      conditions.push(`g.category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    const queryText = `
      SELECT g.id, g.user_id, g.title, g.category, g.year,
             g.completed, g.completed_at, g.like_count,
             g.created_at,
             u.name as user_name, u.username, u.avatar_url as user_avatar,
             (g.like_count * 10 + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - g.completed_at)) / 86400) as trend_score
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY trend_score DESC, g.like_count DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    values.push(limit, offset);
    const result = await query(queryText, values);
    
    return {
      goals: result.rows.map(({ trend_score, ...goal }) => goal), // Remove trend_score from output
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  }
  
  /**
   * Get yearly goal summary for user
   */
  async getYearlyGoalsSummary(userId, year) {
    const queryText = `
      SELECT 
        year,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        COUNT(*) FILTER (WHERE completed = false) as pending,
        category,
        COUNT(*) FILTER (WHERE completed = true) as completed_in_category
      FROM goals
      WHERE user_id = $1 AND year = $2 AND is_active = true
      GROUP BY year, category
    `;
    
    const result = await query(queryText, [userId, year]);
    
    // Aggregate by category
    const summary = {
      year: parseInt(year),
      total: 0,
      completed: 0,
      pending: 0,
      completionRate: 0,
      categorySummary: {}
    };
    
    result.rows.forEach(row => {
      summary.total += parseInt(row.total);
      summary.completed += parseInt(row.completed);
      summary.pending += parseInt(row.pending);
      
      if (!summary.categorySummary[row.category]) {
        summary.categorySummary[row.category] = {
          total: 0,
          completed: 0
        };
      }
      
      summary.categorySummary[row.category].total += parseInt(row.total);
      summary.categorySummary[row.category].completed += parseInt(row.completed_in_category);
    });
    
    summary.completionRate = summary.total > 0 
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;
    
    return summary;
  }
  
  /**
   * Check daily goal creation limit
   */
  async checkDailyLimit(userId, limit = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const queryText = `
      SELECT COUNT(*) as count
      FROM goals
      WHERE user_id = $1 AND created_at >= $2
    `;
    
    const result = await query(queryText, [userId, today]);
    const count = parseInt(result.rows[0].count);
    
    return {
      count,
      limit,
      canCreate: count < limit,
      remaining: Math.max(0, limit - count)
    };
  }
  
  /**
   * Check yearly goal limit
   */
  async checkYearlyLimit(userId, year, limit = 50) {
    const queryText = `
      SELECT COUNT(*) as count
      FROM goals
      WHERE user_id = $1 AND year = $2
    `;
    
    const result = await query(queryText, [userId, year]);
    const count = parseInt(result.rows[0].count);
    
    return {
      count,
      limit,
      canCreate: count < limit,
      remaining: Math.max(0, limit - count)
    };
  }
  
  /**
   * Get goals by IDs (bulk lookup)
   */
  async getGoalsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    
    const queryText = `
      SELECT id, user_id, title, category, year, completed, completed_at, is_public, created_at
      FROM goals
      WHERE id = ANY($1) AND is_active = true
    `;
    
    const result = await query(queryText, [ids]);
    return result.rows;
  }

  /**
   * Get all years where user has goals
   */
  async getUserYearsWithGoals(userId) {
    const queryText = `
      SELECT DISTINCT year
      FROM goals
      WHERE user_id = $1 AND is_active = true
      ORDER BY year DESC
    `;
    
    const result = await query(queryText, [userId]);
    return result.rows.map(row => row.year);
  }

  /**
   * Get category leaderboard
   * @param {Object} options - Query options
   * @param {string} options.category - Goal category
   * @param {Date} options.startDate - Optional start date filter
   * @param {number} options.limit - Number of users to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Leaderboard data
   */
  async getCategoryLeaderboard({ category, startDate = null, limit = 50, offset = 0 }) {
    const queryText = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.avatar_url as avatar,
        COUNT(g.id) as "goalCount"
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      WHERE g.category = $1
        AND g.completed = true
        AND u.is_active = true
        ${startDate ? 'AND g.completed_at >= $4' : ''}
      GROUP BY u.id, u.name, u.username, u.avatar_url
      ORDER BY "goalCount" DESC
      LIMIT $2 OFFSET $3
    `;
    
    const params = startDate 
      ? [category, limit, offset, startDate]
      : [category, limit, offset];
    
    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get category leaderboard count
   * @param {Object} options - Query options
   * @param {string} options.category - Goal category
   * @param {Date} options.startDate - Optional start date filter
   * @returns {Promise<number>} Total count of users
   */
  async getCategoryLeaderboardCount({ category, startDate = null }) {
    const queryText = `
      SELECT COUNT(DISTINCT g.user_id) as count
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      WHERE g.category = $1
        AND g.completed = true
        AND u.is_active = true
        ${startDate ? 'AND g.completed_at >= $2' : ''}
    `;
    
    const params = startDate ? [category, startDate] : [category];
    const result = await query(queryText, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get leaderboard with category/timeframe filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard({ type, category, timeframe, limit = 50, offset = 0 }) {
    // This method can be extended if needed for complex filtered leaderboards
    // For now, redirecting to category leaderboard
    if (category) {
      let startDate = null;
      const now = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      return this.getCategoryLeaderboard({ category, startDate, limit, offset });
    }
    
    return [];
  }

  /**
   * Get leaderboard count with filters
   * @param {Object} options - Query options
   * @returns {Promise<number>} Total count
   */
  async getLeaderboardCount({ type, category, timeframe }) {
    if (category) {
      let startDate = null;
      const now = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      return this.getCategoryLeaderboardCount({ category, startDate });
    }
    
    return 0;
  }
}

module.exports = new GoalService();
