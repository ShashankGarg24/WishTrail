const UserPreferences = require('../models/extended/UserPreferences');
const pgBlockService = require('../services/pgBlockService');
const userService = require('../services/userService');
const pgUserService = require('../services/pgUserService');
const pgGoalService = require('../services/pgGoalService');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { sanitizeUser, sanitizeGoalsForProfile } = require('../utility/sanitizer');

// Lightweight block status check
const getBlockStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const target = await pgUserService.findById(userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const [iBlocked, blockedMe] = await Promise.all([
      pgBlockService.isBlocking(req.user.id, parseInt(userId)),
      pgBlockService.isBlocking(parseInt(userId), req.user.id)
    ]);
    return res.json({ 
      success: true, 
      data: { 
        isBlocked: iBlocked, 
        hasBlockedMe: blockedMe,
        canViewProfile: !iBlocked && !blockedMe
      } 
    });
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
    const {user, stats, isFollowing, isRequested, isBlocked} = await userService.getUserByUsername(idOrUsername, req.user.id);
    
    // ✅ Sanitize user data - hide sensitive fields for other users
    const isSelf = user.username === req.user.username;
    const sanitizedUser = sanitizeUser(user, isSelf);
    
    res.status(200).json({
      success: true,
      data: {user: sanitizedUser, stats: stats, isFollowing: isFollowing, isRequested: isRequested, isBlocked: isBlocked || false}
    });
  } catch (error) {
    // Handle block-specific errors
    if (error.blocked) {
      return res.status(403).json({
        success: false,
        message: error.message,
        blocked: true
      });
    }
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

// @desc    Get dashboard years (years with goals + manually added years)
// @route   GET /api/v1/users/dashboard/years
// @access  Private
const getDashboardYears = async (req, res, next) => {
  try {
    // Get years where user has goals from PostgreSQL
    const yearsWithGoals = await pgGoalService.getUserYearsWithGoals(req.user.id);
    
    // Get manually added years from UserPreferences
    const prefs = await UserPreferences.findOne({ userId: req.user.id }).select('dashboardYears').lean();
    const manualYears = prefs?.dashboardYears || [];
    
    // Combine and deduplicate
    const allYears = [...new Set([...yearsWithGoals, ...manualYears])];
    allYears.sort((a, b) => b - a); // Sort descending (newest first)
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        years: allYears,
        yearsWithGoals,
        manualYears
      } 
    });
  } catch (error) { 
    next(error); 
  }
}

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
    // Allow past years (up to 5 years back) and future years (up to 5 years ahead)
    if (y < currentYear - 5 || y > currentYear + 5) {
      return res.status(400).json({ success: false, message: `Year must be between ${currentYear - 5} and ${currentYear + 5}` })
    }
    // Use UserPreferences with PostgreSQL user ID
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { dashboardYears: y } },
      { new: true, upsert: true }
    ).select('userId dashboardYears')
    return res.status(200).json({ success: true, data: { years: prefs.dashboardYears || [] } })
  } catch (error) { next(error) }
}

