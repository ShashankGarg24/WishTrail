const Activity = require('../models/Activity');
const cacheService = require('../services/cacheService');
const ActivityComment = require('../models/ActivityComment');
const Notification = require('../models/Notification');

// PostgreSQL Services
const pgLikeService = require('../services/pgLikeService');
const pgFollowService = require('../services/pgFollowService');

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
        .populate('userId', 'name avatar')
        .populate('data.goalId', 'title category')
        .populate('data.targetUserId', 'name avatar')
        .lean();

        activities = {
          activities: activityList,
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
        isActive: true,
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
          .populate('userId', 'name avatar username')
          .populate('data.goalId', 'title category')
          .populate('data.targetUserId', 'name avatar')
          .lean()
      ]);

        activities = {
          activities: activityList,
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
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      const likeFlag = typeof req.body?.like === 'boolean' ? req.body.like : null;
      try {
        if (likeFlag === true) {
          await pgLikeService.like(req.user.id, 'activity', String(activity._id));
        } else if (likeFlag === false) {
          await pgLikeService.unlike(req.user.id, 'activity', String(activity._id));
        } else {
          // Toggle behaviour
          await pgLikeService.toggleLike(req.user.id, 'activity', String(activity._id));
        }
      } catch (_) {}

      const [likeCount, isLiked] = await Promise.all([
        pgLikeService.getLikeCount('activity', String(activity._id)),
        pgLikeService.hasUserLiked(req.user.id, 'activity', String(activity._id))
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
    
    const activity = await Activity.findById(id)
      .populate('userId', 'name avatar');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Check if user can view this activity
    const canView = activity.isPublic || 
      activity.userId._id.toString() === req.user.id.toString() ||
      await pgFollowService.isFollowing(req.user.id, activity.userId._id);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const [likeCount, isLiked, commentCount] = await Promise.all([
      pgLikeService.getLikeCount('activity', id),
      pgLikeService.hasUserLiked(req.user.id, 'activity', id),
      ActivityComment.countDocuments({ activityId: id, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: { activity: { ...activity.toObject(), likeCount, isLiked, commentCount } }
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
      ActivityComment.find({ activityId: id, parentCommentId: null, isActive: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name avatar username')
        .lean(),
      ActivityComment.countDocuments({ activityId: id, parentCommentId: null, isActive: true })
    ]);

    const rootIds = roots.map(r => r._id);
    const replies = await ActivityComment.find({ parentCommentId: { $in: rootIds }, isActive: true })
      .sort({ createdAt: 1 })
      .populate('userId', 'name avatar username')
      .lean();

    // Enrich with like counts and isLiked
    const allComments = [...roots, ...replies];
    const enrichedMap = new Map();
    await Promise.all(allComments.map(async (c) => {
      const [likeCount, isLiked] = await Promise.all([
        pgLikeService.getLikeCount('activity_comment', String(c._id)),
        pgLikeService.hasUserLiked(req.user.id, 'activity_comment', String(c._id))
      ]);
      enrichedMap.set(String(c._id), { likeCount, isLiked });
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
    const comment = await ActivityComment.create({ activityId: id, userId: req.user.id, text: text.trim() });
    const [populated] = await Promise.all([
      ActivityComment.findById(comment._id).populate('userId', 'name avatar username').lean(),
      Notification.createActivityCommentNotification(req.user.id, activity)
    ]);

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
    if (!parent || !parent.isActive || String(parent.activityId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }
    const reply = await ActivityComment.create({ activityId: id, userId: req.user.id, text: text.trim(), parentCommentId: commentId, mentionUserId: mentionUserId || null });
    const populated = await ActivityComment.findById(reply._id).populate('userId', 'name avatar username').lean();
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
    const comment = await ActivityComment.findById(commentId);
    if (!comment || !comment.isActive) return res.status(404).json({ success: false, message: 'Comment not found' });

    const likeFlag = typeof req.body?.like === 'boolean' ? req.body.like : null;
    try {
      if (likeFlag === true) {
        await pgLikeService.like(req.user.id, 'activity_comment', commentId);
      } else if (likeFlag === false) {
        await pgLikeService.unlike(req.user.id, 'activity_comment', commentId);
      } else {
        // Toggle behaviour
        await pgLikeService.toggleLike(req.user.id, 'activity_comment', commentId);
      }
    } catch (_) {}

    const [likeCount, isLiked] = await Promise.all([
      pgLikeService.getLikeCount('activity_comment', commentId),
      pgLikeService.hasUserLiked(req.user.id, 'activity_comment', commentId)
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