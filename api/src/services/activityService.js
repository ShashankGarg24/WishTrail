const Activity = require('../models/Activity');
const pgFollowService = require('../services/pgFollowService');
const pgLikeService = require('../services/pgLikeService');
const pgBlockService = require('../services/pgBlockService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');
const ActivityComment = require('../models/ActivityComment');

class ActivityService {
  /**
   * Enrich activities with goal and user data from PostgreSQL
   */
  async enrichWithPostgresData(activities) {
    const activityArray = Array.isArray(activities) ? activities : [activities];
    
    // Collect unique goal, user, and achievement IDs
    const goalIds = new Set();
    const userIds = new Set();
    const achievementIds = new Set();
    
    activityArray.forEach(activity => {
      if (activity.data?.goalId) goalIds.add(activity.data.goalId);
      if (activity.data?.targetUserId) userIds.add(activity.data.targetUserId);
      if (activity.data?.achievementId) achievementIds.add(activity.data.achievementId.toString());
      if (activity.userId) userIds.add(activity.userId);
    });
    
    // Fetch data in parallel
    const Achievement = require('../models/Achievement');
    const GoalDetails = require('../models/extended/GoalDetails');
    const [goals, users, achievements, goalDetails] = await Promise.all([
      goalIds.size > 0 ? pgGoalService.getGoalsByIds(Array.from(goalIds)) : [],
      userIds.size > 0 ? pgUserService.getUsersByIds(Array.from(userIds)) : [],
      achievementIds.size > 0 ? Achievement.find({ _id: { $in: Array.from(achievementIds) } }).select('name description icon').lean() : [],
      goalIds.size > 0 ? GoalDetails.find({ goalId: { $in: Array.from(goalIds) } }).select('goalId completionNote completionAttachmentUrl').lean() : []
    ]);
    
    // Create lookup maps
    const goalMap = new Map(goals.map(g => [g.id, g]));
    const userMap = new Map(users.map(u => [u.id, u]));
    const achievementMap = new Map(achievements.map(a => [a._id.toString(), a]));
    const goalDetailsMap = new Map(goalDetails.map(gd => [gd.goalId?.toString(), gd]));
    
    // Enrich activities
    const enriched = activityArray.map(activity => {
      const enrichedActivity = { ...activity };
      if (activity.data?.goalId) {
        const goal = goalMap.get(activity.data.goalId.toString());
        const details = goalDetailsMap.get(activity.data.goalId.toString());
        if (goal) {
          // Create nested goal object for backward compatibility
          enrichedActivity.data = {
            ...enrichedActivity.data,
            goalTitle: goal.title,
            goalCategory: goal.category,
            isCompleted: goal.completed,
            completedAt: goal.completed_at,
            goalIsPublic: goal.is_public, // Store goal privacy for filtering
            // Fetch completion data from GoalDetails or preserve from activity data
            completionAttachmentUrl: details?.completionAttachmentUrl || enrichedActivity.data.completionAttachmentUrl || ''
          };
        }
      }
      
      if (activity.data?.targetUserId) {
        const user = userMap.get(activity.data.targetUserId);
        if (user) {
          // Create nested user object for backward compatibility
          enrichedActivity.data = {
            ...enrichedActivity.data,
            targetUser: {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar_url: user.avatar_url
            },
            // Also keep flat fields for compatibility
            targetUserName: user.name,
            targetUserAvatar: user.avatar_url
          };
        }
      }
      
      if (activity.data?.achievementId) {
        const achievement = achievementMap.get(activity.data.achievementId.toString());
        if (achievement) {
          // Create nested achievement object for backward compatibility
          enrichedActivity.data = {
            ...enrichedActivity.data,
            achievement: {
              _id: achievement._id,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon
            },
            // Also keep flat fields for compatibility
            achievementName: achievement.name,
            achievementDescription: achievement.description,
            achievementIcon: achievement.icon
          };
        }
      }
      
      return enrichedActivity;
    });
    
    return Array.isArray(activities) ? enriched : enriched[0];
  }

