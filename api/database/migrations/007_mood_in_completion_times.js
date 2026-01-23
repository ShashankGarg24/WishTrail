/**
 * Migration: Store mood with each completion timestamp
 * 
 * Changes:
 * 1. Remove mood column from habit_logs
 * 2. Change completion_times_mood from TIMESTAMP[] to JSONB[] to store {timestamp, mood}
 * 
 * Note: Existing completion_times_mood data will be migrated to new format with neutral mood
 */

const { query } = require('../src/config/supabase');

async function up() {
  console.log('Starting migration: mood_in_completion_times_mood');

  try {
    // Step 1: Add new JSONB column for completion_times_mood_new
    await query(`
      ALTER TABLE habit_logs 
      ADD COLUMN IF NOT EXISTS completion_times_mood_new JSONB[] DEFAULT ARRAY[]::JSONB[]
    `);
    console.log('✓ Added completion_times_mood_new column');

    // Step 2: Migrate existing completion_times_mood data to new format
    await query(`
      UPDATE habit_logs
      SET completion_times_mood_new = (
        SELECT ARRAY_AGG(
          jsonb_build_object(
            'timestamp', t::text,
            'mood', 'neutral'
          )
        )
        FROM UNNEST(completion_times_mood) AS t
      )
      WHERE completion_times_mood IS NOT NULL AND array_length(completion_times_mood, 1) > 0
    `);
    console.log('✓ Migrated existing completion_times_mood data');

    // Step 3: Drop old completion_times_mood column
    await query(`
      ALTER TABLE habit_logs 
      DROP COLUMN IF EXISTS completion_times_mood
    `);
    console.log('✓ Dropped old completion_times_mood column');

    // Step 4: Rename completion_times_mood_new to completion_times_mood
    await query(`
      ALTER TABLE habit_logs 
      RENAME COLUMN completion_times_mood_new TO completion_times_mood
    `);
    console.log('✓ Renamed completion_times_mood_new to completion_times_mood');

    // Step 5: Drop mood column
    await query(`
      ALTER TABLE habit_logs 
      DROP COLUMN IF EXISTS mood
    `);
    console.log('✓ Dropped mood column');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Rolling back migration: mood_in_completion_times_mood');

  try {
    // Step 1: Add back mood column
    await query(`
      ALTER TABLE habit_logs 
      ADD COLUMN IF NOT EXISTS mood VARCHAR(20) CHECK (mood IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive'))
    `);
    console.log('✓ Added back mood column');

    // Step 2: Add back old completion_times_mood column
    await query(`
      ALTER TABLE habit_logs 
      ADD COLUMN IF NOT EXISTS completion_times_mood_old TIMESTAMP WITH TIME ZONE[] DEFAULT ARRAY[]::TIMESTAMP WITH TIME ZONE[]
    `);
    console.log('✓ Added completion_times_mood_old column');

    // Step 3: Migrate completion_times_mood back to old format (extract timestamps only)
    await query(`
      UPDATE habit_logs
      SET completion_times_mood_old = (
        SELECT ARRAY_AGG((elem->>'timestamp')::timestamp with time zone)
        FROM UNNEST(completion_times_mood) AS elem
      ),
      mood = (
        SELECT (elem->>'mood')::varchar
        FROM UNNEST(completion_times_mood) AS elem
        LIMIT 1
      )
      WHERE completion_times_mood IS NOT NULL AND array_length(completion_times_mood, 1) > 0
    `);
    console.log('✓ Migrated data back to old format');

    // Step 4: Drop new completion_times_mood column
    await query(`
      ALTER TABLE habit_logs 
      DROP COLUMN IF EXISTS completion_times_mood
    `);
    console.log('✓ Dropped new completion_times_mood column');

    // Step 5: Rename completion_times_mood_old back to completion_times_mood
    await query(`
      ALTER TABLE habit_logs 
      RENAME COLUMN completion_times_mood_old TO completion_times_mood
    `);
    console.log('✓ Renamed completion_times_mood_old to completion_times_mood');

    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
