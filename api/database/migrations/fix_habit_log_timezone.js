/**
 * Fix habit log timezone issue
 * 
 * Problem: Habit logs were stored with UTC date keys even though users were logging
 * in their local timezone. For example, a user in IST (UTC+5:30) logging at 00:33 on
 * Jan 21 IST would be stored as Jan 20 UTC, causing analytics to show wrong dates.
 * 
 * This script recalculates date keys based on user timezone and completion times.
 * 
 * Run with: node api/database/migrations/fix_habit_log_timezone.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixHabitLogTimezones() {
  const client = await pool.connect();
  
  try {
    console.log('Starting habit log timezone fix...\n');
    
    // Get all habit logs with their user's timezone
    const query = `
      SELECT 
        hl.id,
        hl.habit_id,
        hl.user_id,
        hl.date_key,
        hl.completion_times,
        u.timezone
      FROM habit_logs hl
      JOIN users u ON hl.user_id = u.id
      WHERE hl.completion_times IS NOT NULL 
        AND array_length(hl.completion_times, 1) > 0
      ORDER BY hl.user_id, hl.date_key
    `;
    
    const result = await client.query(query);
    console.log(`Found ${result.rows.length} habit logs to check\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const log of result.rows) {
      const userTimezone = log.timezone || 'UTC';
      const completionTimes = log.completion_times;
      
      // Calculate what the date key should be based on the first completion time
      // in the user's timezone
      const firstCompletion = new Date(completionTimes[0]);
      let correctDateKey;
      
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        correctDateKey = formatter.format(firstCompletion);
      } catch (err) {
        console.warn(`Invalid timezone ${userTimezone} for user ${log.user_id}, using UTC`);
        correctDateKey = firstCompletion.toISOString().split('T')[0];
      }
      
      if (correctDateKey !== log.date_key) {
        console.log(`User ${log.user_id}, Habit ${log.habit_id}:`);
        console.log(`  Current date_key: ${log.date_key}`);
        console.log(`  Correct date_key: ${correctDateKey}`);
        console.log(`  First completion: ${completionTimes[0]}`);
        console.log(`  Timezone: ${userTimezone}`);
        
        // Check if a log already exists for the correct date
        const checkQuery = `
          SELECT id FROM habit_logs 
          WHERE habit_id = $1 AND user_id = $2 AND date_key = $3
        `;
        const checkResult = await client.query(checkQuery, [log.habit_id, log.user_id, correctDateKey]);
        
        if (checkResult.rows.length > 0 && checkResult.rows[0].id !== log.id) {
          // Merge with existing log
          console.log(`  → Merging with existing log for ${correctDateKey}`);
          
          const mergeQuery = `
            UPDATE habit_logs
            SET completion_times = array(
              SELECT DISTINCT unnest(completion_times || $1::timestamp[])
              ORDER BY 1
            ),
            completion_count = array_length(
              array(SELECT DISTINCT unnest(completion_times || $1::timestamp[])), 1
            )
            WHERE id = $2
          `;
          await client.query(mergeQuery, [completionTimes, checkResult.rows[0].id]);
          
          // Delete the old log
          await client.query('DELETE FROM habit_logs WHERE id = $1', [log.id]);
          fixedCount++;
        } else {
          // Update the date key
          console.log(`  → Updating date_key to ${correctDateKey}`);
          
          const updateQuery = `
            UPDATE habit_logs
            SET date_key = $1
            WHERE id = $2
          `;
          await client.query(updateQuery, [correctDateKey, log.id]);
          fixedCount++;
        }
        
        console.log('');
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total logs checked: ${result.rows.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Already correct: ${skippedCount}`);
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error fixing habit log timezones:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
fixHabitLogTimezones().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
