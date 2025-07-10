const cron = require('node-cron');
const BloomFilterService = require('../utility/BloomFilterService');
const User = require('../models/User');

/**
 * Runs daily at 12:00 AM every day
 * Adjust cron expression if needed
 */
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Cron] Starting daily Bloom filter rebuild...');
    await BloomFilterService.rebuildFromDatabase(User);
    console.log('[Cron] Bloom filter rebuild completed successfully.');
  } catch (err) {
    console.error('[Cron] Bloom filter rebuild failed:', err);
  }
});
