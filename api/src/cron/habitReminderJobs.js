const { logger } = require('./../config/observability');
const cron = require('node-cron');
const { sendReminderNotifications } = require('../services/habitService');

// Run every minute and send timezone-aware reminders
cron.schedule('* * * * *', async () => {
  try {
    // await sendReminderNotifications();
  } catch (e) {
    logger.error('[Cron] Habit reminders failed:', e);
  }
});


