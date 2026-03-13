const { logger } = require('./../config/observability');
const cron = require('node-cron');
const { sendDueInactivityReminders } = require('../services/inactivityService');

// Run hourly at minute 15 to avoid clashing with minute-level jobs
cron.schedule('15 * * * *', async () => {
  try {
    logger.info('[Cron] Sending inactivity reminders...');
    const res = await sendDueInactivityReminders({ batchLimit: 2000 });
    logger.info('[Cron] Inactivity reminders processed', res);
  } catch (e) {
    logger.error('[Cron] Inactivity reminders failed:', e);
  }
});


