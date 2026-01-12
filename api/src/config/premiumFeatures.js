/**
 * Premium Feature Configuration
 * 
 * This file defines all premium features and their limits for free vs premium users.
 * This is the SINGLE SOURCE OF TRUTH for premium feature gating.
 * 
 * Security Notes:
 * - All limits are enforced server-side
 * - Premium status is validated on every request via middleware
 * - Timestamp-based expiration prevents easy bypass
 * - Database-level constraints ensure data integrity
 */

const PREMIUM_FEATURES = {
  // ============================================
  // GOALS & TRACKING
  // ============================================
  goals: {
    free: {
      maxActiveGoals: 5,
      maxSubgoalsPerGoal: 1
    },
    premium: {
      maxActiveGoals: 10,
      maxSubgoalsPerGoal: 10
    }
  },

  // ============================================
  // HABITS
  // ============================================
  habits: {
    free: {
      maxActiveHabits: 5,
      canTrackHistory: true,
      historyRetentionDays: 60, // 2 months
      canSetReminders: false,
      maxRemindersPerHabit: 0
    },
    premium: {
      maxActiveHabits: 10,
      canTrackHistory: true,
      historyRetentionDays: -1, // unlimited
      canSetReminders: true,
      maxRemindersPerHabit: 5
    }
  },

  // ============================================
  // JOURNAL
  // ============================================
  journal: {
    free: {
      maxEntriesPerDay: 1,
      maxEntryLength: 1000,
      retentionDays: 90, // 3 months
      canExportEntries: false
    },
    premium: {
      maxEntriesPerDay: 5,
      maxEntryLength: 5000,
      retentionDays: -1, // unlimited
      canExportEntries: true
    }
  },

  // ============================================
  // SOCIAL & COMMUNITY
  // ============================================
  social: {
    free: {
      maxCommunitiesJoined: 7,
      canCreateCommunity: true,
      maxOwnedCommunities: 3
    },
    premium: {
      maxCommunitiesJoined: 50,
      canCreateCommunity: true,
      maxOwnedCommunities: 10
    }
  },

  // ============================================
  // ANALYTICS & INSIGHTS
  // ============================================
  analytics: {
    free: {
      basicStats: true,
      advancedInsights: false,
      customReports: false,
      dataRetentionDays: 60, // 2 months
      maxHistoryDays: 60 // Analytics filter limited to 60 days
    },
    premium: {
      basicStats: true,
      advancedInsights: true,
      customReports: true,
      dataRetentionDays: -1, // unlimited
      maxHistoryDays: 365 // Analytics filter up to 365 days
    }
  },

  // ============================================
  // AI FEATURES
  // ============================================
  ai: {
    free: {
      aiSuggestions: false,
      smartGoalRecommendations: false,
      aiJournalPrompts: false,
      maxAiRequestsPerDay: 0
    },
    premium: {
      aiSuggestions: true,
      smartGoalRecommendations: true,
      aiJournalPrompts: true,
      aiInsights: true,
      aiMotivationalMessages: true,
      maxAiRequestsPerDay: 100
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has active premium
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @returns {boolean} True if user has active premium
 */
function isPremiumActive(premiumExpiresAt) {
  if (!premiumExpiresAt) return false;
  const expirationDate = new Date(premiumExpiresAt);
  return expirationDate > new Date();
}

/**
 * Get feature limits for a user based on premium status
 * @param {string} featureCategory - Feature category (e.g., 'goals', 'habits')
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @returns {object} Feature limits for the user
 */
function getFeatureLimits(featureCategory, premiumExpiresAt) {
  const features = PREMIUM_FEATURES[featureCategory];
  if (!features) {
    throw new Error(`Invalid feature category: ${featureCategory}`);
  }
  
  return isPremiumActive(premiumExpiresAt) ? features.premium : features.free;
}

/**
 * Check if user can perform a specific action
 * @param {string} featureCategory - Feature category
 * @param {string} action - Specific action/feature name
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @param {number} currentValue - Current value to check against limit (optional)
 * @returns {object} { allowed: boolean, reason: string, limit: number }
 */
function canPerformAction(featureCategory, action, premiumExpiresAt, currentValue = null) {
  const limits = getFeatureLimits(featureCategory, premiumExpiresAt);
  
  if (!(action in limits)) {
    return {
      allowed: false,
      reason: `Unknown action: ${action}`,
      limit: null
    };
  }
  
  const limit = limits[action];
  
  // Boolean feature check
  if (typeof limit === 'boolean') {
    return {
      allowed: limit,
      reason: limit ? 'Feature available' : 'Premium feature required',
      limit: null
    };
  }
  
  // Numeric limit check
  if (typeof limit === 'number') {
    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        reason: 'Unlimited',
        limit: -1
      };
    }
    
    // If current value provided, check against limit
    if (currentValue !== null) {
      return {
        allowed: currentValue < limit,
        reason: currentValue < limit ? 'Within limit' : `Limit reached (${limit})`,
        limit: limit
      };
    }
    
    return {
      allowed: true,
      reason: 'Feature available',
      limit: limit
    };
  }
  
  // Array check (for allowed types, formats, etc.)
  if (Array.isArray(limit)) {
    return {
      allowed: limit.length > 0,
      reason: limit.length > 0 ? 'Feature available' : 'Premium feature required',
      limit: limit
    };
  }
  
  return {
    allowed: false,
    reason: 'Invalid feature configuration',
    limit: null
  };
}

/**
 * Get all feature limits for a user
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @returns {object} All feature limits organized by category
 */
function getAllFeatureLimits(premiumExpiresAt) {
  const isActive = isPremiumActive(premiumExpiresAt);
  const result = {
    isPremium: isActive,
    premiumExpiresAt: premiumExpiresAt,
    features: {}
  };
  
  for (const [category, features] of Object.entries(PREMIUM_FEATURES)) {
    result.features[category] = isActive ? features.premium : features.free;
  }
  
  return result;
}

/**
 * Get days remaining in premium subscription
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @returns {number|null} Days remaining, null if not premium
 */
function getDaysRemaining(premiumExpiresAt) {
  if (!premiumExpiresAt || !isPremiumActive(premiumExpiresAt)) {
    return null;
  }
  
  const now = new Date();
  const expiration = new Date(premiumExpiresAt);
  const diffTime = expiration - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if premium is expiring soon (within 7 days)
 * @param {Date|string|null} premiumExpiresAt - Premium expiration timestamp
 * @returns {boolean} True if expiring soon
 */
function isPremiumExpiringSoon(premiumExpiresAt) {
  const daysRemaining = getDaysRemaining(premiumExpiresAt);
  return daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  PREMIUM_FEATURES,
  isPremiumActive,
  getFeatureLimits,
  canPerformAction,
  getAllFeatureLimits,
  getDaysRemaining,
  isPremiumExpiringSoon
};
