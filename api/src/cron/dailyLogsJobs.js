const { logger } = require('../config/observability');
const cron = require('node-cron');
const { notifyDailyPrompt, cleanupExpiredDailyLogs } = require('../services/dailyLogsService');
const { query } = require('../config/supabase');
const { getFeatureLimits } = require('../config/premiumFeatures');
const { sendMorningQuotes, generateNightlyQuotes } = require('../services/motivationService');

// Daily at 8 PM local-equivalent using user's timezone handled in service (still run hourly)
cron.schedule('0 * * * *', async () => {
  try {
    // logger.info('[Cron] Hourly check for daily log prompt...');
    // await notifyDailyPrompt();
    // logger.info('[Cron] Hourly daily log prompt pass done.');
  } catch (e) {
    logger.error('[Cron] Daily log prompt failed:', e);
  }
});

// Daily: remove history outside each user's plan retention window.
cron.schedule('30 1 * * *', async () => {
  try {
    const deletedDailyLogs = await cleanupExpiredDailyLogs();
    const users = await query('SELECT id, premium_expires_at FROM users');
    let deletedHabitLogs = 0;

    for (const user of users.rows) {
      const retentionDays = getFeatureLimits('habits', user.premium_expires_at).historyRetentionDays;
      if (retentionDays === -1) continue;

      const result = await query(
        `DELETE FROM habit_logs
         WHERE user_id = $1
           AND date_key < (CURRENT_DATE - ($2 * INTERVAL '1 day'))`,
        [user.id, retentionDays]
      );
      deletedHabitLogs += result.rowCount || 0;
    }

    logger.info('[Cron] Premium retention cleanup complete', { deletedDailyLogs, deletedHabitLogs });
  } catch (e) {
    logger.error('[Cron] Premium retention cleanup failed:', e);
  }
});

// Hourly: send morning motivation quotes at users' local 08:00
cron.schedule('0 * * * *', async () => {
  try {
    // Send at users' local 08:00; the service filters by hh:mm
    // await sendMorningQuotes();
  } catch (e) {
    logger.error('[Cron] Morning motivation failed:', e);
  }
});

// Nightly at 01:00 UTC: pre-generate per-user quotes in Redis via LLM
cron.schedule('0 1 * * *', async () => {
  try {
    // logger.info('[Cron] Generating nightly motivation quotes...');
    // await generateNightlyQuotes();
    // logger.info('[Cron] Nightly motivation quotes generated.');
  } catch (e) {
    logger.error('[Cron] Nightly motivation generation failed:', e);
  }
});


