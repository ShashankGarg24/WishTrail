const User = require('../models/User');
const Goal = require('../models/Goal');
const Activity = require('../models/Activity');
const Follow = require('../models/Follow');

// @desc    Get all users with pagination and search
// @route   GET /api/v1/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = { isActive: true };
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const users = await User.find(query)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires');
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user's public stats
    const currentYear = new Date().getFullYear();
    const goals = await Goal.find({ userId: user._id, year: currentYear });
    const completedGoals = goals.filter(g => g.completed);
    
    const userStats = {
      totalGoals: goals.length,
      completedGoals: completedGoals.length,
      completionRate: goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0,
      totalPoints: user.totalPoints,
      level: user.level,
      currentStreak: user.currentStreak,
      joinedDate: user.createdAt
    };
    
    // Check if current user is following this user
    const isFollowing = await Follow.isFollowing(req.user.id, user._id);
    
    res.status(200).json({
      success: true,
      data: {
        user,
        stats: userStats,
        isFollowing
      }
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
    const { id } = req.params;
    const { year, page = 1, limit = 10 } = req.query;
    
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user can view goals (either own goals or following the user)
    const canViewGoals = id === req.user.id || await Follow.isFollowing(req.user.id, id);
    
    if (!canViewGoals) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const query = { userId: id };
    if (year) query.year = parseInt(year);
    
    const goals = await Goal.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('likes', 'name');
    
    const total = await Goal.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        goals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
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
    const { page = 1, limit = 10 } = req.query;
    
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user can view activities (either own activities or following the user)
    const canViewActivities = id === req.user.id || await Follow.isFollowing(req.user.id, id);
    
    if (!canViewActivities) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const activities = await Activity.getUserActivities(id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's dashboard stats
// @route   GET /api/v1/users/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();
    
    // Get current year goals
    const goals = await Goal.find({ userId, year: currentYear });
    const completedGoals = goals.filter(g => g.completed);
    const pendingGoals = goals.filter(g => !g.completed);
    
    // Get user data
    const user = await User.findById(userId);
    
    // Calculate daily completions
    const todayCompletions = user.getTodayCompletionCount();
    
    // Get completion rate
    const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;
    // Get recent activities
    const recentActivities = await Activity.getRecentActivities({ limit: 5 }, userId);
    
    const stats = {
      totalGoals: goals.length,
      completedGoals: completedGoals.length,
      pendingGoals: pendingGoals.length,
      completionRate,
      totalPoints: user.totalPoints,
      level: user.level,
      currentStreak: user.currentStreak,
      todayCompletions,
      dailyLimit: 3,
      recentActivities: recentActivities.activities
    };
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's profile summary
// @route   GET /api/v1/users/profile
// @access  Private
const getProfileSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user with basic info
    const user = await User.findById(userId)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires');
    
    // Get goals across all years
    const allGoals = await Goal.find({ userId });
    const completedGoals = allGoals.filter(g => g.completed);
    
    // Get yearly breakdown
    const yearlyBreakdown = {};
    allGoals.forEach(goal => {
      if (!yearlyBreakdown[goal.year]) {
        yearlyBreakdown[goal.year] = {
          total: 0,
          completed: 0,
          points: 0
        };
      }
      yearlyBreakdown[goal.year].total++;
      if (goal.completed) {
        yearlyBreakdown[goal.year].completed++;
        yearlyBreakdown[goal.year].points += goal.pointsEarned;
      }
    });
    
    // Calculate completion rate for each year
    Object.keys(yearlyBreakdown).forEach(year => {
      const yearData = yearlyBreakdown[year];
      yearData.completionRate = yearData.total > 0 ? Math.round((yearData.completed / yearData.total) * 100) : 0;
    });
    
    // Get follower/following counts
    const followers = await Follow.getFollowers(userId);
    const following = await Follow.getFollowing(userId);
    
    const profileSummary = {
      user,
      stats: {
        totalGoals: allGoals.length,
        completedGoals: completedGoals.length,
        totalPoints: user.totalPoints,
        level: user.level,
        currentStreak: user.currentStreak,
        followerCount: followers.length,
        followingCount: following.length,
        yearlyBreakdown
      }
    };
    
    res.status(200).json({
      success: true,
      data: profileSummary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggested users to follow
// @route   GET /api/v1/users/suggestions
// @access  Private
const getSuggestedUsers = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    const suggestions = await Follow.getSuggestedUsers(req.user.id, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users
// @route   GET /api/v1/users/search
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }
    
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ]
    };
    
    const users = await User.find(searchQuery)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .sort({ totalPoints: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(searchQuery);
    
    // Add following status for each user
    const usersWithFollowStatus = await Promise.all(
      users.map(async (user) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user.toObject(),
          isFollowing
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        users: usersWithFollowStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's yearly goals with filters
// @route   GET /api/v1/users/:id/goals/yearly/:year
// @access  Private
const getUserYearlyGoals = async (req, res, next) => {
  try {
    const { id, year } = req.params;
    const { category, status } = req.query;
    
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user can view goals
    const canViewGoals = id === req.user.id || await Follow.isFollowing(req.user.id, id);
    
    if (!canViewGoals) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const query = { userId: id, year: parseInt(year) };
    
    // Add filters
    if (category) query.category = category;
    if (status === 'completed') query.completed = true;
    if (status === 'pending') query.completed = false;
    
    const goals = await Goal.find(query)
      .sort({ createdAt: -1 })
      .populate('likes', 'name');
    
    const completed = goals.filter(g => g.completed);
    const pending = goals.filter(g => !g.completed);
    
    const summary = {
      year: parseInt(year),
      total: goals.length,
      completed: completed.length,
      pending: pending.length,
      completionRate: goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0,
      totalPoints: completed.reduce((sum, goal) => sum + goal.pointsEarned, 0)
    };
    
    res.status(200).json({
      success: true,
      data: {
        goals,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  getUserGoals,
  getUserActivities,
  getDashboardStats,
  getProfileSummary,
  getSuggestedUsers,
  searchUsers,
  getUserYearlyGoals
}; 