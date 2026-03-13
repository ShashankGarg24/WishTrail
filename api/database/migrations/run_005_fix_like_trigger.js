const { logger } = require('./../../src/config/observability');
/**
 * Run migration 005: Fix like trigger
 * This migration updates the like trigger to work with DELETE operations
 * instead of the is_active column that's no longer being used
 */

const { query } = require('../src/config/supabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    logger.info('Running migration 005: Fix like trigger...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'schemas', '005_fix_like_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await query(migrationSQL);
    
    logger.info('✅ Migration 005 completed successfully!');
    logger.info('   - Updated update_goal_like_count() function');
    logger.info('   - Trigger now works with DELETE operations');
    logger.info('   - Like counts will be properly maintained');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
