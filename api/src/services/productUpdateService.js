const { query } = require('../config/supabase');

/**
 * PostgreSQL Service Layer for Product Updates
 * Handles all product update related database operations
 */
class ProductUpdateService {
  /**
   * Create a new product update
   */
  async createUpdate({ title, description, version, isMajor = false, type = 'feature' }) {
    const queryText = `
      INSERT INTO product_updates (title, description, version, is_major, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, version, is_major as "isMajor", type, created_at as "createdAt"
    `;
    
    const result = await query(queryText, [title, description, version, isMajor, type]);
    return result.rows[0];
  }

  /**
   * Get all product updates (sorted by created_at DESC)
   */
  async getAllUpdates({ limit = 100, offset = 0 } = {}) {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        version, 
        is_major as "isMajor", 
        type, 
        created_at as "createdAt"
      FROM product_updates
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await query(queryText, [limit, offset]);
    return result.rows;
  }

  /**
   * Get latest major update that user hasn't seen yet
   */
  async getLatestUnseenMajorUpdate(userId) {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        version, 
        is_major as "isMajor", 
        type, 
        created_at as "createdAt"
      FROM product_updates
      WHERE is_major = true
        AND (
          $1::VARCHAR IS NULL 
          OR version > $1
        )
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    // Get user's last seen version first
    const userQuery = `
      SELECT last_seen_update_version as "lastSeenUpdateVersion"
      FROM users
      WHERE id = $1 AND is_active = true
    `;
    const userResult = await query(userQuery, [userId]);
    const lastSeenVersion = userResult.rows[0]?.lastSeenUpdateVersion || null;
    
    const result = await query(queryText, [lastSeenVersion]);
    return result.rows[0] || null;
  }

  /**
   * Get latest major update regardless of user's last seen
   */
  async getLatestMajorUpdate() {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        version, 
        is_major as "isMajor", 
        type, 
        created_at as "createdAt"
      FROM product_updates
      WHERE is_major = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(queryText);
    return result.rows[0] || null;
  }

  /**
   * Get latest product update regardless of type/major flag
   */
  async getLatestUpdate() {
    const queryText = `
      SELECT
        id,
        title,
        description,
        version,
        is_major as "isMajor",
        type,
        created_at as "createdAt"
      FROM product_updates
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query(queryText);
    return result.rows[0] || null;
  }

  /**
   * Mark update as seen by user
   */
  async markUpdateAsSeen(userId, version) {
    const queryText = `
      UPDATE users
      SET last_seen_update_version = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id, last_seen_update_version as "lastSeenUpdateVersion"
    `;
    
    const result = await query(queryText, [version, userId]);
    return result.rows[0] || null;
  }

  /**
   * Get a specific update by version
   */
  async getUpdateByVersion(version) {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        version, 
        is_major as "isMajor", 
        type, 
        created_at as "createdAt"
      FROM product_updates
      WHERE version = $1
    `;
    
    const result = await query(queryText, [version]);
    return result.rows[0] || null;
  }

  /**
   * Get user's last seen update version
   */
  async getUserLastSeenVersion(userId) {
    const queryText = `
      SELECT last_seen_update_version as "lastSeenUpdateVersion"
      FROM users
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await query(queryText, [userId]);
    return result.rows[0]?.lastSeenUpdateVersion || null;
  }

  /**
   * Get count of total updates
   */
  async getUpdateCount() {
    const queryText = `SELECT COUNT(*) as count FROM product_updates`;
    const result = await query(queryText);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get updates by type
   */
  async getUpdatesByType(type, { limit = 100, offset = 0 } = {}) {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        version, 
        is_major as "isMajor", 
        type, 
        created_at as "createdAt"
      FROM product_updates
      WHERE $1 = ANY(string_to_array(REPLACE(type, ' ', ''), ','))
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(queryText, [type, limit, offset]);
    return result.rows;
  }

  /**
   * Delete an update (admin only)
   */
  async deleteUpdate(version) {
    const queryText = `
      DELETE FROM product_updates
      WHERE version = $1
      RETURNING version
    `;
    
    const result = await query(queryText, [version]);
    return result.rows[0] || null;
  }
}

module.exports = new ProductUpdateService();
