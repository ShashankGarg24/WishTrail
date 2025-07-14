const Activity = require('../models/Activity');
const Like = require('../models/Like');
const Follow = require('../models/Follow');
const redisClient = require('../config/redis');

const GLOBAL_ACTIVITY_KEY = "wishtrail:activity:global";
const CACHE_TTL = 60; // in seconds

// @desc    Get recent activities (global or personal)
// @route   GET /api/v1/activities/recent
// @access  Private
const getRecentActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type = 'global' } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const cacheKey = type === 'personal'
      ? `${PERSONAL_ACTIVITY_KEY_PREFIX}:${req.user.id}:page:${parsedPage}:limit:${parsedLimit}`
      : `${GLOBAL_ACTIVITY_KEY}:page:${parsedPage}:limit:${parsedLimit}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        fromCache: true
      });
    }

    let activities;
    if (type === 'personal') {
      activities = await Activity.getUserActivities(req.user.id, {
        page: parsedPage,
        limit: parsedLimit
      });
    } else {
      activities = await Activity.getRecentActivities(null, {
        page: parsedPage,
        limit: parsedLimit
      });
    }
    
    const safeActivities = JSON.parse(JSON.stringify(activities));
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(safeActivities));

    res.status(200).json({
      success: true,
      data: activities,
      fromCache: false
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activities
// @route   GET /api/v1/activities/user/:userId
// @access  Private
const getUserActivities = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Check if user can view activities (either own activities or following the user)
    const canViewActivities = userId === req.user.id || await Follow.isFollowing(req.user.id, userId);
    
    if (!canViewActivities) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const activities = await Activity.getUserActivities(userId, {
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

// @desc    Like/unlike an activity
// @route   PATCH /api/v1/activities/:id/like
// @access  Private
const toggleActivityLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    const result = await Like.toggleLike(req.user.id, 'activity', activity._id);
    
    res.status(200).json({
      success: true,
      data: {
        isLiked: result.isLiked,
        likeCount: result.likeCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity by ID
// @route   GET /api/v1/activities/:id
// @access  Private
const getActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const activity = await Activity.findById(id)
      .populate('userId', 'name avatar level')
      .populate('likes', 'name avatar');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Check if user can view this activity
    const canView = activity.isPublic || 
      activity.userId._id.toString() === req.user.id.toString() ||
      await Follow.isFollowing(req.user.id, activity.userId._id);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { activity }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending activities
// @route   GET /api/v1/activities/trending
// @access  Private
const getTrendingActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, timeframe = 'week' } = req.query;
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const activities = await Activity.aggregate([
      {
        $match: {
          isPublic: true,
          isActive: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'targetId',
          as: 'likes'
        }
      },
      {
        $addFields: {
          likeCount: { $size: '$likes' }
        }
      },
      {
        $sort: { likeCount: -1, createdAt: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          type: 1,
          data: 1,
          createdAt: 1,
          likeCount: 1,
          'user.name': 1,
          'user.avatar': 1,
          'user.level': 1
        }
      }
    ]);
    
    const total = await Activity.countDocuments({
      isPublic: true,
      isActive: true,
      createdAt: { $gte: startDate }
    });
    
    res.status(200).json({
      success: true,
      data: {
        activities,
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

// @desc    Get activity stats
// @route   GET /api/v1/activities/stats
// @access  Private
const getActivityStats = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;
    
    // If viewing another user's stats, check if following them
    if (targetUserId !== req.user.id) {
      const canView = await Follow.isFollowing(req.user.id, targetUserId);
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const stats = await Activity.aggregate([
      {
        $match: {
          userId: new require('mongoose').Types.ObjectId(targetUserId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get total activity count
    const totalActivities = await Activity.countDocuments({
      userId: targetUserId,
      isActive: true
    });
    
    // Get activities in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivities = await Activity.countDocuments({
      userId: targetUserId,
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Format stats
    const formattedStats = {
      totalActivities,
      recentActivities,
      activityTypes: {}
    };
    
    stats.forEach(stat => {
      formattedStats.activityTypes[stat._id] = stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: { stats: formattedStats }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecentActivities,
  getUserActivities,
  toggleActivityLike,
  getActivity,
  getTrendingActivities,
  getActivityStats
}; 