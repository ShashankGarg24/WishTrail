const User = require('../models/User');
const Block = require('../models/Block');
const userService = require('../services/userService');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { sanitizeUser, sanitizeGoals, sanitizeGoalsForProfile } = require('../utility/sanitizer');

// Lightweight block status check
const getBlockStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const target = await User.findById(userId).select('_id').lean();
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const [iBlocked, blockedMe] = await Promise.all([
      Block.findOne({ blockerId: req.user.id, blockedId: userId, isActive: true }).lean(),
      Block.findOne({ blockerId: userId, blockedId: req.user.id, isActive: true }).lean()
    ]);
    return res.json({ success: true, data: { iBlocked: !!iBlocked, blockedMe: !!blockedMe } });
  } catch (err) { next(err); }
};

// do not export here; include in final export bundle at bottom

// @desc    Get all users with pagination and search
// @route   GET /api/v1/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers({
      ...req.query,
      requestingUserId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID or username
// @route   GET /api/v1/users/:idOrUsername
// @access  Private
const getUser = async (req, res, next) => {
  try {
    const { id: idOrUsername } = req.params;
    const {user, stats, isFollowing, isRequested} = await userService.getUserByUsername(idOrUsername, req.user.id);
    
    // ✅ Sanitize user data - hide sensitive fields for other users
    const isSelf = user.username === req.user.username;
    const sanitizedUser = sanitizeUser(user, isSelf);
    
    res.status(200).json({
      success: true,
      data: {user: sanitizedUser, stats: stats, isFollowing: isFollowing, isRequested: isRequested}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/users/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await userService.getDashboardStats(req.user.id);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get profile summary
// @route   GET /api/v1/users/profile
// @access  Private
const getProfileSummary = async (req, res, next) => {
  try {
    const profile = await userService.getProfileSummary(req.user.id);

    res.status(200).json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a dashboard year to the current user
// @route   POST /api/v1/users/dashboard/years
// @access  Private
const addDashboardYear = async (req, res, next) => {
  try {
    const { year } = req.body || {}
    const y = parseInt(year)
    if (!y || Number.isNaN(y)) {
      return res.status(400).json({ success: false, message: 'Provide valid year' })
    }
    const currentYear = new Date().getFullYear()
    if (y < currentYear || y > currentYear + 5) {
      return res.status(400).json({ success: false, message: `Year must be between ${currentYear} and ${currentYear + 5}` })
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { dashboardYears: y } },
      { new: true }
    ).select('_id dashboardYears')
    return res.status(200).json({ success: true, data: { years: user.dashboardYears || [] } })
  } catch (error) { next(error) }
}

// @desc    Delete a dashboard year and all related data
// @route   DELETE /api/v1/users/dashboard/years/:year
// @access  Private
const deleteDashboardYear = async (req, res, next) => {
  try {
    const Goal = require('../models/Goal');
    const Activity = require('../models/Activity');
    const ActivityComment = require('../models/ActivityComment');
    const Like = require('../models/Like');
    const Notification = require('../models/Notification');
    const Habit = require('../models/Habit');
    const CommunityActivity = require('../models/CommunityActivity');
    const CommunityItem = require('../models/CommunityItem');
    
    const { year } = req.params;
    const y = parseInt(year);
    if (!y || Number.isNaN(y)) {
      return res.status(400).json({ success: false, message: 'Provide valid year' });
    }
    
    // Get all goals for this year first
    const goalsToDelete = await Goal.find({ 
      userId: req.user.id, 
      year: y 
    }).select('_id completed completedAt').lean();
    
    const goalIds = goalsToDelete.map(g => g._id);
    const completedCount = goalsToDelete.filter(g => g.completed).length;
    
    if (goalIds.length > 0) {
      // 1. Delete all activities related to these goals
      const deletedActivities = await Activity.find({ 
        'data.goalId': { $in: goalIds } 
      }).select('_id').lean();
      const activityIds = deletedActivities.map(a => a._id);
      
      if (activityIds.length > 0) {
        // Delete activities
        await Activity.deleteMany({ _id: { $in: activityIds } });
        
        // Delete comments on these activities
        await ActivityComment.deleteMany({ activityId: { $in: activityIds } });
        
        // Delete likes on these activities
        await Like.deleteMany({ 
          targetType: 'activity', 
          targetId: { $in: activityIds } 
        });
      }
      
      // 2. Delete likes on the goals themselves
      await Like.deleteMany({ 
        targetType: 'goal', 
        targetId: { $in: goalIds } 
      });
      
      // 3. Delete notifications related to these goals
      await Notification.deleteMany({ 
        'data.goalId': { $in: goalIds } 
      });
      
      // 4. Unlink habits from these goals (preserve habits)
      await Habit.updateMany(
        { goalId: { $in: goalIds } },
        { $unset: { goalId: 1 } }
      );
      
      // 5. Remove these goals from other goals' subGoals arrays
      await Goal.updateMany(
        { 'subGoals.linkedGoalId': { $in: goalIds } },
        { $pull: { subGoals: { linkedGoalId: { $in: goalIds } } } }
      );
      
      // 6. Handle community-related cleanup
      // Deactivate community mirror goals (goals that are mirrors of these goals)
      await Goal.updateMany(
        { 'communityInfo.sourceId': { $in: goalIds } },
        { $set: { isActive: false } }
      );
      
      // Deactivate community items that reference these goals
      await CommunityItem.updateMany(
        { type: 'goal', sourceId: { $in: goalIds } },
        { $set: { isActive: false } }
      );
      
      // Delete community activities related to these goals
      await CommunityActivity.deleteMany({ 
        'data.goalId': { $in: goalIds } 
      });
      
      // 7. Clean up daily completions for completed goals
      if (completedCount > 0) {
        const completedGoals = goalsToDelete.filter(g => g.completed && g.completedAt);
        for (const goal of completedGoals) {
          const dateKey = new Date(goal.completedAt).toISOString().split('T')[0];
          const pullKey = `dailyCompletions.${dateKey}`;
          await User.updateOne(
            { _id: req.user.id },
            { $pull: { [pullKey]: { goalId: goal._id } } }
          );
        }
      }
      
      // 8. Delete all goals for this year
      await Goal.deleteMany({ 
        userId: req.user.id, 
        year: y 
      });
    }
    
    // 9. Update user statistics
    await User.updateOne(
      { _id: req.user.id },
      { 
        $inc: { 
          totalGoals: -goalIds.length,
          completedGoals: -completedCount
        }
      }
    );
    
    // 10. Remove year from user's dashboardYears
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { dashboardYears: y } },
      { new: true }
    ).select('_id dashboardYears');
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        years: user.dashboardYears || [],
        deletedGoals: goalIds.length,
        deletedCompletedGoals: completedCount
      },
      message: `Year ${y} and ${goalIds.length} related goal(s) deleted successfully`
    });
  } catch (error) { 
    next(error);
  }
}

