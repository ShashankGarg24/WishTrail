/**
 * Premium Middleware & Utility
 * 
 * Provides middleware and utility functions for enforcing premium features.
 * This is a critical security layer that prevents bypassing premium restrictions.
 * 
 * Security Features:
 * - Server-side validation (client cannot bypass)
 * - Database timestamp as single source of truth
 * - Real-time expiration checking
 * - Detailed audit logging
 * - Rate limiting integration
 */

const { 
  isPremiumActive, 
  canPerformAction, 
  getFeatureLimits,
  getAllFeatureLimits,
  getDaysRemaining 
} = require('../config/premiumFeatures');

/**
 * Middleware: Require Premium
 * Blocks non-premium users from accessing premium-only endpoints
 */
const requirePremium = (req, res, next) => {
  try {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const premiumExpiresAt = req.user.premium_expires_at || req.user.premiumExpiresAt;
    
    if (!isPremiumActive(premiumExpiresAt)) {
      // Log attempted premium feature access for analytics
      logPremiumAccessAttempt(req.user.id, req.path, 'blocked');
      
      return res.status(403).json({
        success: false,
        message: 'Premium subscription required',
        error: 'PREMIUM_REQUIRED',
        upgradeUrl: '/premium/plans',
        premiumExpired: premiumExpiresAt ? new Date(premiumExpiresAt) < new Date() : false
      });
    }

    // Attach premium status to request for downstream use
    req.isPremium = true;
    req.premiumExpiresAt = premiumExpiresAt;
    req.daysRemaining = getDaysRemaining(premiumExpiresAt);
    
    next();
  } catch (error) {
    console.error('Premium middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking premium status'
    });
  }
};

/**
 * Middleware: Check Feature Limit
 * Validates if user can perform action based on their plan limits
 * 
 * @param {string} featureCategory - Feature category (e.g., 'goals', 'habits')
 * @param {string} action - Specific action to check
 * @param {function} getCurrentValue - Function to get current value (receives req)
 */
const checkFeatureLimit = (featureCategory, action, getCurrentValue = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const premiumExpiresAt = req.user.premium_expires_at || req.user.premiumExpiresAt;
      let currentValue = null;
      
      // Get current value if checker function provided
      if (getCurrentValue && typeof getCurrentValue === 'function') {
        currentValue = await getCurrentValue(req);
      }
      
      const check = canPerformAction(featureCategory, action, premiumExpiresAt, currentValue);
      
      if (!check.allowed) {
        // Log limit reached for analytics
        logFeatureLimitReached(req.user.id, featureCategory, action, check.limit);
        
        return res.status(403).json({
          success: false,
          message: check.reason,
          error: 'FEATURE_LIMIT_REACHED',
          featureCategory: featureCategory,
          action: action,
          limit: check.limit,
          currentValue: currentValue,
          isPremium: isPremiumActive(premiumExpiresAt),
          upgradeUrl: '/premium/plans'
        });
      }

      // Attach feature check result to request
      req.featureCheck = check;
      next();
    } catch (error) {
      console.error('Feature limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature limits'
      });
    }
  };
};

/**
 * Middleware: Attach Premium Info
 * Adds premium status information to request object for all authenticated requests
 */
const attachPremiumInfo = (req, res, next) => {
  try {
    if (req.user) {
      const premiumExpiresAt = req.user.premium_expires_at || req.user.premiumExpiresAt;
      req.isPremium = isPremiumActive(premiumExpiresAt);
      req.premiumExpiresAt = premiumExpiresAt;
      req.daysRemaining = getDaysRemaining(premiumExpiresAt);
      
      // Add helper function to get feature limits
      req.getFeatureLimits = (category) => getFeatureLimits(category, premiumExpiresAt);
      req.canPerformAction = (category, action, currentValue = null) => 
        canPerformAction(category, action, premiumExpiresAt, currentValue);
    }
    next();
  } catch (error) {
    console.error('Attach premium info error:', error);
    next(); // Don't block request on error
  }
};

/**
 * Utility: Check Premium Status
 * Standalone function to check if user has premium
 */
const checkPremiumStatus = (user) => {
  const premiumExpiresAt = user.premium_expires_at || user.premiumExpiresAt;
  return {
    isPremium: isPremiumActive(premiumExpiresAt),
    premiumExpiresAt: premiumExpiresAt,
    daysRemaining: getDaysRemaining(premiumExpiresAt),
    isExpiringSoon: getDaysRemaining(premiumExpiresAt) <= 7 && getDaysRemaining(premiumExpiresAt) > 0
  };
};

