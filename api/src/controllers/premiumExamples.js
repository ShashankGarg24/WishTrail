/**
 * Example: Integrating Premium Checks into Existing Controllers
 * 
 * This file demonstrates various ways to implement premium restrictions
 * in your existing controllers. Copy and adapt these patterns.
 */

// ============================================
// EXAMPLE 1: Simple Premium-Only Endpoint
// ============================================

const { requirePremium } = require('../middleware/premium');

// Apply middleware to route
router.get('/api/v1/goals/export', 
  authenticate, 
  requirePremium,  // <-- Blocks free users
  goalController.exportGoals
);

// Controller doesn't need to check premium - middleware handles it
const exportGoals = async (req, res, next) => {
  try {
    // Only premium users reach here
    const goals = await goalService.getUserGoals(req.user.id);
    const exportData = generateExport(goals);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 2: Feature Limit Check (Middleware)
// ============================================

const { checkFeatureLimit } = require('../middleware/premium');

// Check limit before allowing action
router.post('/api/v1/goals', 
  authenticate,
  checkFeatureLimit('goals', 'maxActiveGoals', async (req) => {
    // Return current count
    return await goalService.countActiveGoals(req.user.id);
  }),
  goalController.createGoal
);

const createGoal = async (req, res, next) => {
  try {
    // If we reach here, user is within limit
    const goal = await goalService.create(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      data: goal
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 3: Manual Feature Validation
// ============================================

const { validateFeatureAccess } = require('../middleware/premium');
const userService = require('../services/pgUserService');

const createJournalEntry = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    
    // Get current entry count for today
    const todayEntries = await journalService.countTodayEntries(req.user.id);
    
    // Check if user can create more entries
    const validation = await validateFeatureAccess(
      user,
      'journal',
      'maxEntriesPerDay',
      todayEntries
    );
    
    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.reason,
        error: 'FEATURE_LIMIT_REACHED',
        limit: validation.limit,
        currentCount: todayEntries,
        upgradeUrl: '/premium/plans'
      });
    }
    
    // Create entry
    const entry = await journalService.create(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 4: Conditional Features
// ============================================

const { getFeatureLimits } = require('../config/premiumFeatures');

const uploadImage = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const limits = getFeatureLimits('storage', user.premium_expires_at);
    
    // Check if feature is available
    if (!limits.canUploadVideos && req.file.mimetype.startsWith('video/')) {
      return res.status(403).json({
        success: false,
        message: 'Video uploads require premium subscription',
        upgradeUrl: '/premium/plans'
      });
    }
    
    // Check file size
    if (req.file.size > limits.maxFileUploadSizeMB * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: `File size exceeds limit of ${limits.maxFileUploadSizeMB}MB`,
        upgradeUrl: '/premium/plans'
      });
    }
    
    // Upload file
    const url = await storageService.upload(req.file);
    
    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 5: Different Responses by Plan
// ============================================

const { isPremiumActive } = require('../config/premiumFeatures');

const getAnalytics = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const isPremium = isPremiumActive(user.premium_expires_at);
    
    // Basic analytics for everyone
    const basicStats = await analyticsService.getBasicStats(req.user.id);
    
    // Advanced analytics only for premium
    let advancedInsights = null;
    if (isPremium) {
      advancedInsights = await analyticsService.getAdvancedInsights(req.user.id);
    }
    
    res.json({
      success: true,
      data: {
        basic: basicStats,
        advanced: advancedInsights,
        isPremium: isPremium,
        upgradeMessage: !isPremium ? 'Upgrade to Premium for advanced insights' : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 6: Include Limits in Response
// ============================================

const { getUserFeatureLimits } = require('../middleware/premium');

const getGoals = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const goals = await goalService.getUserGoals(req.user.id);
    const limits = getUserFeatureLimits(user);
    
    res.json({
      success: true,
      data: {
        goals: goals,
        count: goals.length,
        limits: limits.features.goals,
        canCreateMore: goals.length < limits.features.goals.maxActiveGoals || 
                       limits.features.goals.maxActiveGoals === -1
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 7: Batch Operation with Limits
// ============================================

const createMultipleHabits = async (req, res, next) => {
  try {
    const { habits } = req.body; // Array of habits to create
    const user = await userService.findById(req.user.id);
    const limits = getFeatureLimits('habits', user.premium_expires_at);
    const currentCount = await habitService.countActiveHabits(req.user.id);
    
    // Check if user can create all requested habits
    const maxAllowed = limits.maxActiveHabits === -1 
      ? habits.length 
      : Math.max(0, limits.maxActiveHabits - currentCount);
    
    if (habits.length > maxAllowed) {
      return res.status(403).json({
        success: false,
        message: `You can only create ${maxAllowed} more habit(s)`,
        limit: limits.maxActiveHabits,
        current: currentCount,
        requested: habits.length,
        upgradeUrl: '/premium/plans'
      });
    }
    
    // Create all habits
    const created = await habitService.createBatch(req.user.id, habits);
    
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 8: Time-Based Restrictions
// ============================================

const { canPerformAction } = require('../config/premiumFeatures');

const searchJournalEntries = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const check = canPerformAction('journal', 'canSearchEntries', user.premium_expires_at);
    
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Journal search is a premium feature',
        upgradeUrl: '/premium/plans'
      });
    }
    
    const results = await journalService.search(req.user.id, req.query.q);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 9: Degraded Experience for Free Users
// ============================================

const getInsights = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const limits = getFeatureLimits('analytics', user.premium_expires_at);
    
    const insights = {
      basicStats: await analyticsService.getBasicStats(req.user.id)
    };
    
    // Add premium features if available
    if (limits.advancedInsights) {
      insights.categoryComparison = await analyticsService.compareCategories(req.user.id);
      insights.trends = await analyticsService.getTrends(req.user.id);
      insights.predictions = await analyticsService.getPredictions(req.user.id);
    } else {
      // Show locked features
      insights.lockedFeatures = [
        'Category Comparison',
        'Trend Analysis',
        'Predictive Insights'
      ];
    }
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 10: Using attachPremiumInfo Middleware
// ============================================

// In your main app.js or routes
const { attachPremiumInfo } = require('../middleware/premium');

app.use(authenticate);
app.use(attachPremiumInfo); // Adds premium info to every request

// Now in any controller:
const someController = async (req, res, next) => {
  try {
    // Premium info is automatically available
    console.log(req.isPremium); // boolean
    console.log(req.daysRemaining); // number or null
    
    // Helper functions available
    const goalLimits = req.getFeatureLimits('goals');
    const canExport = req.canPerformAction('analytics', 'canExportData');
    
    // Use them
    if (canExport.allowed) {
      // Generate export
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 11: Community/Group Features
// ============================================

const createCommunity = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const check = canPerformAction('social', 'canCreateCommunity', user.premium_expires_at);
    
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Creating communities is a premium feature',
        upgradeUrl: '/premium/plans'
      });
    }
    
    // Check owned communities count
    const ownedCount = await communityService.countOwnedByUser(req.user.id);
    const limits = getFeatureLimits('social', user.premium_expires_at);
    
    if (ownedCount >= limits.maxOwnedCommunities) {
      return res.status(403).json({
        success: false,
        message: `You can only own up to ${limits.maxOwnedCommunities} communities`,
        current: ownedCount,
        limit: limits.maxOwnedCommunities
      });
    }
    
    const community = await communityService.create(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      data: community
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXAMPLE 12: Rate Limiting by Plan
// ============================================

const rateLimit = require('express-rate-limit');

const createDynamicRateLimiter = () => {
  return async (req, res, next) => {
    const user = await userService.findById(req.user.id);
    const limits = getFeatureLimits('ai', user.premium_expires_at);
    
    // Different rate limits based on plan
    const maxRequests = limits.maxAiRequestsPerDay || 0;
    
    if (maxRequests === 0) {
      return res.status(403).json({
        success: false,
        message: 'AI features require premium subscription'
      });
    }
    
    // Track and enforce limit (simplified - use Redis in production)
    const key = `ai_requests:${req.user.id}:${new Date().toDateString()}`;
    const currentCount = await cache.get(key) || 0;
    
    if (currentCount >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Daily AI request limit reached',
        limit: maxRequests,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0))
      });
    }
    
    await cache.incr(key);
    await cache.expire(key, 86400); // 24 hours
    
    next();
  };
};

router.post('/api/v1/ai/suggest', 
  authenticate,
  createDynamicRateLimiter(),
  aiController.getSuggestions
);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  exportGoals,
  createGoal,
  createJournalEntry,
  uploadImage,
  getAnalytics,
  getGoals,
  createMultipleHabits,
  searchJournalEntries,
  getInsights,
  createCommunity
};
