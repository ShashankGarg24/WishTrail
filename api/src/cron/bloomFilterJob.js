const { logger } = require('./../config/observability');
const cron = require('node-cron');
const BloomFilterService = require('../utility/BloomFilterService');
const pgUserService = require('../services/pgUserService');

/**
 * Runs daily at 12:00 AM every day
 * Adjust cron expression if needed
 */
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('[Cron] Starting daily Bloom filter rebuild from PostgreSQL...');
    await BloomFilterService.rebuildFromDatabase(pgUserService);
    logger.info('[Cron] Bloom filter rebuild completed successfully.');
  } catch (err) {
    logger.error('[Cron] Bloom filter rebuild failed:', err);
  }
});