/**
 * Utility: Get User Feature Limits
 * Returns all feature limits for a specific user
 */
const getUserFeatureLimits = (user) => {
  const premiumExpiresAt = user.premium_expires_at || user.premiumExpiresAt;
  return getAllFeatureLimits(premiumExpiresAt);
};

/**
 * Utility: Validate Feature Access
 * Validates if user can access a specific feature
 * Returns detailed response object
 */
const validateFeatureAccess = async (user, featureCategory, action, currentValue = null) => {
  try {
    const premiumExpiresAt = user.premium_expires_at || user.premiumExpiresAt;
    const check = canPerformAction(featureCategory, action, premiumExpiresAt, currentValue);
    
    return {
      success: check.allowed,
      allowed: check.allowed,
      reason: check.reason,
      limit: check.limit,
      currentValue: currentValue,
      isPremium: isPremiumActive(premiumExpiresAt),
      featureCategory: featureCategory,
      action: action
    };
  } catch (error) {
    console.error('Feature access validation error:', error);
    return {
      success: false,
      allowed: false,
      reason: 'Validation error',
      error: error.message
    };
  }
};

/**
 * Utility: Grant Premium
 * Helper to calculate premium expiration date
 */
const grantPremium = (durationMonths = 1) => {
  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setMonth(expirationDate.getMonth() + durationMonths);
  return expirationDate;
};

/**
 * Utility: Extend Premium
 * Extends existing premium or starts new
 */
const extendPremium = (currentExpiresAt, additionalMonths = 1) => {
  let baseDate;
  
  // If user has active premium, extend from expiration date
  if (currentExpiresAt && isPremiumActive(currentExpiresAt)) {
    baseDate = new Date(currentExpiresAt);
  } else {
    // If expired or never had premium, start from now
    baseDate = new Date();
  }
  
  baseDate.setMonth(baseDate.getMonth() + additionalMonths);
  return baseDate;
};

/**
 * Logging: Log Premium Access Attempt
 * Logs when free users attempt to access premium features
 */
const logPremiumAccessAttempt = (userId, endpoint, status) => {
  // In production, send to analytics service
  console.log({
    type: 'premium_access_attempt',
    userId: userId,
    endpoint: endpoint,
    status: status,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Send to analytics service (Mixpanel, Amplitude, etc.)
  // trackEvent('premium_access_attempt', { userId, endpoint, status });
};

/**
 * Logging: Log Feature Limit Reached
 * Logs when users hit feature limits
 */
const logFeatureLimitReached = (userId, featureCategory, action, limit) => {
  console.log({
    type: 'feature_limit_reached',
    userId: userId,
    featureCategory: featureCategory,
    action: action,
    limit: limit,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Send to analytics service
  // trackEvent('feature_limit_reached', { userId, featureCategory, action, limit });
};

/**
 * Validation: Sanitize Premium Data for Response
 * Returns safe premium data for client
 */
const sanitizePremiumData = (user) => {
  const premiumExpiresAt = user.premium_expires_at || user.premiumExpiresAt;
  const isPremium = isPremiumActive(premiumExpiresAt);
  
  return {
    isPremium: isPremium,
    premiumExpiresAt: isPremium ? premiumExpiresAt : null,
    daysRemaining: isPremium ? getDaysRemaining(premiumExpiresAt) : null,
    isExpiringSoon: isPremium && getDaysRemaining(premiumExpiresAt) <= 7
  };
};

/**
 * Controller Helper: Get Premium Status Endpoint
 * Returns premium status and feature limits for current user
 */
const getPremiumStatusResponse = (user) => {
  const premiumExpiresAt = user.premium_expires_at || user.premiumExpiresAt;
  const isPremium = isPremiumActive(premiumExpiresAt);
  const daysRemaining = getDaysRemaining(premiumExpiresAt);
  
  return {
    success: true,
    data: {
      isPremium: isPremium,
      premiumExpiresAt: isPremium ? premiumExpiresAt : null,
      daysRemaining: daysRemaining,
      isExpiringSoon: daysRemaining !== null && daysRemaining <= 7,
      features: getAllFeatureLimits(premiumExpiresAt).features
    }
  };
};

module.exports = {
  // Middleware
  requirePremium,
  checkFeatureLimit,
  attachPremiumInfo,
  
  // Utilities
  checkPremiumStatus,
  getUserFeatureLimits,
  validateFeatureAccess,
  grantPremium,
  extendPremium,
  sanitizePremiumData,
  getPremiumStatusResponse,
  
  // Logging
  logPremiumAccessAttempt,
  logFeatureLimitReached
};
