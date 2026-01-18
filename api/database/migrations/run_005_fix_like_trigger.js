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
    console.log('Running migration 005: Fix like trigger...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'schemas', '005_fix_like_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await query(migrationSQL);
    
    console.log('✅ Migration 005 completed successfully!');
    console.log('   - Updated update_goal_like_count() function');
    console.log('   - Trigger now works with DELETE operations');
    console.log('   - Like counts will be properly maintained');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
