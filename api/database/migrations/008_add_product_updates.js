const { logger } = require('./../../src/config/observability');

/**
 * Migration: Add product updates tracking system
 * 
 * Changes:
 * 1. Add last_seen_update_version column to users table
 * 2. Create product_updates table for tracking feature/improvement releases
 */

const { query } = require('../../src/config/supabase');

async function up() {
  logger.info('Starting migration: add_product_updates');

  try {
    // Step 1: Add last_seen_update_version column to users
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_seen_update_version VARCHAR(50) DEFAULT NULL
    `);
    logger.info('✓ Added last_seen_update_version column to users table');

    // Step 2: Create product_updates table
    await query(`
      CREATE TABLE IF NOT EXISTS product_updates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        version VARCHAR(50) NOT NULL UNIQUE,
        is_major BOOLEAN DEFAULT false,
        type VARCHAR(20) CHECK (type IN ('bug_fix', 'enhancement', 'feature')) DEFAULT 'feature',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✓ Created product_updates table');

    // Step 3: Add indexes for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_updates_is_major ON product_updates(is_major DESC)
    `);
    logger.info('✓ Added index on is_major column');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_updates_created_at ON product_updates(created_at DESC)
    `);
    logger.info('✓ Added index on created_at column');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_updates_version ON product_updates(version)
    `);
    logger.info('✓ Added index on version column');

    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  logger.info('Rolling back migration: add_product_updates');

  try {
    // Step 1: Drop product_updates table
    await query(`
      DROP TABLE IF EXISTS product_updates CASCADE
    `);
    logger.info('✓ Dropped product_updates table');

    // Step 2: Drop last_seen_update_version column
    await query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS last_seen_update_version
    `);
    logger.info('✓ Dropped last_seen_update_version column from users table');

    logger.info('Rollback completed successfully!');
  } catch (error) {
    logger.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
