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
    const isWhitelisted = whitelistedPaths.some(path => 
      req.path.endsWith(path) || req.path.includes('/health')
    );

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
    console.error('Maintenance mode check error:', error);
    next();
  }
};

module.exports = checkMaintenanceMode;