// @desc    Delete a dashboard year and all related data
// @route   DELETE /api/v1/users/dashboard/years/:year
// @access  Private
const deleteDashboardYear = async (req, res, next) => {
  try {
    const Activity = require('../models/Activity');
    const ActivityComment = require('../models/ActivityComment');
    const Notification = require('../models/Notification');
    const CommunityActivity = require('../models/CommunityActivity');
    const CommunityItem = require('../models/CommunityItem');
    const pgLikeService = require('../services/pgLikeService');
    
    const { year } = req.params;
    const y = parseInt(year);
    if (!y || Number.isNaN(y)) {
      return res.status(400).json({ success: false, message: 'Provide valid year' });
    }
    
    // Get all goals for this year first (from PostgreSQL)
    const goalsResult = await pgGoalService.getUserGoals({ 
      userId: req.user.id, 
      year: y,
      page: 1,
      limit: 10000 // Get all goals for this year
    });
    
    const goalsToDelete = goalsResult.goals || [];
    const goalIds = goalsToDelete.map(g => g.id);
    const completedCount = goalsToDelete.filter(g => g.completed_at).length;
    
    if (goalIds.length > 0) {
      // 1. Delete all activities related to these goals (MongoDB)
      const deletedActivities = await Activity.find({ 
        'data.goalId': { $in: goalIds } 
      }).select('_id').lean();
      const activityIds = deletedActivities.map(a => a._id);
      
      if (activityIds.length > 0) {
        // Delete activities
        await Activity.deleteMany({ _id: { $in: activityIds } });
        
        // Delete comments on these activities
        await ActivityComment.deleteMany({ activityId: { $in: activityIds } });
        
        // Delete likes on these activities (PostgreSQL)
        for (const activityId of activityIds) {
          await pgLikeService.deleteLikesByTarget('activity', activityId.toString());
        }
      }
      
      // 2. Delete likes on the goals themselves (PostgreSQL)
      for (const goalId of goalIds) {
        await pgLikeService.deleteLikesByTarget('goal', goalId.toString());
      }
      
      // 3. Delete notifications related to these goals (MongoDB)
      await Notification.deleteMany({ 
        'data.goalId': { $in: goalIds } 
      });
      
      // 4. Deactivate community items that reference these goals (MongoDB)
      await CommunityItem.updateMany(
        { type: 'goal', sourceId: { $in: goalIds.map(id => id.toString()) } },
        { $set: { isActive: false } }
      );
      
      // 5. Delete community activities related to these goals (MongoDB)
      await CommunityActivity.deleteMany({ 
        'data.goalId': { $in: goalIds } 
      });
      
      // 6. Delete all goals for this year (PostgreSQL)
      for (const goalId of goalIds) {
        await pgGoalService.deleteGoal(goalId, req.user.id);
      }
    }
    
    // 7. Update user statistics in PostgreSQL
    if (goalIds.length > 0 || completedCount > 0) {
      await pgUserService.incrementStats(req.user.id, { 
        total_goals: -goalIds.length,
        completed_goals: -completedCount
      });
    }
    
    // 8. Remove year from user's dashboardYears in UserPreferences (MongoDB)
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { dashboardYears: y } },
      { new: true, upsert: true }
    ).select('userId dashboardYears');
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        years: prefs.dashboardYears || [],
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

    const payload = await userService.searchUsers(search || '', { 
      ...req.query, 
      requestingUserId: req.user.id 
    });

    res.status(200).json({
      success: true,
      data: payload
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
    const pgFollowService = require('../services/pgFollowService');
    const { username } = req.params;
    const { page = 1, limit = 9, status, category, year } = req.query;
    
    const targetUser = await pgUserService.getUserByUsername(username);
    console.log('Target user for goals:', targetUser);
    
    // Check privacy if viewing another user's goals
    if (username !== req.user.username) {
      if (!targetUser || !targetUser.is_active) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if profile is private and user is not following
      if (targetUser.is_private) {
        const isFollowing = await pgFollowService.isFollowing(req.user.id, targetUser.id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: 'This profile is private'
          });
        }
      }
    }

    // Build query params for pgGoalService
    const queryParams = {
      userId: targetUser.id,
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (status === 'completed') queryParams.completed = true;
    else if (status === 'active') queryParams.completed = false;
    
    if (category) queryParams.category = category;
    if (year) queryParams.year = parseInt(year);

    const result = await pgGoalService.getUserGoals(queryParams);

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
    const user = await pgUserService.updateUser(userId, { is_private: isPrivate });

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

    await pgUserService.updateUser(id, { is_active: false });

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
    const updates = {};
    if (timezone) updates.timezone = timezone;
    if (typeof timezoneOffsetMinutes === 'number') updates.timezone_offset_minutes = timezoneOffsetMinutes;
    const user = await pgUserService.updateUser(req.user.id, updates);
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

// @desc    Get user analytics (goals + habits overall stats)
// @route   GET /api/v1/users/analytics?username=@username (optional)
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const { username } = req.query;
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
      
      targetUserId = targetUserData.user.id;
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
    // Get user from PostgreSQL
    const user = await pgUserService.getUserByUsername(targetUsername);
    if (!user || !user.is_active) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get goals stats from PostgreSQL
    const goalsResult = await pgGoalService.getUserGoals({
      userId: targetUserId,
      page: 1,
      limit: 1
    });
    const totalGoals = goalsResult.pagination.total;
    const completedGoalsResult = await pgGoalService.getUserGoals({
      userId: targetUserId,
      completed: true,
      page: 1,
      limit: 1
    });
    const completedGoals = completedGoalsResult.pagination.total;
    
    // Get habits analytics (30 days by default)
    const habitAnalytics = await habitService.analytics(targetUserId, { days: 30 });
    
    const analytics = {
      habits: {
        done: habitAnalytics.totals?.done || 0,
        missed: habitAnalytics.totals?.missed || 0,
        skipped: habitAnalytics.totals?.skipped || 0
      },
      goals: {
        totalGoals: totalGoals || 0,
        completedGoals: completedGoals || 0,
        currentStreak: user?.current_streak || 0,
        longestStreak: user?.longest_streak || 0
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
    const habitService = require('../services/habitService');
    const pgFollowService = require('../services/pgFollowService');
    
    // Get target user from PostgreSQL
    const targetUser = await pgUserService.getUserById(targetUserId);
    if (!targetUser || !targetUser.is_active) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check privacy - only show if:
    // 1. Viewing own profile
    // 2. Profile is public
    // 3. Requesting user is following target user
    const isSelf = String(targetUserId) === String(requestingUserId);
    const isPublic = !targetUser.is_private;
    const isFollowing = isSelf ? false : await pgFollowService.isFollowing(requestingUserId, targetUserId);
    
    if (!isSelf && !isPublic && !isFollowing) {
      return res.status(403).json({ 
        success: false, 
        message: 'This profile is private' 
      });
    }
    
    // Get goals stats from PostgreSQL
    const goalsResult = await pgGoalService.getUserGoals({
      userId: targetUserId,
      page: 1,
      limit: 1
    });
    const totalGoals = goalsResult.pagination.total;
    const completedGoalsResult = await pgGoalService.getUserGoals({
      userId: targetUserId,
      completed: true,
      page: 1,
      limit: 1
    });
    const completedGoals = completedGoalsResult.pagination.total;
    
    // Get habits analytics (30 days by default)
    const habitAnalytics = await habitService.analytics(targetUserId, { days: 30 });
    
    const analytics = {
      habits: {
        done: habitAnalytics.totals?.done || 0,
        missed: habitAnalytics.totals?.missed || 0,
        skipped: habitAnalytics.totals?.skipped || 0
      },
      goals: {
        totalGoals: totalGoals || 0,
        completedGoals: completedGoals || 0,
        currentStreak: targetUser?.current_streak || 0,
        longestStreak: targetUser?.longest_streak || 0
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
  getDashboardYears,
  addDashboardYear,
  deleteDashboardYear,
  getAnalytics,
  getUserAnalytics
}; 