// @desc    Get suggested users
// @route   GET /api/v1/users/suggestions
// @access  Private
const getSuggestedUsers = async (req, res, next) => {
  try {
    const users = await userService.getSuggestedUsers(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List popular interests with counts
// @route   GET /api/v1/users/interests
// @access  Private
const listInterests = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const interests = await userService.listPopularInterests(limit);
    // Ensure we do not expose counts
    const sanitized = (interests || []).map(i => ({ interest: i.interest }));
    res.status(200).json({ success: true, data: { interests: sanitized } });
  } catch (error) {
    next(error);
  }
};

// (removed duplicate updateTimezone; unified version exists later in this file)

// @desc    Search users
// @route   GET /api/v1/users/search
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { search, interest, page = 1, limit = 20 } = req.query;

    // Allow interest-only searches (no text required)
    if ((!search || search.trim().length < 2) && !interest) {
      return res.status(400).json({
        success: false,
        message: 'Provide a search term (2+ chars) or an interest filter'
      });
    }

    // Try cache for interest-based searches (fast perceived speed)
    const cacheService = require('../services/cacheService');
    const cacheParams = { q: search || '', interest, page: parseInt(page), limit: parseInt(limit) };
    let cached = null;
    if (interest) {
      cached = await cacheService.getUserSearch(cacheParams);
    }

    let payload = cached;
    if (!payload) {
      payload = await userService.searchUsers(search || '', { 
        ...req.query, 
        requestingUserId: req.user.id 
      });
      if (interest) {
        // Store only minimal payload for cache
        await cacheService.setUserSearch(payload, cacheParams);
      }
    }

    res.status(200).json({
      success: true,
      data: payload,
      fromCache: !!cached
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's goals
// @route   GET /api/v1/users/:username/goals
// @access  Private
const getUserGoals = async (req, res, next) => {
  try {
    const goalService = require('../services/goalService');
    const { username } = req.params;
    const Follow = require('../models/Follow');
    const targetUser = await User.findOne({ username: username }).select('isPrivate isActive');
      console.log('Target user for goals:', targetUser);
    // Check privacy if viewing another user's goals
    if (username !== req.user.username) {
      if (!targetUser || !targetUser.isActive) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if profile is private and user is not following
      if (targetUser.isPrivate) {
        const isFollowing = await Follow.isFollowing(req.user.id, id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: 'This profile is private'
          });
        }
      }
    }

    const result = await goalService.getGoals(targetUser._id, req.query);

    // ✅ Sanitize goals - Use minimal fields for profile page display
    if (result.goals && Array.isArray(result.goals)) {
      result.goals = sanitizeGoalsForProfile(result.goals);
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's yearly goals
// @route   GET /api/v1/users/:id/goals/yearly/:year
// @access  Private
const getUserYearlyGoals = async (req, res, next) => {
  try {
    const goalService = require('../services/goalService');
    const { id, year } = req.params;
    
    const result = await goalService.getYearlyGoals(id, parseInt(year), req.user.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activities
// @route   GET /api/v1/users/:id/activities
// @access  Private
const getUserActivities = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await userService.getUserActivities(id, req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Users can only update their own profile
    if (id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await authService.updateProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user private
// @route   PUT /api/v1//users/privacy
// @access  Private
const updatePrivacy = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isPrivate } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { isPrivate },
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from response

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User privacy updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Users can only delete their own account
    if (id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const User = require('../models/User');
    await User.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's timezone (auto-detected from client)
// @route   POST /api/v1/users/timezone
// @access  Private
const updateTimezone = async (req, res, next) => {
  try {
    const { timezone, timezoneOffsetMinutes } = req.body || {};
    if (!timezone && typeof timezoneOffsetMinutes !== 'number') {
      return res.status(400).json({ success: false, message: 'Provide timezone or timezoneOffsetMinutes' });
    }
    const set = {};
    if (timezone) set.timezone = timezone;
    if (typeof timezoneOffsetMinutes === 'number') set.timezoneOffsetMinutes = timezoneOffsetMinutes;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: set }, { new: true }).select('_id timezone timezoneOffsetMinutes');
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

// @desc    Get user analytics (goals + habits overall stats)
// @route   GET /api/v1/users/analytics?username=@username (optional)
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const { username } = req.query;
    const Goal = require('../models/Goal');
    const habitService = require('../services/habitService');
    
    let targetUserId = req.user.id;
    let isSelf = true;
    let targetUsername = req.user.username;
    // If username provided, look up that user
    if (username) {
      const targetUserData = await userService.getUserByUsername(username, req.user.id);
      if (!targetUserData || !targetUserData.user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      targetUsername = targetUserData.user.username;
      isSelf = targetUsername === req.user.username;
      
      // Check privacy if not viewing own profile
      if (!isSelf) {
        const isPublic = !targetUserData.user.isPrivate;
        const isFollowing = targetUserData.isFollowing;
        
        if (!isPublic && !isFollowing) {
          return res.status(403).json({ 
            success: false, 
            message: 'This profile is private' 
          });
        }
      }
    }
    // Get user to extract streaks
    const user = await User.findOne({ username: targetUsername }).select('currentStreak longestStreak isActive');
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get goals stats
    const [totalGoals, completedGoals] = await Promise.all([
      Goal.countDocuments({ userId: targetUserId, deletedAt: null }),
      Goal.countDocuments({ userId: targetUserId, completed: true, deletedAt: null })
    ]);
    
    // Get habits analytics (30 days by default)
    const habitAnalytics = await habitService.analytics(targetUserId, { days: 30 });
    
    const analytics = {
      habits: {
        done: habitAnalytics.done || 0,
        missed: habitAnalytics.missed || 0,
        skipped: habitAnalytics.skipped || 0
      },
      goals: {
        totalGoals: totalGoals || 0,
        completedGoals: completedGoals || 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0
      },
      topHabits: habitAnalytics.topHabits || []
    };
    
    res.status(200).json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user analytics (for profile page)
// @route   GET /api/v1/users/:id/analytics
// @access  Private (requires public profile or following relationship)
const getUserAnalytics = async (req, res, next) => {
  try {
    const { id: targetUserId } = req.params;
    const requestingUserId = req.user.id;
    const Goal = require('../models/Goal');
    const habitService = require('../services/habitService');
    const Follow = require('../models/Follow');
    
    // Get target user
    const targetUser = await User.findById(targetUserId).select('currentStreak longestStreak isPrivate');
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check privacy - only show if:
    // 1. Viewing own profile
    // 2. Profile is public
    // 3. Requesting user is following target user
    const isSelf = targetUserId === requestingUserId;
    const isPublic = !targetUser.isPrivate;
    const isFollowing = isSelf ? false : await Follow.isFollowing(requestingUserId, targetUserId);
    
    if (!isSelf && !isPublic && !isFollowing) {
      return res.status(403).json({ 
        success: false, 
        message: 'This profile is private' 
      });
    }
    
    // Get goals stats
    const [totalGoals, completedGoals] = await Promise.all([
      Goal.countDocuments({ userId: targetUserId, deletedAt: null }),
      Goal.countDocuments({ userId: targetUserId, completed: true, deletedAt: null })
    ]);
    
    // Get habits analytics (30 days by default)
    const habitAnalytics = await habitService.analytics(targetUserId, { days: 30 });
    
    const analytics = {
      habits: {
        done: habitAnalytics.done || 0,
        missed: habitAnalytics.missed || 0,
        skipped: habitAnalytics.skipped || 0
      },
      goals: {
        totalGoals: totalGoals || 0,
        completedGoals: completedGoals || 0,
        currentStreak: targetUser?.currentStreak || 0,
        longestStreak: targetUser?.longestStreak || 0
      },
      topHabits: habitAnalytics.topHabits || []
    };
    
    res.status(200).json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBlockStatus,
  getUsers,
  getUser,
  getDashboardStats,
  getProfileSummary,
  getSuggestedUsers,
  searchUsers,
  getUserGoals,
  getUserYearlyGoals,
  getUserActivities,
  updateUser,
  updatePrivacy,
  deleteUser,
  listInterests,
  updateTimezone,
  addDashboardYear,
  deleteDashboardYear,
  getAnalytics,
  getUserAnalytics
}; 