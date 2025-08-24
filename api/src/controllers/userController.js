const User = require('../models/User');
const Block = require('../models/Block');
const userService = require('../services/userService');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');

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
    const {user, stats, isFollowing, isRequested} = await userService.getUserByIdOrUsername(idOrUsername, req.user.id);
    res.status(200).json({
      success: true,
      data: {user: user, stats: stats, isFollowing: isFollowing, isRequested: isRequested}
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
      data: { stats }
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
// @route   GET /api/v1/users/:id/goals
// @access  Private
const getUserGoals = async (req, res, next) => {
  try {
    const goalService = require('../services/goalService');
    const { id } = req.params;
    
    // Check if user can view these goals
    if (id !== req.user.id) {
      const user = await userService.getUserByIdOrUsername(id, req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    const result = await goalService.getGoals(id, req.query);

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
  listInterests
}; 