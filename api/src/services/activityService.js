const Activity = require('../models/Activity');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const User = require('../models/User');
const ActivityComment = require('../models/ActivityComment');
const Block = require('../models/Block');

class ActivityService {
  /**
   * Get activity feed from followed users
   */
  async getActivityFeed(userId, params = {}) {
    const { page = 1, limit = 10 } = params;
    // Exclude blocked users both ways
    const { blockedOut, blockedIn } = await Block.getBlockedSets(userId);
    const blockedSet = [...blockedOut, ...blockedIn];
  
    const followingIds = await Follow.getFollowingIds(userId);
  
    const baseProjectUser = 'name username avatar level';

    const shape = (act) => {
      // Normalize to { user: {...}, ... }
      const base = typeof act.toObject === 'function' ? act.toObject() : act;
      const { userId: author, ...rest } = base;
      const user = author && typeof author === 'object' ? {
        _id: author._id, // keep internally but frontend should prefer username route
        name: author.name,
        username: author.username,
        avatar: author.avatar,
        level: author.level,
      } : undefined;
      return { ...rest, user };
    };

    if (followingIds.length === 0) {
      const filter = {
        isActive: true,
        isPublic: true,
        'data.targetUserId': userId,
        type: { $in: ['user_followed', 'goal_liked'] }
      };

      const [total, list] = await Promise.all([
        Activity.countDocuments(filter),
        Activity.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .populate('userId', baseProjectUser)
          .populate('data.goalId', 'title category')
          .populate('data.targetUserId', 'name username avatar')
          .lean()
      ]);

      const enriched = await this.enrichWithLikes(list, userId);
      const normalized = enriched.map(shape);

      return {
        activities: normalized,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      };
    }
  
    const query = {
      isActive: true,
      isPublic: true,
      $or: [
        { 
          userId: { $in: followingIds }, 
          type: { $in: ['goal_completed', 'goal_created', 'level_up', 'streak_milestone', 'achievement_earned'] } 
        }
      ]
    };

    if (blockedSet.length > 0) {
      query.userId = { $nin: blockedSet };
    }
  
    const [list, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId', baseProjectUser)
        .populate('data.goalId', 'title category')
        .populate('data.targetUserId', 'name username avatar')
        .lean(),
      Activity.countDocuments(query)
    ]);
  
    const enriched = await this.enrichWithLikes(list, userId);
    const normalized = enriched.map(shape);
  
