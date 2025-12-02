const cron = require('node-cron');
const Notification = require('../models/Notification');

// Run daily at 2 AM to delete notifications older than 30 days
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('[Cron] Deleting old notifications...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`[Cron] Deleted ${result.deletedCount} notifications older than 30 days`);
  } catch (e) {
    console.error('[Cron] Failed to delete old notifications:', e);
  }
});
