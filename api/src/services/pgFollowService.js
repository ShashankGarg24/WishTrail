/**
 * PostgreSQL Follow Service
 * Handles all follow/following relationship operations for PostgreSQL
 */

const { query, transaction } = require('../config/supabase');

class PgFollowService {
  /**
   * Follow a user
   * @param {number} followerId - ID of user doing the following
   * @param {number} followingId - ID of user being followed
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Follow relationship
   */
  async followUser(followerId, followingId, options = {}) {
    const {
      status = 'accepted',
    } = options;

    // Prevent self-follow
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    return await transaction(async (client) => {
      // Check if follow relationship already exists
      const existingSql = `
        SELECT * FROM follows
        WHERE follower_id = $1 AND following_id = $2
      `;
      const existingResult = await client.query(existingSql, [followerId, followingId]);

      let follow;
      if (existingResult.rows.length > 0) {
        // Reactivate existing follow
        const updateSql = `
          DELETE FROM follows
          WHERE follower_id = $3 AND following_id = $4
          RETURNING *
        `;
        const updateResult = await client.query(updateSql, [
          status, followerId, followingId
        ]);
        follow = updateResult.rows[0];
      } else {
        // Create new follow
        const insertSql = `
          INSERT INTO follows (
            follower_id, following_id, status
          ) VALUES ($1, $2, $3)
          RETURNING *
        `;
        const insertResult = await client.query(insertSql, [
          followerId, followingId, status
        ]);
        follow = insertResult.rows[0];
      }

      // Note: Follower counts are updated automatically by triggers

      return this._formatFollow(follow);
    });
  }

  /**
   * Unfollow a user
   * @param {number} followerId - ID of user doing the unfollowing
   * @param {number} followingId - ID of user being unfollowed
   * @returns {Promise<boolean>} Success status
   */
  async unfollowUser(followerId, followingId) {
    return await transaction(async (client) => {
      const sql = `
        DELETE FROM follows
        WHERE follower_id = $1 AND following_id = $2
      `;
      
      await client.query(sql, [followerId, followingId]);
      return true;
    });
  }

