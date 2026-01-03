/**
 * PostgreSQL Block Service
 * Handles all user blocking operations for PostgreSQL
 */

const { query, getClient, transaction } = require('../config/supabase');

class PgBlockService {
  /**
   * Block a user
   * @param {number} blockerId - ID of user doing the blocking
   * @param {number} blockedId - ID of user being blocked
   * @returns {Promise<Object>} Block relationship
   */
  async blockUser(blockerId, blockedId) {
    // Prevent self-block
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    return await transaction(async (client) => {
      // Check if block relationship already exists
      const existingSql = `
        SELECT * FROM blocks
        WHERE blocker_id = $1 AND blocked_id = $2
      `;
      const existingResult = await client.query(existingSql, [blockerId, blockedId]);

      let block;
      if (existingResult.rows.length > 0) {
        // Reactivate existing block
        const updateSql = `
          UPDATE blocks
          SET is_active = true
          WHERE blocker_id = $1 AND blocked_id = $2
          RETURNING *
        `;
        const updateResult = await client.query(updateSql, [blockerId, blockedId]);
        block = updateResult.rows[0];
      } else {
        // Create new block
        const insertSql = `
          INSERT INTO blocks (blocker_id, blocked_id, is_active)
          VALUES ($1, $2, true)
          RETURNING *
        `;
        const insertResult = await client.query(insertSql, [blockerId, blockedId]);
        block = insertResult.rows[0];
      }

      // Remove any existing follow relationships
      await client.query(`
        UPDATE follows
        SET is_active = false
        WHERE (follower_id = $1 AND following_id = $2)
           OR (follower_id = $2 AND following_id = $1)
      `, [blockerId, blockedId]);

      return this._formatBlock(block);
    });
  }

  /**
   * Unblock a user
   * @param {number} blockerId - ID of user doing the unblocking
   * @param {number} blockedId - ID of user being unblocked
   * @returns {Promise<boolean>} Success status
   */
  async unblockUser(blockerId, blockedId) {
    const sql = `
      DELETE FROM blocks
      WHERE blocker_id = $1 AND blocked_id = $2
      RETURNING id
    `;

    const result = await query(sql, [blockerId, blockedId]);
    return result.rowCount > 0;
  }

