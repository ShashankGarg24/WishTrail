const { logger } = require('./../../src/config/observability');
const { query } = require('../../src/config/supabase');

async function up() {
  logger.info('Starting migration: add_goal_updates');

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS goal_updates (
        id BIGSERIAL PRIMARY KEY,
        goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date_key DATE NOT NULL,
        text VARCHAR(300),
        emotion VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_goal_update_per_day UNIQUE (goal_id, date_key),
        CONSTRAINT goal_update_emotion_check CHECK (
          emotion IS NULL OR emotion IN ('great', 'good', 'okay', 'challenging', 'neutral')
        )
      )
    `);
    logger.info('✓ Created goal_updates table');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_goal_updates_goal_date
      ON goal_updates(goal_id, date_key DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_goal_updates_user_date
      ON goal_updates(user_id, date_key DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_goal_updates_created_at
      ON goal_updates(created_at DESC)
    `);

    await query(`
      ALTER TABLE goals
      ADD COLUMN IF NOT EXISTS is_updates_public BOOLEAN DEFAULT true
    `);
    logger.info('✓ Added is_updates_public column to goals table');

    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  logger.info('Rolling back migration: add_goal_updates');

  try {
    await query('DROP TABLE IF EXISTS goal_updates CASCADE');
    logger.info('✓ Dropped goal_updates table');
    logger.info('Rollback completed successfully!');
  } catch (error) {
    logger.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
