/**
 * Premium Enforcement Wrapper
 * 
 * Helper functions to add premium enforcement to existing controllers
 * without rewriting them completely. This ensures scalability and maintainability.
 */

const { validateFeatureAccess } = require('../middleware/premium');
const { getFeatureLimits } = require('../config/premiumFeatures');
const pgUserService = require('../services/pgUserService');
const pgGoalService = require('../services/pgGoalService');
const pgHabitService = require('../services/pgHabitService');
const JournalEntry = require('../models/JournalEntry');
const Community = require('../models/Community');

/**
 * Check if user can create a goal (premium limits)
 */
async function validateGoalCreation(req, subGoalsCount = 0) {
  const user = await pgUserService.findById(req.user.id);
  const activeGoalsCount = await pgGoalService.countActiveGoals(req.user.id);
  const limits = getFeatureLimits('goals', user.premium_expires_at);
  
  // Check active goals limit
  if (limits.maxActiveGoals !== -1 && activeGoalsCount >= limits.maxActiveGoals) {
    return {
      allowed: false,
      error: 'GOAL_LIMIT_REACHED',
      message: `Goal limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can have ${limits.maxActiveGoals} active goals.`,
      limit: limits.maxActiveGoals,
      current: activeGoalsCount
    };
  }
  
  // Check subgoals limit
  if (subGoalsCount > limits.maxSubgoalsPerGoal) {
    return {
      allowed: false,
      error: 'SUBGOAL_LIMIT_REACHED',
      message: `Subgoal limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can have ${limits.maxSubgoalsPerGoal} subgoals per goal.`,
      limit: limits.maxSubgoalsPerGoal,
      current: subGoalsCount
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can create a habit (premium limits)
 */
async function validateHabitCreation(req, hasReminders = false) {
  const user = await pgUserService.findById(req.user.id);
  const activeHabitsCount = await pgHabitService.countActiveHabits(req.user.id);
  const limits = getFeatureLimits('habits', user.premium_expires_at);
  
  // Check active habits limit
  if (limits.maxActiveHabits !== -1 && activeHabitsCount >= limits.maxActiveHabits) {
    return {
      allowed: false,
      error: 'HABIT_LIMIT_REACHED',
      message: `Habit limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can have ${limits.maxActiveHabits} active habits.`,
      limit: limits.maxActiveHabits,
      current: activeHabitsCount
    };
  }
  
  // Check reminders feature
  if (hasReminders && !limits.canSetReminders) {
    return {
      allowed: false,
      error: 'PREMIUM_FEATURE_REQUIRED',
      message: 'Setting reminders is a premium feature.',
      feature: 'canSetReminders'
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can create a journal entry (premium limits)
 */
async function validateJournalEntry(req) {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('journal', user.premium_expires_at);
  
  // Get today's entry count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayCount = await JournalEntry.countDocuments({
    userId: req.user.id,
    createdAt: { $gte: today, $lt: tomorrow },
    isDeleted: false
  });
  
  // Check daily limit
  if (limits.maxEntriesPerDay !== -1 && todayCount >= limits.maxEntriesPerDay) {
    return {
      allowed: false,
      error: 'JOURNAL_LIMIT_REACHED',
      message: `Daily journal limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can create ${limits.maxEntriesPerDay} ${limits.maxEntriesPerDay === 1 ? 'entry' : 'entries'} per day.`,
      limit: limits.maxEntriesPerDay,
      current: todayCount
    };
  }
  
  // Check content length
  const content = req.body.content || '';
  if (content.length > limits.maxEntryLength) {
    return {
      allowed: false,
      error: 'CONTENT_TOO_LONG',
      message: `Content too long. ${user.premium_expires_at ? 'Premium' : 'Free'} users can write up to ${limits.maxEntryLength} characters.`,
      limit: limits.maxEntryLength,
      current: content.length
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can export journal (premium feature)
 */
async function validateJournalExport(req) {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('journal', user.premium_expires_at);
  
  if (!limits.canExportEntries) {
    return {
      allowed: false,
      error: 'PREMIUM_FEATURE_REQUIRED',
      message: 'Exporting journal entries is a premium feature.',
      feature: 'canExportEntries'
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can create a community (premium limits)
 */
async function validateCommunityCreation(req) {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('social', user.premium_expires_at);
  
  // Check if user can create communities
  if (!limits.canCreateCommunity) {
    return {
      allowed: false,
      error: 'PREMIUM_FEATURE_REQUIRED',
      message: 'Creating communities is a premium feature.',
      feature: 'canCreateCommunity'
    };
  }
  
  // Check owned communities limit
  const ownedCount = await Community.countDocuments({
    ownerId: req.user.id,
    isActive: true
  });
  
  if (ownedCount >= limits.maxOwnedCommunities) {
    return {
      allowed: false,
      error: 'COMMUNITY_LIMIT_REACHED',
      message: `Community limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can own ${limits.maxOwnedCommunities} ${limits.maxOwnedCommunities === 1 ? 'community' : 'communities'}.`,
      limit: limits.maxOwnedCommunities,
      current: ownedCount
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can join a community (premium limits)
 */
async function validateCommunityJoin(req) {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('social', user.premium_expires_at);
  
  const CommunityMember = require('../models/CommunityMember');
  const joinedCount = await CommunityMember.countDocuments({
    userId: req.user.id,
    status: 'active'
  });
  
  if (joinedCount >= limits.maxCommunitiesJoined) {
    return {
      allowed: false,
      error: 'COMMUNITY_LIMIT_REACHED',
      message: `Community limit reached. ${user.premium_expires_at ? 'Premium' : 'Free'} users can join ${limits.maxCommunitiesJoined} ${limits.maxCommunitiesJoined === 1 ? 'community' : 'communities'}.`,
      limit: limits.maxCommunitiesJoined,
      current: joinedCount
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can access advanced analytics (premium feature)
 */
async function validateAdvancedAnalytics(req) {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('analytics', user.premium_expires_at);
  
  if (!limits.advancedInsights) {
    return {
      allowed: false,
      error: 'PREMIUM_FEATURE_REQUIRED',
      message: 'Advanced analytics is a premium feature.',
      feature: 'advancedInsights'
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can use AI features (premium feature)
 */
async function validateAIFeature(req, featureName = 'aiSuggestions') {
  const user = await pgUserService.findById(req.user.id);
  const limits = getFeatureLimits('ai', user.premium_expires_at);
  
  if (!limits[featureName]) {
    return {
      allowed: false,
      error: 'PREMIUM_FEATURE_REQUIRED',
      message: 'AI features require a premium subscription.',
      feature: featureName
    };
  }
  
  // Check daily request limit
  if (limits.maxAiRequestsPerDay !== -1) {
    // TODO: Implement daily request counting with Redis/cache
    // For now, just allow if premium
  }
  
  return { allowed: true };
}

/**
 * Generic validation response handler
 * Sends appropriate error response if validation fails
 */
function handleValidationResponse(res, validation) {
  if (!validation.allowed) {
    return res.status(403).json({
      success: false,
      message: validation.message,
      error: validation.error,
      limit: validation.limit,
      current: validation.current,
      feature: validation.feature,
      upgradeUrl: '/premium/plans'
    });
  }
  return null; // No error, continue
}

module.exports = {
  validateGoalCreation,
  validateHabitCreation,
  validateJournalEntry,
  validateJournalExport,
  validateCommunityCreation,
  validateCommunityJoin,
  validateAdvancedAnalytics,
  validateAIFeature,
  handleValidationResponse
};