  /**
   * Check if user A has blocked user B
   * @param {number} blockerId - Blocker user ID
   * @param {number} blockedId - Blocked user ID
   * @returns {Promise<boolean>} True if blocked
   */
  async isBlocking(blockerId, blockedId) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM blocks
        WHERE blocker_id = $1 AND blocked_id = $2 AND is_active = true
      ) as is_blocking
    `;

    const result = await query(sql, [blockerId, blockedId]);
    return result.rows[0].is_blocking;
  }

  /**
   * Check if there's a block relationship between two users (either direction)
   * @param {number} userA - First user ID
   * @param {number} userB - Second user ID
   * @returns {Promise<boolean>} True if either user blocks the other
   */
  async isBlockedBetween(userA, userB) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM blocks
        WHERE ((blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1))
          AND is_active = true
      ) as is_blocked
    `;

    const result = await query(sql, [userA, userB]);
    return result.rows[0].is_blocked;
  }

  /**
   * Get block relationship
   * @param {number} blockerId - Blocker user ID
   * @param {number} blockedId - Blocked user ID
   * @returns {Promise<Object|null>} Block relationship or null
   */
  async getBlockRelationship(blockerId, blockedId) {
    const sql = `
      SELECT b.*,
             u1.username as blocker_username, u1.name as blocker_name,
             u2.username as blocked_username, u2.name as blocked_name
      FROM blocks b
      INNER JOIN users u1 ON b.blocker_id = u1.id
      INNER JOIN users u2 ON b.blocked_id = u2.id
      WHERE b.blocker_id = $1 AND b.blocked_id = $2 AND b.is_active = true
    `;

    const result = await query(sql, [blockerId, blockedId]);
    return result.rows[0] ? this._formatBlock(result.rows[0]) : null;
  }

  /**
   * Get list of users blocked by a user
   * @param {number} blockerId - Blocker user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of blocked users
   */
  async getBlockedUsers(blockerId, { limit = 50, offset = 0, includeUser = true } = {}) {
    let sql = `
      SELECT b.*,
             u.id as blocked_user_id, u.username, u.name, u.avatar_url, u.bio
      FROM blocks b
      INNER JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = $1 AND b.is_active = true
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [blockerId, limit, offset]);
    
    if (includeUser) {
      return result.rows.map(row => ({
        ...this._formatBlock(row),
        user: {
          id: row.blocked_user_id,
          username: row.username,
          name: row.name,
          avatarUrl: row.avatar_url,
          bio: row.bio
        }
      }));
    }

    return result.rows.map(row => this._formatBlock(row));
  }

  /**
   * Get list of users who blocked a user
   * @param {number} blockedId - Blocked user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of blocker users
   */
  async getBlockersOfUser(blockedId, { limit = 50, offset = 0, includeUser = true } = {}) {
    let sql = `
      SELECT b.*,
             u.id as blocker_user_id, u.username, u.name, u.avatar_url, u.bio
      FROM blocks b
      INNER JOIN users u ON b.blocker_id = u.id
      WHERE b.blocked_id = $1 AND b.is_active = true
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [blockedId, limit, offset]);
    
    if (includeUser) {
      return result.rows.map(row => ({
        ...this._formatBlock(row),
        user: {
          id: row.blocker_user_id,
          username: row.username,
          name: row.name,
          avatarUrl: row.avatar_url,
          bio: row.bio
        }
      }));
    }

    return result.rows.map(row => this._formatBlock(row));
  }

  /**
   * Get blocked user IDs for filtering (users current user has blocked)
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of blocked user IDs
   */
  async getBlockedUserIds(userId) {
    const sql = `
      SELECT blocked_id
      FROM blocks
      WHERE blocker_id = $1 AND is_active = true
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(row => row.blocked_id);
  }

  /**
   * Get blocker user IDs (users who have blocked the current user)
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of blocker user IDs
   */
  async getBlockerUserIds(userId) {
    const sql = `
      SELECT blocker_id
      FROM blocks
      WHERE blocked_id = $1 AND is_active = true
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(row => row.blocker_id);
  }

  /**
   * Get blocked sets for filtering (both outgoing and incoming blocks)
   * Used for content filtering - exclude both users you blocked and users who blocked you
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Object with blockedOut and blockedIn arrays
   */
  async getBlockedSets(userId) {
    const [blockedOut, blockedIn] = await Promise.all([
      this.getBlockedUserIds(userId),
      this.getBlockerUserIds(userId)
    ]);

    return {
      blockedOut,  // Users current user has blocked
      blockedIn,   // Users who have blocked current user
      allBlocked: [...new Set([...blockedOut, ...blockedIn])] // Combined unique list
    };
  }

  /**
   * Bulk check block status for multiple users
   * @param {number} userId - Current user ID
   * @param {Array<number>} targetUserIds - Array of user IDs to check
   * @returns {Promise<Object>} Object with blocking and blockedBy status
   */
  async bulkCheckBlockStatus(userId, targetUserIds) {
    if (!targetUserIds || targetUserIds.length === 0) {
      return { blocking: {}, blockedBy: {} };
    }

    const blockingSql = `
      SELECT blocked_id, true as is_blocking
      FROM blocks
      WHERE blocker_id = $1 AND blocked_id = ANY($2) AND is_active = true
    `;

    const blockedBySql = `
      SELECT blocker_id, true as is_blocked_by
      FROM blocks
      WHERE blocked_id = $1 AND blocker_id = ANY($2) AND is_active = true
    `;

    const [blockingResult, blockedByResult] = await Promise.all([
      query(blockingSql, [userId, targetUserIds]),
      query(blockedBySql, [userId, targetUserIds])
    ]);

    const blocking = {};
    const blockedBy = {};

    targetUserIds.forEach(id => {
      blocking[id] = false;
      blockedBy[id] = false;
    });

    blockingResult.rows.forEach(row => blocking[row.blocked_id] = true);
    blockedByResult.rows.forEach(row => blockedBy[row.blocker_id] = true);

    return { blocking, blockedBy };
  }

  /**
   * Get block count for user (how many users they've blocked)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Block count
   */
  async getBlockedCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM blocks
      WHERE blocker_id = $1 AND is_active = true
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Filter user IDs by removing blocked relationships
   * Utility function to clean user ID arrays for queries
   * @param {number} currentUserId - Current user ID
   * @param {Array<number>} userIds - Array of user IDs to filter
   * @returns {Promise<Array<number>>} Filtered array without blocked users
   */
  async filterBlockedUsers(currentUserId, userIds) {
    if (!userIds || userIds.length === 0) return [];

    const sql = `
      SELECT DISTINCT user_id
      FROM (
        SELECT UNNEST($1::bigint[]) as user_id
      ) all_users
      WHERE user_id != $2
        AND NOT EXISTS (
          SELECT 1 FROM blocks
          WHERE ((blocker_id = $2 AND blocked_id = user_id)
             OR (blocker_id = user_id AND blocked_id = $2))
            AND is_active = true
        )
    `;

    const result = await query(sql, [userIds, currentUserId]);
    return result.rows.map(row => row.user_id);
  }

  /**
   * Delete block relationship permanently
   * @param {number} blockerId - Blocker user ID
   * @param {number} blockedId - Blocked user ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteBlock(blockerId, blockedId) {
    const sql = `
      DELETE FROM blocks
      WHERE blocker_id = $1 AND blocked_id = $2
      RETURNING id
    `;

    const result = await query(sql, [blockerId, blockedId]);
    return result.rowCount > 0;
  }

  /**
   * Get SQL WHERE clause for filtering blocked users in queries
   * Helper function to use in other services
   * @param {number} userId - Current user ID
   * @param {string} userColumnName - Name of the user ID column to filter
   * @returns {Promise<string>} SQL WHERE clause
   */
  async getBlockFilterClause(userId, userColumnName = 'user_id') {
    const blockedSets = await this.getBlockedSets(userId);
    const allBlocked = blockedSets.allBlocked;

    if (allBlocked.length === 0) {
      return '';
    }

    return `AND ${userColumnName} NOT IN (${allBlocked.join(',')})`;
  }

  /**
   * Format block data from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted block
   */
  _formatBlock(row) {
    if (!row) return null;

    return {
      id: row.id,
      blockerId: row.blocker_id,
      blockedId: row.blocked_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Optional joined user data
      blockerUsername: row.blocker_username,
      blockerName: row.blocker_name,
      blockedUsername: row.blocked_username,
      blockedName: row.blocked_name
    };
  }
}

module.exports = new PgBlockService();
