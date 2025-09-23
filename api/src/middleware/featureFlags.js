const { isEnabled, platformFromRequest, normalizeKey } = require('../services/featureFlagService');

// Express middleware factory to guard a route by feature key
function requireFeature(featureKey) {
  const key = normalizeKey(featureKey);
  return async function(req, res, next) {
    try {
      const platform = platformFromRequest(req);
      const ok = await isEnabled(key, platform);
      if (!ok) {
        return res.status(404).json({ success: false, message: 'Feature is disabled' });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Feature check failed' });
    }
  };
}

module.exports = { requireFeature };


