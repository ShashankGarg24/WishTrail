const Activity = require('../models/Activity');
const cacheService = require('../services/cacheService');
const ActivityComment = require('../models/ActivityComment');
const Notification = require('../models/Notification');

// PostgreSQL Services
const pgLikeService = require('../services/pgLikeService');
const pgFollowService = require('../services/pgFollowService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');

/**
 * Enrich activities with goal and user data from PostgreSQL
 */
async function enrichActivities(activities) {
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
  const [goals, users, achievements] = await Promise.all([
    goalIds.size > 0 ? pgGoalService.getGoalsByIds(Array.from(goalIds)) : [],
    userIds.size > 0 ? pgUserService.getUsersByIds(Array.from(userIds)) : [],
    achievementIds.size > 0 ? Achievement.find({ _id: { $in: Array.from(achievementIds) } }).select('name description icon').lean() : []
  ]);
  
  // Create lookup maps
  const goalMap = new Map(goals.map(g => [g.id, g]));
  const userMap = new Map(users.map(u => [u.id, u]));
  const achievementMap = new Map(achievements.map(a => [a._id.toString(), a]));
  
  // Enrich activities
  const enriched = activityArray.map(activity => {
    const enrichedActivity = { ...activity };
    
    // Enrich main user data (the person who created the activity)
    if (activity.userId) {
      const user = userMap.get(activity.userId);
      if (user) {
        enrichedActivity.name = user.name;
        enrichedActivity.username = user.username;
        enrichedActivity.avatar = user.avatar_url;
        // Add isPremium flag
        enrichedActivity.data = {
          ...enrichedActivity.data,
          isPremium: user.is_premium || false
        };
      }
    }
    
    if (activity.data?.goalId) {
      const goal = goalMap.get(activity.data.goalId);
      if (goal) {
        // Create nested goal object for backward compatibility
        enrichedActivity.data = {
          ...enrichedActivity.data,
          goal: {
            id: goal.id,
            title: goal.title,
            category: goal.category,
            completed: goal.completed,
            completed_at: goal.completed_at
          },
          // Also keep flat fields for compatibility
          goalTitle: goal.title,
          goalCategory: goal.category,
          isCompleted: goal.completed,
          completedAt: goal.completed_at
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

// @desc    Get recent activities (global or personal)
// @route   GET /api/v1/activities/recent
// @access  Private
const getRecentActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type = 'global' } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const cacheParams = { page: parsedPage, limit: parsedLimit, type };

    let activities;
    let fromCache = false;

    if (type === 'personal') {
      activities = await cacheService.getPersonalActivities(req.user.id, cacheParams);
    } else {
      activities = await cacheService.getGlobalActivities(cacheParams);
    }

    if (activities) {
      fromCache = true;
    } else {
      // Fetch from database
      if (type === 'personal') {
        // Get activities from users the current user follows
        const followingIds = await pgFollowService.getFollowingIds(req.user.id);
        followingIds.push(req.user.id); // Include own activities
        
        const totalActivities = await Activity.countDocuments({
          userId: { $in: followingIds },
          isActive: true,
          isPublic: true
        });

        const activityList = await Activity.find({
          userId: { $in: followingIds },
          isActive: true,
          isPublic: true
        })
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit)
        .lean();

        // Enrich with PostgreSQL data
        const enrichedActivities = await enrichActivities(activityList);

        activities = {
          activities: enrichedActivities,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: totalActivities,
            pages: Math.ceil(totalActivities / parsedLimit)
          }
        };

        // Cache the result
        await cacheService.setPersonalActivities(req.user.id, activities, cacheParams);
      } else {
        // Global activities
        const filter = {
        isPublic: true,
        type: { $in: [
          'goal_activity', 
          'goal_completed', 
          'goal_created', 
          'subgoal_added',
          'subgoal_removed',
          'subgoal_completed',
          'subgoal_uncompleted',
          'habit_added',
          'habit_removed',
          'habit_target_achieved',
          'streak_milestone', 
          'achievement_earned'
        ] }
      };

      const [totalActivities, activityList] = await Promise.all([
        Activity.countDocuments(filter),
        Activity.find(filter)
          .sort({ createdAt: -1 })
          .limit(parsedLimit)
          .skip((parsedPage - 1) * parsedLimit)
          .lean()
      ]);

      console.log(`Fetched ${activityList.length} activities from DB for global feed (total: ${totalActivities})`);
      // Enrich with PostgreSQL data
      const enrichedActivities = await enrichActivities(activityList);

        activities = {
          activities: enrichedActivities,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: totalActivities,
            pages: Math.ceil(totalActivities / parsedLimit)
          }
        };

        // Cache the result
        await cacheService.setGlobalActivities(activities, cacheParams);
      }
    }

    res.status(200).json({
      success: true,
      data: activities,
      fromCache
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
    const canViewActivities = userId === req.user.id || await pgFollowService.isFollowing(req.user.id, userId);
    
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
    
    // Enrich with PostgreSQL data
    const enrichedActivities = await enrichActivities(activities);
    
    res.status(200).json({
      success: true,
      data: enrichedActivities
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
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      const likeFlag = typeof req.body?.like === 'boolean' ? req.body.like : null;
      try {
        if (likeFlag === true) {
          await pgLikeService.likeTarget({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
        } else if (likeFlag === false) {
          await pgLikeService.unlikeTarget({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
        } else {
          // Toggle behaviour
          await pgLikeService.toggleLike({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
        }
      } catch (_) {}

      const [likeCount, isLiked] = await Promise.all([
        pgLikeService.getLikeCount(String(id), 'activity'),
        pgLikeService.hasUserLiked(req.user.id, 'activity', String(id))
      ]);
      if (isLiked) {
        await Notification.createActivityLikeNotification(req.user.id, activity);
      }
      
      res.status(200).json({ success: true, data: { likeCount, isLiked } });
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
    
    const activity = await Activity.findById(id).lean();
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Enrich with PostgreSQL data
    const enrichedActivity = await enrichActivities(activity);
    
    // Check if user can view this activity
    const canView = enrichedActivity.isPublic || 
      enrichedActivity.userId === req.user.id ||
      await pgFollowService.isFollowing(req.user.id, enrichedActivity.userId);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const [likeCount, isLiked, commentCount] = await Promise.all([
      pgLikeService.getLikeCount(String(id), 'activity'),
      pgLikeService.hasUserLiked(req.user.id, 'activity', id),
      ActivityComment.countDocuments({ activityId: id, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: { activity: { ...enrichedActivity, likeCount, isLiked, commentCount } }
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
          'user.avatar': 1
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
      const canView = await pgFollowService.isFollowing(req.user.id, targetUserId);
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

// @desc    Get comments for an activity (with single-level replies)
// @route   GET /api/v1/activities/:id/comments
// @access  Private
const getActivityComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');

    const [roots, count] = await Promise.all([
      ActivityComment.find({ activityId: id, parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityComment.countDocuments({ activityId: id, parentCommentId: null})
    ]);

    const rootIds = roots.map(r => r._id);
    const replies = await ActivityComment.find({ parentCommentId: { $in: rootIds } })
      .sort({ createdAt: 1 })
      .lean();

    // Collect all unique user IDs
    const allComments = [...roots, ...replies];
    const userIds = [...new Set(allComments.map(c => c.userId))];
    
    // Fetch all users from PostgreSQL
    const users = await pgUserService.getUsersByIds(userIds);
    const userMap = new Map(users.map(u => [String(u.id), u]));
    
    // Enrich with like counts, isLiked, and user data
    const enrichedMap = new Map();
    await Promise.all(allComments.map(async (c) => {
      const [likeCount, isLiked] = await Promise.all([
        pgLikeService.getLikeCount(String(c._id), 'activity_comment'),
        pgLikeService.hasUserLiked(req.user.id, 'activity_comment', String(c._id))
      ]);
      const user = userMap.get(String(c.userId));
      enrichedMap.set(String(c._id), { 
        likeCount, 
        isLiked,
        userId: user ? {
          _id: String(user.id),
          name: user.name,
          username: user.username,
          avatar: user.avatar_url
        } : c.userId
      });
    }));

    const repliesWithLikes = replies.map(r => ({ ...r, ...enrichedMap.get(String(r._id)) }));
    const rootIdToReplies = repliesWithLikes.reduce((acc, r) => {
      const key = String(r.parentCommentId);
      (acc[key] = acc[key] || []).push(r); 
      return acc;
    }, {});

    const rootsWithLikes = roots.map(r => ({ ...r, ...enrichedMap.get(String(r._id)) }));
    const data = rootsWithLikes.map(r => ({ ...r, replies: rootIdToReplies[String(r._id)] || [] }));

    res.status(200).json({ success: true, data: { comments: data, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } } });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a comment on an activity
// @route   POST /api/v1/activities/:id/comments
// @access  Private
const addActivityComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    const activity = await Activity.findById(id);
    if (!activity || !activity.isPublic) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    const comment = await ActivityComment.create({ activityId: id, userId: String(req.user.id), text: text.trim() });
    const [user] = await Promise.all([
      pgUserService.getUserById(req.user.id),
      Notification.createActivityCommentNotification(req.user.id, activity)
    ]);
    const populated = {
      ...comment.toObject(),
      userId: {
        _id: String(user.id),
        name: user.name,
        username: user.username,
        avatar: user.avatar_url
      }
    };

    // Mention detection in comment text (e.g., @username)
    try {
      const mentionMatches = (text.match(/@([a-zA-Z0-9._-]{3,20})/g) || []).map(m => m.slice(1).toLowerCase());
      if (mentionMatches.length > 0) {
        const User = require('../models/User');
        const users = await User.find({ username: { $in: mentionMatches } }).select('_id').lean();
        const mentionedIds = Array.from(new Set(users.map(u => String(u._id))));
        await Promise.all(mentionedIds
          .filter(uid => uid !== String(req.user.id) && uid !== String(activity.userId))
          .map(uid => Notification.createMentionNotification(req.user.id, uid, { activityId: id, commentId: comment._id }))
        );
      }
    } catch (_) {}
    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) {
    next(err);
  }
};

// @desc    Reply to a comment (single-level)
// @route   POST /api/v1/activities/:id/comments/:commentId/replies
// @access  Private
const replyToActivityComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const { text, mentionUserId } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }
    const [activity, parent] = await Promise.all([
      Activity.findById(id),
      ActivityComment.findById(commentId)
    ]);
    if (!activity || !activity.isPublic) return res.status(404).json({ success: false, message: 'Activity not found' });
    if (!parent || String(parent.activityId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }
    const reply = await ActivityComment.create({ activityId: id, userId: String(req.user.id), text: text.trim(), parentCommentId: commentId, mentionUserId: mentionUserId ? String(mentionUserId) : null });
    const user = await pgUserService.getUserById(req.user.id);
    const populated = {
      ...reply.toObject(),
      userId: {
        _id: String(user.id),
        name: user.name,
        username: user.username,
        avatar: user.avatar_url
      }
    };
    await Notification.createCommentReplyNotification(req.user.id, parent, activity);
    if (mentionUserId) {
      await Notification.createMentionNotification(req.user.id, mentionUserId, { activityId: id, commentId });
    }
    // Mention detection in reply text as well
    try {
      const mentionMatches = (text.match(/@([a-zA-Z0-9._-]{3,20})/g) || []).map(m => m.slice(1).toLowerCase());
      if (mentionMatches.length > 0) {
        const User = require('../models/User');
        const users = await User.find({ username: { $in: mentionMatches } }).select('_id').lean();
        const mentionedIds = Array.from(new Set(users.map(u => String(u._id))));
        await Promise.all(mentionedIds
          .filter(uid => uid !== String(req.user.id) && uid !== String(parent.userId))
          .map(uid => Notification.createMentionNotification(req.user.id, uid, { activityId: id, commentId: reply._id }))
        );
      }
    } catch (_) {}
    res.status(201).json({ success: true, data: { reply: populated } });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle like on a comment
// @route   PATCH /api/v1/activities/:id/comments/:commentId/like
// @access  Private
const toggleCommentLike = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const targetId = String(commentId);
    const comment = await ActivityComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const likeFlag = typeof req.body?.like === 'boolean' ? req.body.like : null;
    if (likeFlag === true) {
      await pgLikeService.like(req.user.id, 'activity_comment', targetId);
    } else if (likeFlag === false) {
      await pgLikeService.unlike(req.user.id, 'activity_comment', targetId);
    } else {
      // Toggle behaviour
      await pgLikeService.toggleLike({ userId: req.user.id, targetType: 'activity_comment', targetId });
    }

    const [likeCount, isLiked] = await Promise.all([
      pgLikeService.getLikeCount(targetId, 'activity_comment'),
      pgLikeService.hasUserLiked(req.user.id, 'activity_comment', targetId)
    ]);
    if (isLiked) {
      await Notification.createCommentLikeNotification(req.user.id, comment);
    }
    res.status(200).json({ success: true, data: { likeCount, isLiked } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecentActivities,
  getUserActivities,
  toggleActivityLike,
  getActivity,
  getTrendingActivities,
  getActivityStats,
  getActivityComments,
  addActivityComment,
  replyToActivityComment,
  toggleCommentLike
}; 