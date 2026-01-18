/**
 * PostgreSQL Like Service
 * Handles all like/reaction operations for PostgreSQL
 */

const { query, transaction } = require('../config/supabase');

class PgLikeService {
  /**
   * Toggle like on a target (goal, activity, or comment)
   * @param {Object} likeData - Like data
   * @returns {Promise<Object>} Like operation result
   */
  async toggleLike(likeData) {
    const {
      userId,
      targetType,
      targetId,
      reactionType = 'like'
    } = likeData;

    // Validate target type
    const validTypes = ['goal', 'activity', 'activity_comment'];
    if (!validTypes.includes(targetType)) {
      throw new Error(`Invalid target type: ${targetType}`);
    }

    return await transaction(async (client) => {
      // Check if like already exists
      const existingSql = `
        SELECT * FROM likes
        WHERE user_id = $1 AND target_type = $2 AND target_id = $3
      `;
      const existingResult = await client.query(existingSql, [userId, targetType, targetId]);

      let like;
      let action;

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        
        // Toggle active status
        const updateSql = `
          DELETE FROM likes
          WHERE id = $1
          RETURNING *
        `;
        const updateResult = await client.query(updateSql, [ existing.id]);
        like = updateResult.rows[0];
      } else {
        // Create new like
        action = 'liked';
        const insertSql = `
          INSERT INTO likes (user_id, target_type, target_id, reaction_type)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const insertResult = await client.query(insertSql, [userId, targetType, targetId, reactionType]);
        like = insertResult.rows[0];
      }

      // Note: Like counts on goals are updated automatically by triggers

      return {
        ...this._formatLike(like),
        action
      };
    });
  }

  /**
   * Like a target (ensure it's liked)
   * @param {Object} likeData - Like data
   * @returns {Promise<Object>} Like object
   */
  async likeTarget(likeData) {
    const {
      userId,
      targetType,
      targetId,
      reactionType = 'like'
    } = likeData;

    return await transaction(async (client) => {
      // Check if like already exists
      const existingSql = `
        SELECT * FROM likes
        WHERE user_id = $1 AND target_type = $2 AND target_id = $3
      `;
      const existingResult = await client.query(existingSql, [userId, targetType, targetId]);
      let like;

      if (existingResult.rows.length > 0) {
        like = existingResult.rows[0];
      } else {
        // Create new like
        const insertSql = `
          INSERT INTO likes (user_id, target_type, target_id, reaction_type)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const insertResult = await client.query(insertSql, [userId, targetType, targetId, reactionType]);
        like = insertResult.rows[0];
      }

      return this._formatLike(like);
    });
  }

  /**
   * Unlike a target (ensure it's not liked)
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @returns {Promise<boolean>} Success status
   */
  async unlikeTarget(likeData) {
    const {
      userId,
      targetType,
      targetId,
    } = likeData;

    return await transaction(async (client) => {
      const sql = `
        DELETE FROM likes
        WHERE user_id = $1 AND target_type = $2 AND target_id = $3
      `;

      const result = await client.query(sql, [userId, targetType, targetId]);
      return result.rowCount > 0;
    });
  }
  
  /**
   * Simple like method (wrapper for likeTarget)
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {string|number} targetId - Target ID
   * @returns {Promise<Object>} Like object
   */
  async like(userId, targetType, targetId) {
    return this.likeTarget({ userId, targetType, targetId });
  }
  
  /**
   * Simple unlike method (wrapper for unlikeTarget)
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {string|number} targetId - Target ID
   * @returns {Promise<boolean>} Success status
   */
  async unlike(userId, targetType, targetId) {
    return this.unlikeTarget({userId, targetType, targetId});
  }

  /**
   * Check if user liked a target
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @returns {Promise<boolean>} True if liked
   */
  async hasUserLiked(userId, targetType, targetId) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM likes
        WHERE user_id = $1 AND target_type = $2 AND target_id = $3
      ) as has_liked
    `;

    const result = await query(sql, [userId, targetType, targetId]);
    return result.rows[0].has_liked;
  }

  /**
   * Get like by ID
   * @param {number} id - Like ID
   * @returns {Promise<Object|null>} Like or null
   */
  async getLikeById(id) {
    const sql = `
      SELECT l.*, u.username, u.name as user_name, u.avatar_url
      FROM likes l
      INNER JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `;

    const result = await query(sql, [id]);
    return result.rows[0] ? this._formatLike(result.rows[0]) : null;
  }

  /**
   * Get likes for a target
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of likes
   */
  async getLikesForTarget({
    targetType,
    targetId,
    reactionType = 'like',
    includeUser = true,
    limit = 50,
    offset = 0
  }) {
    let sql = `
      SELECT l.*, u.username, u.name as user_name, u.avatar_url, u.bio
      FROM likes l
      INNER JOIN users u ON l.user_id = u.id
      WHERE l.target_type = $1 AND l.target_id = $2
    `;

    const values = [targetType, targetId];
    let paramIndex = 3;

    if (reactionType) {
      sql += ` AND l.reaction_type = $${paramIndex++}`;
      values.push(reactionType);
    }

    sql += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(sql, values);
    
    return result.rows.map(row => {
      const like = this._formatLike(row);
      if (includeUser) {
        like.user = {
          id: row.user_id,
          username: row.username,
          name: row.user_name,
          avatarUrl: row.avatar_url,
          bio: row.bio
        };
      }
      return like;
    });
  }

  /**
   * Get user's likes
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of likes
   */
  async getUserLikes({
    userId,
    targetType = null,
    limit = 50,
    offset = 0
  }) {
    let sql = `
      SELECT l.*
      FROM likes l
      WHERE l.user_id = $1
    `;

    const values = [userId];
    let paramIndex = 2;

    if (targetType) {
      sql += ` AND l.target_type = $${paramIndex++}`;
      values.push(targetType);
    }

    sql += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows.map(row => this._formatLike(row));
  }

  /**
   * Get like count for a target
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @param {string} reactionType - Optional reaction type filter
   * @returns {Promise<number>} Like count
   */
  async getLikeCount(targetId, targetType, reactionType = 'like') {
    let sql = `
      SELECT COUNT(*) as count
      FROM likes
      WHERE target_type = $1 AND target_id = $2
    `;

    const values = [targetType, targetId];

    if (reactionType) {
      sql += ' AND reaction_type = $3';
      values.push(reactionType);
    }

    const result = await query(sql, values);
    console.log(result.rows);
    console.log(values)
    return parseInt(result.rows[0].count);
  }

  /**
   * Get like counts by reaction type for a target
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @returns {Promise<Object>} Object with counts per reaction type
   */
  async getLikeCountsByReaction(targetType, targetId) {
    const sql = `
      SELECT reaction_type, COUNT(*) as count
      FROM likes
      WHERE target_type = $1 AND target_id = $2
      GROUP BY reaction_type
    `;

    const result = await query(sql, [targetType, targetId]);
    
    const counts = {
      like: 0,
      love: 0,
      celebrate: 0,
      support: 0,
      inspire: 0,
      total: 0
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      counts[row.reaction_type] = count;
      counts.total += count;
    });

    return counts;
  }

  /**
   * Bulk check like status for multiple targets
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {Array<number>} targetIds - Array of target IDs
   * @returns {Promise<Object>} Map of targetId -> hasLiked
   */
  async bulkCheckLikeStatus(userId, targetType, targetIds) {
    if (!targetIds || targetIds.length === 0) return {};

    const sql = `
      SELECT target_id, true as has_liked
      FROM likes
      WHERE user_id = $1 AND target_type = $2 AND target_id = ANY($3)
    `;

    const result = await query(sql, [userId, targetType, targetIds]);
    
    const likeStatus = {};
    targetIds.forEach(id => likeStatus[id] = false);
    result.rows.forEach(row => likeStatus[row.target_id] = true);
    
    return likeStatus;
  }

  /**
   * Get users who liked a target
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users who liked
   */
  async getUsersWhoLiked(targetType, targetId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT u.id, u.username, u.name, u.avatar_url, u.bio,
             l.reaction_type, l.created_at as liked_at
      FROM likes l
      INNER JOIN users u ON l.user_id = u.id
      WHERE l.target_type = $1 AND l.target_id = $2
      ORDER BY l.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(sql, [targetType, targetId, limit, offset]);
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      reactionType: row.reaction_type,
      likedAt: row.liked_at
    }));
  }

  /**
   * Delete like
   * @param {number} id - Like ID
   * @param {number} userId - User ID for ownership check
   * @returns {Promise<boolean>} Success status
   */
  async deleteLike(id, userId) {
    const sql = `
      DELETE FROM likes
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await query(sql, [id, userId]);
    return result.rowCount > 0;
  }

  /**
   * Delete all likes for a specific target
   * @param {string} targetType - Target type
   * @param {number|string} targetId - Target ID (can be string for MongoDB ObjectIds)
   * @returns {Promise<number>} Number of likes deleted
   */
  async deleteLikesByTarget(targetType, targetId) {
    const sql = `
      DELETE FROM likes
      WHERE target_type = $1 AND target_id = $2
      RETURNING id
    `;

    const result = await query(sql, [targetType, String(targetId)]);
    return result.rowCount;
  }

  /**
   * Get total likes count for user (likes user has given)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total likes count
   */
  async getUserTotalLikesGiven(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM likes
      WHERE user_id = $1
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get total likes received by user (on their goals)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total likes received
   */
  async getUserTotalLikesReceived(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM likes l
      INNER JOIN goals g ON l.target_id = g.id
      WHERE l.target_type = 'goal' 
        AND g.user_id = $1 
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get most liked targets of a specific type
   * @param {string} targetType - Target type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of most liked targets
   */
  async getMostLikedTargets(targetType, { limit = 10, days = 30 } = {}) {
    const sql = `
      SELECT target_id, COUNT(*) as like_count
      FROM likes
      WHERE target_type = $1 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY target_id
      ORDER BY like_count DESC
      LIMIT $2
    `;

    const result = await query(sql, [targetType, limit]);
    return result.rows.map(row => ({
      targetId: row.target_id,
      likeCount: parseInt(row.like_count)
    }));
  }

  /**
   * Get recent likes activity for feed
   * @param {Array<number>} userIds - Array of user IDs to get activity for
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of recent likes
   */
  async getRecentLikesActivity(userIds, { limit = 20, offset = 0 } = {}) {
    if (!userIds || userIds.length === 0) return [];

    const sql = `
      SELECT l.*, u.username, u.name as user_name, u.avatar_url
      FROM likes l
      INNER JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ANY($1)
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [userIds, limit, offset]);
    return result.rows.map(row => this._formatLike(row));
  }

  /**
   * Format like data from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted like
   */
  _formatLike(row) {
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      targetType: row.target_type,
      targetId: row.target_id,
      reactionType: row.reaction_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Optional joined user data
      username: row.username,
      userName: row.user_name,
      avatarUrl: row.avatar_url
    };
  }
}

module.exports = new PgLikeService();