  /**
   * Get activity feed from followed users
   */
  async getActivityFeed(userId, params = {}) {
    const { page = 1, limit = 10 } = params;
    // Exclude blocked users both ways
    const blockedOut = await pgBlockService.getBlockedUserIds(userId);
    const blockedIn = await pgBlockService.getBlockerUserIds(userId);
    const blockedSet = [...blockedOut, ...blockedIn];
  
    const followingIds = await pgFollowService.getFollowingIds(userId);
  
    const shape = (act) => {
      // Normalize to { user: {...}, ... }
      const base = typeof act.toObject === 'function' ? act.toObject() : act;
      const { userId: authorId, name, username, avatar, ...rest } = base;
      const user = {
        name: name,
        username: username,
        avatar: avatar,
      };
      return { ...rest, user };
    };

    if (followingIds.length === 0) {
      // Return empty feed when user isn't following anyone
      return {
        activities: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
      };
    }
  
    const query = {
      isPublic: true,
      $or: [
        { 
          userId: { $in: followingIds }, 
          type: { $in: [
            'goal_activity',
            'goal_completed',
            'goal_created',
            'subgoal_added',
            'habit_added',
            'subgoal_completed',
            'habit_target_achieved'
          ] } 
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
        .lean(),
      Activity.countDocuments(query)
    ]);
  
    // Enrich with PostgreSQL data and likes
    const enrichedWithPg = await this.enrichWithPostgresData(list);
    
    // Filter out activities that reference private goals
    const filteredActivities = enrichedWithPg.filter(activity => {
      // If activity references a goal, check if goal is public
      if (activity.data?.goalId) {
        // If goal wasn't found or is private, exclude this activity
        return activity.data.goalIsPublic === true;
      }
      // Non-goal activities are included
      return true;
    });
    
    const enriched = await this.enrichWithLikes(filteredActivities, userId);
    const normalized = enriched.map(shape);
  
    return {
      activities: normalized,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    };
  }
  
  async enrichWithLikes(activities, userId) {
    return Promise.all(
      activities.map(async (activity) => {
        const isLiked = await pgLikeService.hasUserLiked(userId, 'activity', String(activity._id));
        const likeCount = await pgLikeService.getLikeCount(String(activity._id), 'activity');
        const commentCount = await ActivityComment.countDocuments({ activityId: activity._id });

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
    
    const blockedOut = userId ? await pgBlockService.getBlockedUserIds(userId) : [];
    const blockedIn = userId ? await pgBlockService.getBlockerUserIds(userId) : [];
    const blockedSet = [...blockedOut, ...blockedIn];
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
    
    const [list, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Activity.countDocuments(query)
    ]);
    
    // Enrich with PostgreSQL data first
    const enrichedWithPg = await this.enrichWithPostgresData(list);
    
    // Filter out activities that reference private goals (only for global view)
    const filteredActivities = type === 'global' 
      ? enrichedWithPg.filter(activity => {
          // If activity references a goal, check if goal is public
          if (activity.data?.goalId) {
            return activity.data.goalIsPublic === true;
          }
          return true;
        })
      : enrichedWithPg; // Personal view includes all activities
    
    const enriched = await Promise.all(
      filteredActivities.map(async (activity) => {
        const isLiked = userId ? await pgLikeService.hasUserLiked(userId, 'activity', String(activity._id)) : false;
        const likeCount = await pgLikeService.getLikeCount('activity', String(activity._id));
        const commentCount = await ActivityComment.countDocuments({ activityId: activity._id });
        return { ...activity, isLiked, likeCount, commentCount };
      })
    );

    const normalized = enriched.map((act) => {
      const { userId: authorId, name, username, avatar, ...rest } = act;
      const user = {
        _id: authorId,
        name: name,
        username: username,
        avatar: avatar,
      };
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
      await pgFollowService.isFollowing(requestingUserId, userId);
    
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
    .lean();
    
    // Enrich with PostgreSQL data
    const enrichedActivities = await this.enrichWithPostgresData(activities);
    
    const total = await Activity.countDocuments({ userId, isActive: true });
    
    // Normalize activities to include user object
    const normalized = enrichedActivities.map((act) => {
      const { userId: authorId, name, username, avatar, ...rest } = act;
      const user = {
        name: name,
        username: username,
        avatar: avatar,
      };
      return { ...rest, user };
    });
    
    return {
      activities: normalized,
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
          'user.avatar': 1
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
    const activity = await Activity.findById(activityId).lean();
    
    if (!activity) {
      throw new Error('Activity not found');
    }
    
    // Enrich with PostgreSQL data
    const enrichedActivity = await this.enrichWithPostgresData(activity);
    
    // Check if user can view this activity
    const canView = enrichedActivity.isPublic || 
      enrichedActivity.userId === requestingUserId ||
      await pgFollowService.isFollowing(requestingUserId, enrichedActivity.userId);
    
    if (!canView) {
      throw new Error('Access denied');
    }
    
    // Add like status
    const isLiked = await pgLikeService.hasUserLiked(requestingUserId, 'activity', activityId);
    const likeCount = await pgLikeService.getLikeCount('activity', activityId);
    const commentCount = await ActivityComment.countDocuments({ activityId });
    
    return {
      ...enrichedActivity,
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
    
    const result = await pgLikeService.toggleLike(userId, 'activity', activityId);
    // Fire push notification to the activity owner on like
    try {
      if (result && result.isLiked && String(activity.userId) !== String(userId)) {
        const pgUserService = require('./pgUserService');
        const Notification = require('../models/Notification');
        const liker = await pgUserService.findById(userId);
        await Notification.createNotification({
          userId: activity.userId,
          type: 'activity_liked',
          title: 'Activity liked',
          message: `${liker?.name || 'Someone'} liked your activity`,
          data: {
            actorId: userId,
            activityId: activity._id,
            goalId: activity?.data?.goalId || undefined
          },
          channels: { push: true, inApp: true }
        });
      }
    } catch (e) { /* non-blocking */ }
    
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
      const canView = await pgFollowService.isFollowing(userId, targetUserId);
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
              { $multiply: [{ $size: '$likes' }, 5] }
            ]
          }
        }
      },
      {
        $sort: { popularityScore: -1, createdAt: -1 }
      },
      {
        $limit: parseInt(limit) * 2 // Fetch more to account for filtering
      },
      {
        $project: {
          type: 1,
          data: 1,
          createdAt: 1,
          likeCount: 1,
          user: {
            _id: '$userId',
            name: '$name',
            username: '$username',
            avatar: '$avatar'
          }
        }
      }
    ]);
    
    // Enrich with PostgreSQL data to check goal privacy
    const enrichedActivities = await this.enrichWithPostgresData(activities);
    
    // Filter out activities with private goals
    const publicActivities = enrichedActivities.filter(activity => {
      if (activity.data?.goalId) {
        return activity.data.goalIsPublic === true;
      }
      return true;
    });
    
    // Return only the requested limit
    return publicActivities.slice(0, parseInt(limit));
  }
}

module.exports = new ActivityService(); 