  /**
   * Check if user A follows user B
   * @param {number} followerId - Follower user ID
   * @param {number} followingId - Following user ID
   * @returns {Promise<boolean>} True if following
   */
  async isFollowing(followerId, followingId) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = $1 AND following_id = $2
      ) as is_following
    `;

    const result = await query(sql, [followerId, followingId]);
    return result.rows[0].is_following;
  }

  /**
   * Get follow relationship between two users
   * @param {number} followerId - Follower user ID
   * @param {number} followingId - Following user ID
   * @returns {Promise<Object|null>} Follow relationship or null
   */
  async getFollowRelationship(followerId, followingId) {
    const sql = `
      SELECT f.*,
             u1.username as follower_username, u1.name as follower_name, u1.avatar_url as follower_avatar,
             u2.username as following_username, u2.name as following_name, u2.avatar_url as following_avatar
      FROM follows f
      INNER JOIN users u1 ON f.follower_id = u1.id
      INNER JOIN users u2 ON f.following_id = u2.id
      WHERE f.follower_id = $1 AND f.following_id = $2
    `;

    const result = await query(sql, [followerId, followingId]);
    return result.rows[0] ? this._formatFollow(result.rows[0]) : null;
  }

  /**
   * Get user's followers
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of followers
   */
  async getFollowers({
    userId,
    status = 'accepted',
    limit = 50,
    offset = 0,
    includeUser = true
  }) {
    let sql = `
      SELECT f.*,
             u.id as follower_id, u.username, u.name, u.email, u.avatar_url, u.bio,
             u.total_goals, u.completed_goals, u.followers_count, u.following_count
      FROM follows f
      INNER JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
    `;

    const values = [userId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND f.status = $${paramIndex++}`;
      values.push(status);
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(sql, values);
    
    if (includeUser) {
      return result.rows.map(row => ({
        ...this._formatFollow(row),
        user: {
          id: row.follower_id,
          username: row.username,
          name: row.name,
          email: row.email,
          avatarUrl: row.avatar_url,
          bio: row.bio,
          totalGoals: row.total_goals,
          completedGoals: row.completed_goals,
          followersCount: row.followers_count,
          followingCount: row.following_count
        }
      }));
    }

    return result.rows.map(row => this._formatFollow(row));
  }

  /**
   * Get users that a user is following
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of following users
   */
  async getFollowing({
    userId,
    status = 'accepted',
    limit = 50,
    offset = 0,
    includeUser = true
  }) {
    let sql = `
      SELECT f.*,
             u.id as following_user_id, u.username, u.name, u.email, u.avatar_url, u.bio,
             u.total_goals, u.completed_goals, u.followers_count, u.following_count
      FROM follows f
      INNER JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
    `;

    const values = [userId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND f.status = $${paramIndex++}`;
      values.push(status);
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(sql, values);
    
    if (includeUser) {
      return result.rows.map(row => ({
        ...this._formatFollow(row),
        user: {
          id: row.following_user_id,
          username: row.username,
          name: row.name,
          email: row.email,
          avatarUrl: row.avatar_url,
          bio: row.bio,
          totalGoals: row.total_goals,
          completedGoals: row.completed_goals,
          followersCount: row.followers_count,
          followingCount: row.following_count
        }
      }));
    }

    return result.rows.map(row => this._formatFollow(row));
  }

  /**
   * Get mutual follows (friends)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of mutual follow users
   */
  async getMutualFollows(userId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT DISTINCT u.id, u.username, u.name, u.email, u.avatar_url, u.bio,
             u.total_goals, u.completed_goals, u.followers_count, u.following_count
      FROM users u
      WHERE u.id IN (
        SELECT f1.following_id
        FROM follows f1
        INNER JOIN follows f2 ON f1.following_id = f2.follower_id
        WHERE f1.follower_id = $1 
          AND f2.following_id = $1
      )
      ORDER BY u.username ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [userId, limit, offset]);
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      totalGoals: row.total_goals,
      completedGoals: row.completed_goals,
      followersCount: row.followers_count,
      followingCount: row.following_count
    }));
  }

  /**
   * Get mutual followers between two users
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {Promise<number>} Count of mutual followers
   */
  async getMutualFollowers(userId1, userId2) {
    const sql = `
      SELECT COUNT(*) as count
      FROM follows f1
      INNER JOIN follows f2 ON f1.follower_id = f2.follower_id
      WHERE f1.following_id = $1 
        AND f2.following_id = $2
    `;

    const result = await query(sql, [userId1, userId2]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if two users mutually follow each other
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {Promise<boolean>} True if mutual follows
   */
  async areMutualFollows(userId1, userId2) {
    const sql = `
      SELECT EXISTS(
        SELECT 1 FROM follows f1
        INNER JOIN follows f2 ON f1.following_id = f2.follower_id
        WHERE f1.follower_id = $1 
          AND f2.following_id = $1
          AND f1.following_id = $2
      ) as are_mutual
    `;

    const result = await query(sql, [userId1, userId2]);
    return result.rows[0].are_mutual;
  }

  /**
   * Get follower IDs for a user (for filtering/blocking logic)
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of follower IDs
   */
  async getFollowerIds(userId) {
    const sql = `
      SELECT follower_id
      FROM follows
      WHERE following_id = $1 AND status = 'accepted'
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(row => row.follower_id);
  }

  /**
   * Get following IDs for a user (for filtering/blocking logic)
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of following IDs
   */
  async getFollowingIds(userId) {
    const sql = `
      SELECT following_id
      FROM follows
      WHERE follower_id = $1 AND status = 'accepted'
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(row => row.following_id);
  }

  /**
   * Get followers count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Followers count
   */
  async getFollowersCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM follows
      WHERE following_id = $1 AND status = 'accepted'
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get following count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Following count
   */
  async getFollowingCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM follows
      WHERE follower_id = $1 AND status = 'accepted'
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get follow suggestions for user (users not followed yet, with mutual connections)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of suggested users
   */
  async getFollowSuggestions(userId, { limit = 10 } = {}) {
    const sql = `
      WITH user_following AS (
        SELECT following_id FROM follows WHERE follower_id = $1
      ),
      potential_follows AS (
        SELECT DISTINCT f.following_id as suggested_id,
               COUNT(*) as mutual_count
        FROM follows f
        WHERE f.follower_id IN (SELECT following_id FROM user_following)
          AND f.following_id != $1
          AND f.following_id NOT IN (SELECT following_id FROM user_following)
        GROUP BY f.following_id
        ORDER BY mutual_count DESC
        LIMIT $2
      )
      SELECT u.id, u.username, u.name, u.avatar_url, u.bio,
             u.total_goals, u.completed_goals, u.followers_count, u.following_count,
             pf.mutual_count
      FROM potential_follows pf
      INNER JOIN users u ON pf.suggested_id = u.id
    `;

    const result = await query(sql, [userId, limit]);
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      totalGoals: row.total_goals,
      completedGoals: row.completed_goals,
      followersCount: row.followers_count,
      followingCount: row.following_count,
      mutualCount: parseInt(row.mutual_count)
    }));
  }

  /**
   * Remove follower (block them from following you)
   * @param {number} userId - User ID
   * @param {number} followerId - Follower to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeFollower(userId, followerId) {
    const sql = `
      DELETE FROM follows
      WHERE follower_id = $1 AND following_id = $2
      RETURNING id
    `;

    const result = await query(sql, [followerId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Request to follow a private user
   * @param {number} followerId - ID of user requesting to follow
   * @param {number} followingId - ID of user to follow
   * @returns {Promise<Object>} Follow request
   */
  async requestFollow(followerId, followingId) {
    return await this.followUser(followerId, followingId, { status: 'pending' });
  }

  /**
   * Accept a follow request
   * @param {number} followerId - ID of user who requested to follow
   * @param {number} followingId - ID of user accepting the request
   * @returns {Promise<Object>} Updated follow relationship
   */
  async acceptFollowRequest(followerId, followingId) {
    return await transaction(async (client) => {
      const sql = `
        UPDATE follows
        SET status = 'accepted', 
            created_at = CURRENT_TIMESTAMP
        WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
        RETURNING *
      `;

      const result = await client.query(sql, [followerId, followingId]);
      
      if (result.rowCount === 0) {
        throw new Error('Follow request not found');
      }

      return this._formatFollow(result.rows[0]);
    });
  }

  /**
   * Reject a follow request
   * @param {number} followerId - ID of user who requested to follow
   * @param {number} followingId - ID of user rejecting the request
   * @returns {Promise<boolean>} Success status
   */
  async rejectFollowRequest(followerId, followingId) {
    console.log('Rejecting follow request:', followerId, followingId);
    const sql = `
      DELETE FROM follows
      WHERE follower_id = $1 AND following_id = $2 AND status = 'pending';
    `;

    const result = await query(sql, [followerId, followingId]);
    return result.rowCount > 0;
  }

  /**
   * Get pending follow requests for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of pending follow requests
   */
  async getPendingRequests(userId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT f.*,
             u.id as follower_user_id, u.username, u.name, u.avatar_url, u.bio
      FROM follows f
      INNER JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      ...this._formatFollow(row),
      user: {
        id: row.follower_user_id,
        username: row.username,
        name: row.name,
        avatarUrl: row.avatar_url,
        bio: row.bio
      }
    }));
  }

  /**
   * Count pending follow requests for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Count of pending requests
   */
  async countPendingRequests(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM follows
      WHERE following_id = $1 AND status = 'pending'
    `;

    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Bulk check follow status for multiple users
   * @param {number} userId - Current user ID
   * @param {Array<number>} targetUserIds - Array of user IDs to check
   * @returns {Promise<Object>} Map of userId -> isFollowing
   */
  async bulkCheckFollowStatus(userId, targetUserIds) {
    if (!targetUserIds || targetUserIds.length === 0) return {};

    const sql = `
      SELECT following_id, true as is_following
      FROM follows
      WHERE follower_id = $1 AND following_id = ANY($2)
    `;

    const result = await query(sql, [userId, targetUserIds]);
    
    const followStatus = {};
    targetUserIds.forEach(id => followStatus[id] = false);
    result.rows.forEach(row => followStatus[row.following_id] = true);
    
    return followStatus;
  }

  /**
   * Get following status for a single user
   * @param {number} followerId - Current user ID
   * @param {number} followingId - Target user ID
   * @returns {Promise<Object>} Object with isFollowing and isRequested flags
   */
  async getFollowingStatus(followerId, followingId) {
    const sql = `
      SELECT status
      FROM follows
      WHERE follower_id = $1 AND following_id = $2
      LIMIT 1
    `;

    const result = await query(sql, [followerId, followingId]);
    
    if (result.rows.length === 0) {
      return { isFollowing: false, isRequested: false };
    }

    const row = result.rows[0];
    return {
      isFollowing: row.status === 'accepted',
      isRequested: row.status === 'pending'
    };
  }

  /**
   * Get following status for multiple users (bulk)
   * @param {number} followerId - Current user ID
   * @param {Array<number>} targetUserIds - Array of target user IDs
   * @returns {Promise<Object>} Map of userId -> {isFollowing, isRequested}
   */
  async getFollowingStatusBulk(followerId, targetUserIds) {
    if (!targetUserIds || targetUserIds.length === 0) return {};

    const sql = `
      SELECT following_id, status
      FROM follows
      WHERE follower_id = $1 AND following_id = ANY($2)
    `;

    const result = await query(sql, [followerId, targetUserIds]);
    
    const statusMap = {};
    targetUserIds.forEach(id => {
      statusMap[id] = { isFollowing: false, isRequested: false };
    });
    
    result.rows.forEach(row => {
      statusMap[row.following_id] = {
        isFollowing: row.status === 'accepted',
        isRequested: row.status === 'pending'
      };
    });
    
    return statusMap;
  }

  /**
   * Format follow data from database
   * @param {Object} row - Database row
   * @returns {Object} Formatted follow
   */
  _formatFollow(row) {
    if (!row) return null;

    return {
      followerId: row.follower_id,
      followingId: row.following_id,
      status: row.status,
      createdAt: row.created_at,
      // Optional joined user data
      followerUsername: row.follower_username,
      followerName: row.follower_name,
      followerAvatar: row.follower_avatar,
      followingUsername: row.following_username,
      followingName: row.following_name,
      followingAvatar: row.following_avatar
    };
  }
}

module.exports = new PgFollowService();
