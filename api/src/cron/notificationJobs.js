const { logger } = require('./../config/observability');
const cron = require('node-cron');
const Notification = require('../models/Notification');

// Run daily at 2 AM to delete notifications older than 30 days
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('[Cron] Deleting old notifications...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    logger.info(`[Cron] Deleted ${result.deletedCount} notifications older than 30 days`);
  } catch (e) {
    logger.error('[Cron] Failed to delete old notifications:', e);
  }
});
