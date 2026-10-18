const { logger } = require('./../config/observability');
const Config = require('../models/Config');

/**
 * Maintenance Mode Middleware
 * Checks if the system is in maintenance mode and blocks requests if enabled
 * Excludes certain routes like health checks and the maintenance status endpoint
 */
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Whitelist paths that should work during maintenance
    const whitelistedPaths = [
      '/health',
      '/config/maintenance',
      '/api/v1/health',
      '/api/v1/config/maintenance'
    ];

    // Check if current path is whitelisted
    const apiBase = `/api/${process.env.API_VERSION || 'v1'}`;
    const adminSegment = String(process.env.ADMIN_API_ROUTE_SEGMENT || 'admin').trim().replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '') || 'admin';
    const adminBase = `${apiBase}/${adminSegment}`;
    // The admin router still authenticates every operation; login must remain reachable.
    const isWhitelisted = whitelistedPaths.includes(req.path) || req.path === adminBase || req.path.startsWith(`${adminBase}/`);

    if (isWhitelisted) {
      return next();
    }

    // Check maintenance mode
    const isMaintenanceMode = await Config.isMaintenanceMode();

    if (isMaintenanceMode) {
      const config = await Config.findOne({ key: 'maintenance_mode' });
      const message = config?.description || 'System is under maintenance. Please try again later.';

      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message,
        maintenanceMode: true
      });
    }

    next();
  } catch (error) {
    // If there's an error checking maintenance mode, allow the request
    // to prevent complete service failure
    logger.error('Maintenance mode check error:', error);
    next();
  }
};

module.exports = checkMaintenanceMode;
