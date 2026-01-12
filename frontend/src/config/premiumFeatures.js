/**
 * Premium Feature Configuration - Frontend
 * 
 * Mirrors backend premium limits for UI rendering.
 * WARNING: These limits are for UI ONLY. Always validate server-side!
 * 
 * Backend Source of Truth: api/src/config/premiumFeatures.js
 */

export const PREMIUM_FEATURES = {
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

  habits: {
    free: {
      maxActiveHabits: 5,
      canTrackHistory: true,
      historyRetentionDays: 60,
      canSetReminders: false,
      maxRemindersPerHabit: 0
    },
    premium: {
      maxActiveHabits: 10,
      canTrackHistory: true,
      historyRetentionDays: -1,
      canSetReminders: true,
      maxRemindersPerHabit: 5
    }
  },

  journal: {
    free: {
      maxEntriesPerDay: 1,
      maxEntryLength: 1000,
      retentionDays: 90,
      canExportEntries: false
    },
    premium: {
      maxEntriesPerDay: 5,
      maxEntryLength: 5000,
      retentionDays: -1,
      canExportEntries: true
    }
  },

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

  analytics: {
    free: {
      basicStats: true,
      advancedInsights: false,
      customReports: false,
      dataRetentionDays: 60
    },
    premium: {
      basicStats: true,
      advancedInsights: true,
      customReports: true,
      dataRetentionDays: -1
    }
  },

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

/**
 * Check if user has active premium
 */
export function isPremiumActive(premiumExpiresAt) {
  if (!premiumExpiresAt) return false;
  const expirationDate = new Date(premiumExpiresAt);
  return expirationDate > new Date();
}

/**
 * Get feature limits for a user based on premium status
 */
export function getFeatureLimits(featureCategory, premiumExpiresAt) {
  const features = PREMIUM_FEATURES[featureCategory];
  if (!features) {
    console.error(`Invalid feature category: ${featureCategory}`);
    return null;
  }
  
  return isPremiumActive(premiumExpiresAt) ? features.premium : features.free;
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(featureCategory, action, premiumExpiresAt, currentValue = null) {
  const limits = getFeatureLimits(featureCategory, premiumExpiresAt);
  
  if (!limits || !(action in limits)) {
    return {
      allowed: false,
      reason: `Unknown feature or action`,
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
  
  return {
    allowed: false,
    reason: 'Invalid feature configuration',
    limit: null
  };
}

/**
 * Get days remaining in premium subscription
 */
export function getDaysRemaining(premiumExpiresAt) {
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
 */
export function isPremiumExpiringSoon(premiumExpiresAt) {
  const daysRemaining = getDaysRemaining(premiumExpiresAt);
  return daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
}

/**
 * Get all feature limits for a user
 */
export function getAllFeatureLimits(premiumExpiresAt) {
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
