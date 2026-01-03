const cron = require('node-cron');
const BloomFilterService = require('../utility/BloomFilterService');
const pgUserService = require('../services/pgUserService');

/**
 * Runs daily at 12:00 AM every day
 * Adjust cron expression if needed
 */
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Cron] Starting daily Bloom filter rebuild from PostgreSQL...');
    await BloomFilterService.rebuildFromDatabase(pgUserService);
    console.log('[Cron] Bloom filter rebuild completed successfully.');
  } catch (err) {
    console.error('[Cron] Bloom filter rebuild failed:', err);
  }
});
