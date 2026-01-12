/**
 * Premium Hooks - React Hooks for Premium Features
 * 
 * Custom hooks for premium feature access and validation
 */

import { useMemo } from 'react';
import useApiStore from '../store/apiStore';
import {
  isPremiumActive,
  getFeatureLimits,
  canPerformAction,
  getAllFeatureLimits,
  getDaysRemaining,
  isPremiumExpiringSoon
} from '../config/premiumFeatures';

/**
 * Hook to get user's premium status
 * @returns {Object} Premium status information
 */
export function usePremiumStatus() {
  const user = useApiStore((state) => state.user);
  
  return useMemo(() => {
    const premiumExpiresAt = user?.premiumExpiresAt || user?.premium_expires_at;
    const isPremium = isPremiumActive(premiumExpiresAt);
    const daysRemaining = getDaysRemaining(premiumExpiresAt);
    const isExpiringSoon = isPremiumExpiringSoon(premiumExpiresAt);
    
    return {
      isPremium,
      premiumExpiresAt,
      daysRemaining,
      isExpiringSoon,
      isFree: !isPremium
    };
  }, [user]);
}

/**
 * Hook to get feature limits for a specific category
 * @param {string} category - Feature category (e.g., 'goals', 'habits')
 * @returns {Object} Feature limits
 */
export function useFeatureLimits(category) {
  const { premiumExpiresAt } = usePremiumStatus();
  
  return useMemo(() => {
    return getFeatureLimits(category, premiumExpiresAt);
  }, [category, premiumExpiresAt]);
}

/**
 * Hook to check if user can perform a specific action
 * @param {string} category - Feature category
 * @param {string} action - Specific action
 * @param {number} currentValue - Current value to compare
 * @returns {Object} Validation result
 */
export function useCanPerformAction(category, action, currentValue = null) {
  const { premiumExpiresAt } = usePremiumStatus();
  
  return useMemo(() => {
    return canPerformAction(category, action, premiumExpiresAt, currentValue);
  }, [category, action, premiumExpiresAt, currentValue]);
}

/**
 * Hook to get all feature limits
 * @returns {Object} All feature limits
 */
export function useAllFeatureLimits() {
  const { premiumExpiresAt } = usePremiumStatus();
  
  return useMemo(() => {
    return getAllFeatureLimits(premiumExpiresAt);
  }, [premiumExpiresAt]);
}

/**
 * Hook to check goal limits
 * @param {number} currentGoalCount - Current number of active goals
 * @returns {Object} Goal limit validation
 */
export function useGoalLimits(currentGoalCount = 0) {
  const limits = useFeatureLimits('goals');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    const maxGoals = limits?.maxActiveGoals ?? 0;
    const canCreate = maxGoals === -1 || currentGoalCount < maxGoals;
    const remaining = maxGoals === -1 ? '∞' : Math.max(0, maxGoals - currentGoalCount);
    
    return {
      maxGoals: maxGoals === -1 ? '∞' : maxGoals,
      currentGoals: currentGoalCount,
      canCreate,
      remaining,
      isPremium,
      maxSubgoals: limits?.maxSubgoalsPerGoal ?? 0,
      percentUsed: maxGoals === -1 ? 0 : (currentGoalCount / maxGoals) * 100
    };
  }, [limits, currentGoalCount, isPremium]);
}

/**
 * Hook to check habit limits
 * @param {number} currentHabitCount - Current number of active habits
 * @returns {Object} Habit limit validation
 */
export function useHabitLimits(currentHabitCount = 0) {
  const limits = useFeatureLimits('habits');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    const maxHabits = limits?.maxActiveHabits ?? 0;
    const canCreate = maxHabits === -1 || currentHabitCount < maxHabits;
    const remaining = maxHabits === -1 ? '∞' : Math.max(0, maxHabits - currentHabitCount);
    
    return {
      maxHabits: maxHabits === -1 ? '∞' : maxHabits,
      currentHabits: currentHabitCount,
      canCreate,
      remaining,
      isPremium,
      canSetReminders: limits?.canSetReminders ?? false,
      percentUsed: maxHabits === -1 ? 0 : (currentHabitCount / maxHabits) * 100
    };
  }, [limits, currentHabitCount, isPremium]);
}

/**
 * Hook to check journal limits
 * @param {number} todayEntryCount - Number of entries created today
 * @returns {Object} Journal limit validation
 */
export function useJournalLimits(todayEntryCount = 0) {
  const limits = useFeatureLimits('journal');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    const maxEntries = limits?.maxEntriesPerDay ?? 0;
    const canCreate = maxEntries === -1 || todayEntryCount < maxEntries;
    const remaining = maxEntries === -1 ? '∞' : Math.max(0, maxEntries - todayEntryCount);
    
    return {
      maxEntries: maxEntries === -1 ? '∞' : maxEntries,
      todayEntries: todayEntryCount,
      canCreate,
      remaining,
      isPremium,
      maxLength: limits?.maxEntryLength ?? 0,
      canExport: limits?.canExportEntries ?? false,
      percentUsed: maxEntries === -1 ? 0 : (todayEntryCount / maxEntries) * 100
    };
  }, [limits, todayEntryCount, isPremium]);
}

/**
 * Hook to check community limits
 * @param {number} joinedCount - Number of communities joined
 * @param {number} ownedCount - Number of communities owned
 * @returns {Object} Community limit validation
 */
export function useCommunityLimits(joinedCount = 0, ownedCount = 0) {
  const limits = useFeatureLimits('social');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    const maxJoined = limits?.maxCommunitiesJoined ?? 0;
    const maxOwned = limits?.maxOwnedCommunities ?? 0;
    const canJoin = maxJoined === -1 || joinedCount < maxJoined;
    const canCreate = limits?.canCreateCommunity && (maxOwned === -1 || ownedCount < maxOwned);
    
    return {
      maxJoined: maxJoined === -1 ? '∞' : maxJoined,
      maxOwned: maxOwned === -1 ? '∞' : maxOwned,
      joinedCount,
      ownedCount,
      canJoin,
      canCreate,
      isPremium,
      canCreateCommunity: limits?.canCreateCommunity ?? false
    };
  }, [limits, joinedCount, ownedCount, isPremium]);
}

/**
 * Hook to check AI feature access
 * @returns {Object} AI feature access
 */
export function useAIFeatures() {
  const limits = useFeatureLimits('ai');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    return {
      hasAccess: isPremium && (limits?.aiSuggestions || false),
      aiSuggestions: limits?.aiSuggestions ?? false,
      smartGoalRecommendations: limits?.smartGoalRecommendations ?? false,
      aiJournalPrompts: limits?.aiJournalPrompts ?? false,
      aiInsights: limits?.aiInsights ?? false,
      maxRequestsPerDay: limits?.maxAiRequestsPerDay ?? 0,
      isPremium
    };
  }, [limits, isPremium]);
}

/**
 * Hook to check analytics access
 * @returns {Object} Analytics feature access
 */
export function useAnalyticsFeatures() {
  const limits = useFeatureLimits('analytics');
  const { isPremium } = usePremiumStatus();
  
  return useMemo(() => {
    return {
      basicStats: limits?.basicStats ?? true,
      advancedInsights: limits?.advancedInsights ?? false,
      customReports: limits?.customReports ?? false,
      isPremium
    };
  }, [limits, isPremium]);
}
