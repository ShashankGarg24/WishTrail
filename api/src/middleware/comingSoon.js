const Config = require('../models/Config');

/**
 * Coming Soon Middleware
 * Blocks requests when the site is in "coming soon" mode.
 * Allows a small whitelist (health checks and the coming-soon status endpoint).
 */
const checkComingSoon = async (req, res, next) => {
  try {
    const whitelistedPaths = [
      '/health',
      '/config/coming-soon',
      '/api/v1/health',
      '/api/v1/config/coming-soon'
    ];

    const isWhitelisted = whitelistedPaths.some(path =>
      req.path.endsWith(path) || req.path.includes('/health')
    );

    if (isWhitelisted) return next();

    const isComingSoon = await Config.getValue('coming_soon', false);

    if (isComingSoon) {
      const config = await Config.findOne({ key: 'coming_soon' });
      const message = config?.description || 'This site is launching soon. Please check back later.';

      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message,
        comingSoon: true
      });
    }

    return next();
  } catch (err) {
    console.error('ComingSoon check error:', err);
    // Fail-open to avoid taking the site down due to a check error
    return next();
  }
};

module.exports = checkComingSoon;
