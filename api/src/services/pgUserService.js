const { pool, query, getClient, transaction } = require('../config/supabase');
const bcrypt = require('bcryptjs');

/**
 * PostgreSQL Service Layer for User operations
 * Handles all user-related database operations in PostgreSQL
 */
class UserService {
  /**
   * Create a new user
   */
  async createUser({ name, username, email, password, google_id = null, is_active = true, dateOfBirth = null, location = '', website = null, gender = null, avatar_url = null, bio = '', isPrivate = false, isVerified = false, profileCompleted = false, timezone = 'UTC', locale = 'en-US' }) {
    // Hash password only if provided (not required for OAuth users)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const queryText = `
      INSERT INTO users (name, username, email, password, date_of_birth, location, gender, avatar_url, bio, is_private, is_verified, profile_completed, timezone, locale, google_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, username, email, avatar_url, bio, location, date_of_birth, gender,
                total_goals, completed_goals, current_streak, longest_streak,
                followers_count, following_count, is_private, is_active, is_verified, profile_completed,
                timezone, locale, premium_expires_at, created_at, updated_at, last_active_at
    `;
    
    const result = await query(queryText, [
      name, 
      username ? username.toLowerCase() : null, 
      email.toLowerCase(), 
      hashedPassword, 
      dateOfBirth,
      location,
      gender,
      avatar_url,
      bio,
      isPrivate,
      isVerified,
      profileCompleted,
      timezone,
      locale,
      google_id
    ]);
    
    return result.rows[0];
  }

  /**
   * Create user with pre-hashed password (for migration)
   * @param {Object} userData - User data with already hashed password
   * @returns {Promise<Object>} Created user
   */
  async createUserWithHashedPassword(userData) {
    const {
      name,
      username,
      email,
      password, // Already hashed
      bio = '',
      avatarUrl = null,
      coverImageUrl = null,
      location = null,
      website = null,
      dateOfBirth = null,
      gender = null,
      totalGoals = 0,
      completedGoals = 0,
      followersCount = 0,
      followingCount = 0,
      isVerified = false,
      isActive = true
    } = userData;

    const sql = `
      INSERT INTO users (
        name, username, email, password, bio, avatar_url,
        location, date_of_birth, gender, total_goals, completed_goals,
        followers_count, following_count, is_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, username, email, bio, avatar_url,
                location, date_of_birth, gender, total_goals, completed_goals,
                followers_count, following_count, is_verified, is_active,
                timezone, locale, premium_expires_at, created_at, updated_at
    `;

    const result = await query(sql, [
      name,
      username.toLowerCase(),
      email.toLowerCase(),
      password, // Use pre-hashed password directly
      bio,
      avatarUrl,
      location,
      dateOfBirth,
      gender,
      totalGoals,
      completedGoals,
      followersCount,
      followingCount,
      isVerified,
      isActive
    ]);

    return result.rows[0];
  }
  
  /**
   * Find user by email
   */
  async findByEmail(email, includePassword = false) {
    const fields = includePassword 
      ? 'id, name, username, email, password, avatar_url, bio, location, date_of_birth, gender, total_goals, completed_goals, current_streak, longest_streak, followers_count, following_count, is_private, is_active, is_verified, profile_completed, refresh_token_app, refresh_token_web, timezone, locale, premium_expires_at, created_at, updated_at, last_active_at'
      : 'id, name, username, email, avatar_url, bio, location, date_of_birth, gender, total_goals, completed_goals, current_streak, longest_streak, followers_count, following_count, is_private, is_active, is_verified, profile_completed, timezone, locale, premium_expires_at, created_at, updated_at, last_active_at';
    
    const queryText = `SELECT ${fields} FROM users WHERE email = $1 AND is_active = true`;
    const result = await query(queryText, [email.toLowerCase()]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Find user by ID
   */
  async findById(id, includePassword = false) {
    const fields = includePassword 
      ? '*'
      : 'id, name, username, email, avatar_url, bio, location, date_of_birth, gender, total_goals, completed_goals, current_streak, longest_streak, followers_count, following_count, is_private, is_active, is_verified, profile_completed, google_id, timezone, locale, premium_expires_at, created_at, updated_at';
    
    const queryText = `SELECT ${fields} FROM users WHERE id = $1 AND is_active = true`;
    const result = await query(queryText, [id]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Find user by username
   */
  async findByUsername(username, includePassword = false) {
    const fields = includePassword 
      ? '*'
      : 'id, name, username, email, avatar_url, bio, location, date_of_birth, gender, total_goals, completed_goals, current_streak, longest_streak, followers_count, following_count, is_private, is_active, is_verified, profile_completed, timezone, locale, premium_expires_at, created_at, updated_at';
    
    const queryText = `SELECT ${fields} FROM users WHERE username = $1 AND is_active = true`;
    const result = await query(queryText, [username.toLowerCase()]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Get multiple users by IDs
   */
  async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) {
      return [];
    }
    
    const queryText = `
      SELECT id, name, username, email, avatar_url, bio, location, 
             date_of_birth, gender, total_goals, completed_goals, current_streak, longest_streak, 
             followers_count, following_count, is_private, is_active, is_verified, profile_completed, 
             timezone, locale, premium_expires_at, created_at, updated_at, last_active_at
      FROM users 
      WHERE id = ANY($1) AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await query(queryText, [userIds]);
    return result.rows;
  }
  
  /**
   * Update user profile
   */
  async updateUser(id, updates) {
    const allowedFields = ['name', 'username', 'password', 'bio', 'location', 'date_of_birth', 'gender', 'avatar_url', 'is_private', 'is_verified', 'profile_completed', 'google_id', 'timezone', 'locale'];
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
    
    values.push(id);
    const queryText = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING id, name, username, email, avatar_url, bio, location, date_of_birth, gender,
                total_goals, completed_goals, current_streak, longest_streak,
                followers_count, following_count, is_private, is_active, is_verified, profile_completed,
                google_id, timezone, locale, premium_expires_at, created_at, updated_at, last_active_at
    `;
    
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }
  
  /**
   * Update user statistics
   */
  async updateStats(id, stats) {
    const allowedFields = ['total_goals', 'completed_goals', 'current_streak', 'longest_streak', 'followers_count', 'following_count'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(stats)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setClause.length === 0) {
      return null;
    }
    
    values.push(id);
    const queryText = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, total_goals, completed_goals, current_streak, longest_streak
    `;
    
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }
  
  /**
   * Increment/decrement user statistics
   */
  async incrementStats(id, increments) {
    const setClause = [];
    const values = [id];
    let paramIndex = 2;
    
    for (const [key, value] of Object.entries(increments)) {
      setClause.push(`${key} = GREATEST(0, ${key} + $${paramIndex})`);
      values.push(value);
      paramIndex++;
    }
    
    const queryText = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, total_goals, completed_goals, current_streak, longest_streak, followers_count, following_count
    `;
    
    const result = await query(queryText, values);
    return result.rows[0] || null;
  }
  
  /**
   * Update password
   */
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const queryText = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id
    `;
    
    const result = await query(queryText, [hashedPassword, id]);
    return result.rows[0] || null;
  }
  
  /**
   * Verify password
   */
  async verifyPassword(id, password) {
    const queryText = 'SELECT password FROM users WHERE id = $1 AND is_active = true';
    const result = await query(queryText, [id]);
    
    if (!result.rows[0]) return false;
    
    return await bcrypt.compare(password, result.rows[0].password);
  }
  
  /**
   * Update last active timestamp
   */
  async updateLastActive(id) {
    const queryText = `
      UPDATE users 
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    await query(queryText, [id]);
  }
  
  /**
   * Soft delete user
   */
  async deleteUser(id) {
    const queryText = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Search users
   */
  async searchUsers({ query: searchQuery, page = 1, limit = 20, excludeIds = [] }) {
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT id, name, username, avatar_url, bio, location,
             total_goals, completed_goals, followers_count, following_count,
             is_private, is_verified, created_at
      FROM users
      WHERE is_active = true
        AND (
          name ILIKE $1 OR 
          username ILIKE $1 OR 
          to_tsvector('english', name || ' ' || username || ' ') @@ plainto_tsquery('english', $2)
        )
    `;
    
    const values = [`%${searchQuery}%`, searchQuery];
    let paramIndex = 3;
    
    if (excludeIds.length > 0) {
      queryText += ` AND id != ALL($${paramIndex})`;
      values.push(excludeIds);
      paramIndex++;
    }
    
    queryText += ` ORDER BY completed_goals DESC, followers_count DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);
    
    const result = await query(queryText, values);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE is_active = true
        AND (name ILIKE $1 OR username ILIKE $1 OR bio ILIKE $1)
    `;
    
    const countValues = [`%${searchQuery}%`];
    if (excludeIds.length > 0) {
      countQuery += ' AND id != ALL($2)';
      countValues.push(excludeIds);
    }
    
    const countResult = await query(countQuery, countValues);
    
    return {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }
  
  /**
   * Get top users by completed goals
   */
  async getTopUsers(limit = 10) {
    const queryText = `
      SELECT id, name, username, avatar_url, bio, location,
             total_goals, completed_goals, current_streak, longest_streak,
             followers_count, following_count, is_verified, created_at
      FROM users
      WHERE is_active = true AND is_private = false
      ORDER BY completed_goals DESC, current_streak DESC, followers_count DESC
      LIMIT $1
    `;
    
    const result = await query(queryText, [limit]);
    return result.rows;
  }
  
  /**
   * Check if username exists
   */
  async usernameExists(username, excludeId = null) {
    let queryText = 'SELECT id FROM users WHERE username = $1';
    const values = [username.toLowerCase()];
    
    if (excludeId) {
      queryText += ' AND id != $2';
      values.push(excludeId);
    }
    
    const result = await query(queryText, values);
    return result.rows.length > 0;
  }
  
  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    let queryText = 'SELECT id FROM users WHERE email = $1';
    const values = [email.toLowerCase()];
    
    if (excludeId) {
      queryText += ' AND id != $2';
      values.push(excludeId);
    }
    
    const result = await query(queryText, values);
    return result.rows.length > 0;
  }
  
  /**
   * Get user IDs by usernames (bulk lookup)
   */
  async getUserIdsByUsernames(usernames) {
    if (!usernames || usernames.length === 0) return [];
    
    const queryText = `
      SELECT id, username
      FROM users
      WHERE username = ANY($1) AND is_active = true
    `;
    
    const result = await query(queryText, [usernames.map(u => u.toLowerCase())]);
    return result.rows;
  }

  // Alias methods for backward compatibility
  async getUserByEmail(email, includePassword = false) {
    return this.findByEmail(email, includePassword);
  }

  async getUserById(id, includePassword = false) {
    return this.findById(id, includePassword);
  }

  async getUserByUsername(username, includePassword = false) {
    return this.findByUsername(username, includePassword);
  }

  async updateRefreshToken(userId, kind, token) {
    const field = kind === 'app' ? 'refresh_token_app' : 'refresh_token_web';
    const queryText = `
      UPDATE users
      SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(queryText, [token, userId]);
    return result.rows[0];
  }

  async getRefreshToken(userId, kind) {
    const field = kind === 'app' ? 'refresh_token_app' : 'refresh_token_web';
    const queryText = `SELECT ${field} as token FROM users WHERE id = $1`;
    const result = await query(queryText, [userId]);
    return result.rows[0]?.token || null;
  }

  async clearRefreshTokens(userId) {
    const queryText = `
      UPDATE users
      SET refresh_token_app = NULL, refresh_token_web = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await query(queryText, [userId]);
  }

  /**
   * Get all active users (for cron jobs, notifications)
   */
  async getActiveUsers() {
    const queryText = `
      SELECT id, username, email, name, timezone
      FROM users
      WHERE is_active = true
      ORDER BY id
    `;
    const result = await query(queryText);
    return result.rows;
  }

  /**
   * Get popular users (sorted by followers count and completed goals)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of users to return
   * @returns {Promise<Array>} Popular users
   */
  async getPopularUsers({ limit = 10 } = {}) {
    const queryText = `
      SELECT 
        u.id, 
        u.name, 
        u.username,
        u.avatar_url, 
        u.bio, 
        u.location, 
        u.completed_goals, 
        u.current_streak,
        u.followers_count as follower_count
      FROM users u
      WHERE u.is_active = true
      ORDER BY u.followers_count DESC, u.completed_goals DESC
      LIMIT $1
    `;
    const result = await query(queryText, [limit]);
    return result.rows;
  }

  /**
   * Get leaderboard data
   * @param {Object} options - Query options
   * @param {string} options.type - Leaderboard type ('goals' or 'streak')
   * @param {number} options.limit - Number of users to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Leaderboard users
   */
  async getLeaderboard({ type = 'goals', limit = 50, offset = 0 } = {}) {
    const sortField = type === 'streak' ? 'current_streak' : 'completed_goals';
    const queryText = `
      SELECT 
        id, 
        name, 
        username,
        avatar_url as avatar, 
        completed_goals as "completedGoals",
        total_goals as "totalGoals",
        current_streak as "currentStreak",
        created_at as "createdAt"
      FROM users
      WHERE is_active = true
      ORDER BY ${sortField} DESC, id ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(queryText, [limit, offset]);
    return result.rows;
  }

  /**
   * Get total count for leaderboard
   * @param {Object} options - Query options
   * @returns {Promise<number>} Total count
   */
  async getLeaderboardCount() {
    const queryText = `
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = true
    `;
    const result = await query(queryText);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get user rank for leaderboard
   * @param {number} userId - User ID
   * @param {string} type - Rank type ('goals' or 'streak')
   * @returns {Promise<number>} User rank
   */
  async getUserRank(userId, type = 'goals') {
    const sortField = type === 'streak' ? 'current_streak' : 'completed_goals';
    const queryText = `
      SELECT COUNT(*) + 1 as rank
      FROM users u1
      CROSS JOIN users u2
      WHERE u2.id = $1
        AND u1.is_active = true
        AND u2.is_active = true
        AND u1.${sortField} > u2.${sortField}
    `;
    const result = await query(queryText, [userId]);
    return parseInt(result.rows[0].rank);
  }

  /**
   * Get users by IDs
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Users
   */
  async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    const queryText = `
      SELECT id, name, username, avatar_url
      FROM users
      WHERE id = ANY($1::bigint[])
    `;
    const result = await query(queryText, [userIds]);
    return result.rows;
  }

  /**
   * Update user's premium expiration date
   * @param {number} userId - User ID
   * @param {Date|null} premiumExpiresAt - Premium expiration timestamp (null to remove premium)
   * @returns {Promise<Object>} Updated user
   */
  async updatePremiumExpiration(userId, premiumExpiresAt) {
    const queryText = `
      UPDATE users 
      SET premium_expires_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id, name, username, email, premium_expires_at, updated_at
    `;
    
    const result = await query(queryText, [premiumExpiresAt, userId]);
    return result.rows[0] || null;
  }

  /**
   * Grant premium to user (set expiration date)
   * @param {number} userId - User ID
   * @param {number} durationMonths - Duration in months
   * @returns {Promise<Object>} Updated user
   */
  async grantPremium(userId, durationMonths = 1) {
    // Get current user to check existing premium status
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let expirationDate;
    const now = new Date();
    
    // If user has active premium, extend from current expiration
    if (user.premium_expires_at && new Date(user.premium_expires_at) > now) {
      expirationDate = new Date(user.premium_expires_at);
      expirationDate.setMonth(expirationDate.getMonth() + durationMonths);
    } else {
      // Start from now if no active premium
      expirationDate = new Date(now);
      expirationDate.setMonth(expirationDate.getMonth() + durationMonths);
    }

    return await this.updatePremiumExpiration(userId, expirationDate);
  }

  /**
   * Revoke premium from user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async revokePremium(userId) {
    return await this.updatePremiumExpiration(userId, null);
  }

  /**
   * Get all active premium users
   * @returns {Promise<Array>} Premium users
   */
  async getActivePremiumUsers() {
    const queryText = `
      SELECT id, name, username, email, premium_expires_at, created_at
      FROM users
      WHERE premium_expires_at > CURRENT_TIMESTAMP
        AND is_active = true
      ORDER BY premium_expires_at ASC
    `;
    
    const result = await query(queryText);
    return result.rows;
  }

  /**
   * Get users with premium expiring soon (within X days)
   * @param {number} daysThreshold - Days threshold (default: 7)
   * @returns {Promise<Array>} Users with expiring premium
   */
  async getUsersWithExpiringPremium(daysThreshold = 7) {
    const queryText = `
      SELECT id, name, username, email, premium_expires_at,
             EXTRACT(DAY FROM (premium_expires_at - CURRENT_TIMESTAMP)) as days_remaining
      FROM users
      WHERE premium_expires_at IS NOT NULL
        AND premium_expires_at > CURRENT_TIMESTAMP
        AND premium_expires_at <= CURRENT_TIMESTAMP + INTERVAL '${daysThreshold} days'
        AND is_active = true
      ORDER BY premium_expires_at ASC
    `;
    
    const result = await query(queryText);
    return result.rows;
  }

  /**
   * Get expired premium users (for re-engagement)
   * @param {number} daysAgo - Days since expiration (default: 30)
   * @returns {Promise<Array>} Users with expired premium
   */
  async getExpiredPremiumUsers(daysAgo = 30) {
    const queryText = `
      SELECT id, name, username, email, premium_expires_at,
             EXTRACT(DAY FROM (CURRENT_TIMESTAMP - premium_expires_at)) as days_since_expired
      FROM users
      WHERE premium_expires_at IS NOT NULL
        AND premium_expires_at <= CURRENT_TIMESTAMP
        AND premium_expires_at >= CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days'
        AND is_active = true
      ORDER BY premium_expires_at DESC
    `;
    
    const result = await query(queryText);
    return result.rows;
  }

  /**
   * Get premium statistics
   * @returns {Promise<Object>} Premium stats
   */
  async getPremiumStats() {
    const queryText = `
      SELECT 
        COUNT(CASE WHEN premium_expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_premium_users,
        COUNT(CASE WHEN premium_expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_premium_users,
        COUNT(CASE WHEN premium_expires_at IS NULL THEN 1 END) as free_users,
        COUNT(CASE WHEN premium_expires_at > CURRENT_TIMESTAMP 
                   AND premium_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 1 END) as expiring_soon_users
      FROM users
      WHERE is_active = true
    `;
    
    const result = await query(queryText);
    return result.rows[0];
  }
}

module.exports = new UserService();