    return {
      activities: normalized,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    };
  }
  
  async enrichWithLikes(activities, userId) {
    return Promise.all(
      activities.map(async (activity) => {
        const isLiked = await Like.hasUserLiked(userId, 'activity', activity._id);
        const likeCount = await Like.getLikeCount('activity', activity._id);
        const commentCount = await ActivityComment.countDocuments({ activityId: activity._id, isActive: true });

        const base = typeof activity.toObject === 'function' ? activity.toObject() : activity;
        return { ...base, isLiked, likeCount, commentCount };
      })
    );
  }

  /**
   * Get recent activities (global or personal)
   */
  async getRecentActivities(userId, params = {}) {
    const { page = 1, limit = 10, type = 'global' } = params;
    
    const { blockedOut, blockedIn } = await Block.getBlockedSets(userId || null);
    const blockedSet = [...(blockedOut || []), ...(blockedIn || [])];
    let query = { isActive: true, isPublic: true };
    if (type === 'personal') {
      query.userId = userId;
      query.isPublic = undefined; // Include both public and private for personal
    }
    if (blockedSet.length > 0) {
      query.userId = query.userId ? query.userId : { $nin: blockedSet };
      if (query.userId && query.userId.$nin === undefined) {
        // personal view should not need $nin
      } else if (query.userId && query.userId.$nin) {
        // already set
      }
    }
    
    const baseProjectUser = 'name username avatar level';

    const [list, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId', baseProjectUser)
        .populate('data.goalId', 'title category')
        .populate('data.targetUserId', 'name username avatar')
        .lean(),
      Activity.countDocuments(query)
    ]);
    
    const enriched = await Promise.all(
      list.map(async (activity) => {
        const isLiked = userId ? await Like.hasUserLiked(userId, 'activity', activity._id) : false;
        const likeCount = await Like.getLikeCount('activity', activity._id);
        const commentCount = await ActivityComment.countDocuments({ activityId: activity._id, isActive: true });
        return { ...activity, isLiked, likeCount, commentCount };
      })
    );

    const normalized = enriched.map((act) => {
      const { userId: author, ...rest } = act;
      const user = author && typeof author === 'object' ? {
        _id: author._id,
        name: author.name,
        username: author.username,
        avatar: author.avatar,
        level: author.level,
      } : undefined;
      return { ...rest, user };
    });
    
    return {
      activities: normalized,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    };
  }
  
  /**
   * Get user's activities
   */
  async getUserActivities(userId, requestingUserId, params = {}) {
    const { page = 1, limit = 10 } = params;
    
    // Check if user can view activities
    const canViewActivities = userId === requestingUserId || 
      await Follow.isFollowing(requestingUserId, userId);
    
    if (!canViewActivities) {
      throw new Error('Access denied');
    }
    
    const activities = await Activity.find({ 
      userId, 
      isActive: true 
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('data.goalId', 'title category')
    .populate('data.targetUserId', 'name avatar');
    
    const total = await Activity.countDocuments({ userId, isActive: true });
    
    return {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get trending activities
   */
  async getTrendingActivities(params = {}) {
    const { page = 1, limit = 10, timeframe = 'week' } = params;
    
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
    
    // Attach batched comment counts
    const ids = activities.map(a => a._id);
    let idToCount = new Map();
    if (ids.length) {
      const counts = await ActivityComment.aggregate([
        { $match: { activityId: { $in: ids }, isActive: true } },
        { $group: { _id: '$activityId', count: { $sum: 1 } } }
      ]);
      idToCount = new Map(counts.map(c => [String(c._id), c.count]));
    }
    const activitiesWithCounts = activities.map(a => ({ ...a, commentCount: idToCount.get(String(a._id)) || 0 }));

    return {
      activities: activitiesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get activity by ID
   */
  async getActivityById(activityId, requestingUserId) {
    const activity = await Activity.findById(activityId)
      .populate('userId', 'name avatar level')
      .populate('likes', 'name avatar');
    
    if (!activity) {
      throw new Error('Activity not found');
    }
    
    // Check if user can view this activity
    const isBlocked = await Block.isBlockedBetween(requestingUserId, activity.userId._id);
    const canView = !isBlocked && (activity.isPublic || 
      activity.userId._id.toString() === requestingUserId ||
      await Follow.isFollowing(requestingUserId, activity.userId._id));
    
    if (!canView) {
      throw new Error('Access denied');
    }
    
    // Add like status
    const isLiked = await Like.isLiked(requestingUserId, 'activity', activityId);
    const likeCount = await Like.getLikeCount('activity', activityId);
    const commentCount = await ActivityComment.countDocuments({ activityId, isActive: true });
    
    return {
      ...activity.toObject(),
      isLiked,
      likeCount,
      commentCount
    };
  }
  
  /**
   * Toggle like on an activity
   */
  async toggleActivityLike(activityId, userId) {
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }
    
    // Don't allow liking own activities
    if (activity.userId.toString() === userId.toString()) {
      throw new Error('Cannot like your own activity');
    }
    
    const result = await Like.toggleLike(userId, 'activity', activityId);
    
    return {
      isLiked: result.isLiked,
      likeCount: result.likeCount
    };
  }
  
  /**
   * Get activity statistics
   */
  async getActivityStats(userId, targetUserId = null) {
    const queryUserId = targetUserId || userId;
    
    // If viewing another user's stats, check if following them
    if (targetUserId && targetUserId !== userId) {
      const canView = await Follow.isFollowing(userId, targetUserId);
      if (!canView) {
        throw new Error('Access denied');
      }
    }
    
    const stats = await Activity.aggregate([
      {
        $match: {
          userId: queryUserId,
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
      userId: queryUserId,
      isActive: true
    });
    
    // Get activities in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivities = await Activity.countDocuments({
      userId: queryUserId,
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
    
    return formattedStats;
  }
  
  /**
   * Create a new activity
   */
  async createActivity(userId, name, avatar, type, data) {
    try {
      const activity = new Activity({
        userId,
        name,
        avatar,
        type,
        data
      });
      
      return await activity.save();
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }
  
  /**
   * Get activity feed for explore page (popular activities)
   */
  async getExploreActivityFeed(params = {}) {
    const { limit = 15 } = params;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.aggregate([
      {
        $match: {
          isPublic: true,
          isActive: true,
          type: 'goal_completed',
          createdAt: { $gte: sevenDaysAgo }
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
          likeCount: { $size: '$likes' },
          popularityScore: {
            $add: [
              { $multiply: ['$data.pointsEarned', 0.1] },
              { $multiply: [{ $size: '$likes' }, 5] }
            ]
          }
        }
      },
      {
        $sort: { popularityScore: -1, createdAt: -1 }
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
          user: {
            _id: '$user._id',
            name: '$user.name',
            avatar: '$user.avatar'
          }
        }
      }
    ]);
    
    return activities;
  }
}

module.exports = new ActivityService(); 