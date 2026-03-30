const Config = require('../models/Config');
const productUpdateService = require('../services/productUpdateService');

const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
};

module.exports = {
  /**
   * Get latest product update (PostgreSQL) + config snapshot (MongoDB)
   * @route GET /api/v1/sync/latest
   * @access Public
   */
  async getLatestSyncData(req, res, next) {
    try {
      setNoCacheHeaders(res);

      const [latestProductUpdate, configs] = await Promise.all([
        productUpdateService.getLatestUpdate(),
        Config.find().select('-__v').sort({ key: 1 }).lean()
      ]);

      return res.status(200).json({
        success: true,
        data: {
          latestProductUpdate,
          configs,
          fetchedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      return next(error);
    }
  }
};
