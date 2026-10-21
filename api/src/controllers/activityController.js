const { hydrateActivityAuthors } = require('../services/activityAuthors');
const { goalAccessPolicy } = require('../services/goalAccessPolicy');
const { logger } = require('./../config/observability');
const Activity = require('../models/Activity');
const cacheService = require('../services/cacheService');
const ActivityComment = require('../models/ActivityComment');
const Notification = require('../models/Notification');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const { query } = require('../config/supabase');

// PostgreSQL Services
const pgLikeService = require('../services/pgLikeService');
const pgFollowService = require('../services/pgFollowService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');

/**
 * Enrich activities with goal and user data from PostgreSQL
 */
async function enrichActivities(activities) {
  const activityArray = await hydrateActivityAuthors(Array.isArray(activities) ? activities : [activities]);
  
  // Collect unique goal, user, and achievement IDs
  const goalIds = new Set();
  const userIds = new Set();
  const achievementIds = new Set();
  
  activityArray.forEach(activity => {
    if (activity.type !== 'goal_shared' && activity.data?.goalId) goalIds.add(activity.data.goalId);
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
  const goalMap = new Map(goals.map(g => [String(g.id), g]));
  const details = goalIds.size ? await require('../models/extended/GoalDetails').find({ goalId: { $in: [...goalIds] } }).select('goalId description').lean() : [];
  const detailsMap = new Map(details.map(detail => [String(detail.goalId), detail]));
  const userMap = new Map(users.map(u => [u.id, u]));
  const achievementMap = new Map(achievements.map(a => [a._id.toString(), a]));
  // Enrich activities
  const enriched = activityArray.map(activity => {
    const enrichedActivity = { ...activity };
    if (activity.type === 'goal_shared') return enrichedActivity;
    
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
          isPremium: user.is_premium || false,
          userIsPrivate: !!user.is_private
        };
      }
    }
    if (activity.type !== 'goal_shared' && activity.data?.goalId) {
      const goal = goalMap.get(String(activity.data.goalId));

      if (goal) {
        // Create nested goal object for backward compatibility
        enrichedActivity.data = {
          ...enrichedActivity.data,
          goal: {
            id: goal.id,
            title: goal.title,
            category: goal.category,
            completed: goal.completed,
            completed_at: goal.completed_at,
            is_public: goal.is_public
          },
          // Also keep flat fields for compatibility
          goalTitle: goal.title,
          goalDescription: detailsMap.get(String(activity.data.goalId))?.description || '',
          goalCategory: goal.category,
          isCompleted: goal.completed,
          completedAt: goal.completed_at,
          goalIsPublic: goalAccessPolicy(goal, null).canViewGoal
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
    const { page = 1, limit = 10, type = 'global', scope, year } = req.query;
    const includeRecentUsers = req.query.includeRecentUsers === true || req.query.includeRecentUsers === 'true' || req.query.includeRecentUsers === '1';
    const recentUsersDays = Math.max(1, parseInt(req.query.recentUsersDays) || 7);
    const recentUsersLimit = Math.max(1, Math.min(50, parseInt(req.query.recentUsersLimit) || 10));
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const cacheParams = { page: parsedPage, limit: parsedLimit, type, scope, includeRecentUsers, recentUsersDays, recentUsersLimit };

    let activities;
    let fromCache = false;

    if (type === 'personal') {
      activities = ['overview', 'trail'].includes(scope) ? null : await cacheService.getPersonalActivities(req.user.id, cacheParams);
    } else {
      activities = await cacheService.getGlobalActivities(cacheParams);
    }

    if (activities) {
      fromCache = true;
    } else {
      // Fetch from database
      if (type === 'personal') {
        if (scope === 'overview') {
          const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
          const overviewFilter = {
            userId: Number(req.user.id),
            type: { $in: ['goal_activity', 'goal_completed'] },
            $or: [
              { createdAt: { $gte: sevenDaysAgo } },
              { type: 'goal_activity', updatedAt: { $gte: sevenDaysAgo } }
            ]
          };
          const [activityList, relationalEvents, dailyLogEntries] = await Promise.all([
            Activity.find(overviewFilter).sort({ updatedAt: -1 }).limit(50).lean(),
            query(
              `SELECT 'goal_created' AS event_type, g.id AS item_id, g.title AS item_name, g.created_at AS event_at, NULL::text AS status
               FROM goals g WHERE g.user_id = $1 AND g.created_at >= $2
               UNION ALL
               SELECT 'habit_created', h.id, h.name, h.created_at, NULL::text
               FROM habits h WHERE h.user_id = $1 AND h.created_at >= $2
               UNION ALL
               SELECT 'habit_logged', hl.id, h.name, hl.occurred_at, hl.status
               FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
               WHERE hl.user_id = $1 AND hl.occurred_at >= $2`,
              [req.user.id, sevenDaysAgo]
            ),
            DailyLogsEntry.find({ userId: Number(req.user.id), createdAt: { $gte: sevenDaysAgo } })
              .sort({ createdAt: -1 }).limit(50).lean()
          ]);
          const enrichedActivities = await enrichActivities(activityList);
          const storedEvents = enrichedActivities
            .filter(activity => !(activity.type === 'goal_activity' && activity.data?.lastUpdateType === 'created'))
            .map(activity => ({
              ...activity,
              activityAt: activity.type === 'goal_activity' ? activity.updatedAt : activity.createdAt
            }));
          const postgresEvents = relationalEvents.rows.map(event => ({
            _id: `${event.event_type}_${event.item_id}_${new Date(event.event_at).getTime()}`,
            type: event.event_type,
            userId: Number(req.user.id),
            data: event.event_type.startsWith('habit_')
              ? { habitName: event.item_name, habitStatus: event.status }
              : { goalTitle: event.item_name },
            createdAt: event.event_at,
            activityAt: event.event_at
          }));
          const dailyLogEvents = dailyLogEntries.map(entry => ({
            _id: `daily_log_created_${entry._id}`,
            type: 'daily_log_created',
            userId: Number(req.user.id),
            data: { dailyLogId: String(entry._id) },
            createdAt: entry.createdAt,
            activityAt: entry.createdAt
          }));
          const combinedEvents = [...storedEvents, ...postgresEvents, ...dailyLogEvents]
            .sort((a, b) => new Date(b.activityAt) - new Date(a.activityAt));
          const pageStart = (parsedPage - 1) * parsedLimit;
          activities = {
            activities: combinedEvents.slice(pageStart, pageStart + parsedLimit),
            pagination: {
              page: parsedPage,
              limit: parsedLimit,
              total: combinedEvents.length,
              pages: Math.ceil(combinedEvents.length / parsedLimit)
            }
          };
        } else if (scope === 'trail') {
          const [relationalEvents, dailyLogEntries] = await Promise.all([
            query(
              `SELECT 'goal_created' AS event_type, g.id AS item_id, g.title AS item_name,
                      g.category, g.created_at AS event_at, NULL::text AS status, NULL::integer AS event_count,
                      NULL::text AS detail, NULL::text AS emotion
                 FROM goals g WHERE g.user_id = $1
               UNION ALL
               SELECT 'goal_completed', g.id, g.title, g.category, g.completed_at, 'done', NULL::integer, NULL::text, NULL::text
                 FROM goals g WHERE g.user_id = $1 AND g.completed_at IS NOT NULL
               UNION ALL
               SELECT 'goal_logged', g.id, g.title, g.category, gu.created_at, NULL::text, NULL::integer, gu.text, gu.emotion
                 FROM goal_updates gu JOIN goals g ON g.id = gu.goal_id
                WHERE gu.user_id = $1
               UNION ALL
               SELECT 'habit_created', h.id, h.name, h.category, h.created_at, NULL::text, NULL::integer, NULL::text, NULL::text
                 FROM habits h WHERE h.user_id = $1
               UNION ALL
               SELECT 'habit_logged', h.id, h.name, h.category, hl.created_at, hl.status, hl.completion_count, NULL::text, NULL::text
                 FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
                WHERE hl.user_id = $1
               ORDER BY event_at DESC
               LIMIT 1000`,
              [req.user.id]
            ),
            DailyLogsEntry.find({ userId: Number(req.user.id) })
              .select('_id mood dayKey createdAt').sort({ createdAt: -1 }).limit(1000).lean()
          ]);
          const postgresEvents = relationalEvents.rows.map(event => ({
            _id: `${event.event_type}_${event.item_id}_${new Date(event.event_at).getTime()}`,
            type: event.event_type,
            userId: Number(req.user.id),
            data: {
              itemId: Number(event.item_id),
              itemName: event.item_name,
              category: event.category,
              status: event.status,
              count: event.event_count == null ? null : Number(event.event_count),
              detail: event.detail,
              emotion: event.emotion
            },
            createdAt: event.event_at,
            activityAt: event.event_at
          }));
          const journalEvents = dailyLogEntries.map(entry => ({
            _id: `journal_logged_${entry._id}`,
            type: 'journal_logged',
            userId: Number(req.user.id),
            data: { itemId: String(entry._id), mood: entry.mood, dayKey: entry.dayKey },
            createdAt: entry.createdAt,
            activityAt: entry.createdAt
          }));
          const combinedEvents = [...postgresEvents, ...journalEvents]
            .filter(event => event.activityAt)
            .sort((a, b) => new Date(b.activityAt) - new Date(a.activityAt));
          const availableYears = [...new Set(combinedEvents.map(event => new Date(event.activityAt).getFullYear()))].sort((a, b) => b - a);
          const requestedYear = Number.parseInt(year, 10);
          const filteredEvents = Number.isFinite(requestedYear)
            ? combinedEvents.filter(event => new Date(event.activityAt).getFullYear() === requestedYear)
            : combinedEvents;
          const pageStart = (parsedPage - 1) * parsedLimit;
          activities = {
            activities: filteredEvents.slice(pageStart, pageStart + parsedLimit),
            years: availableYears,
            pagination: { page: parsedPage, limit: parsedLimit, total: filteredEvents.length, pages: Math.ceil(filteredEvents.length / parsedLimit) }
          };
        } else {
        // Get activities from users the current user follows
        const followingIds = await pgFollowService.getFollowingIds(req.user.id);
        const currentUserId = Number(req.user.id);
        const followedUserIds = [...new Set(followingIds.map(Number))].filter(id => Number.isFinite(id) && id !== currentUserId);
        // A personal home feed contains the user's own activity (including
        // private goals) and only public activity from followed users.
        const personalFilter = {
          isActive: true,
          $or: [
            { userId: currentUserId },
            { userId: { $in: followedUserIds }, isPublic: true }
          ]
        };

        const totalActivities = await Activity.countDocuments(personalFilter);

        const activityList = await Activity.find(personalFilter)
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
        }
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

      logger.info(`Fetched ${activityList.length} activities from DB for global feed (total: ${totalActivities})`);
      // Enrich with PostgreSQL data
      const enrichedActivities = await enrichActivities(activityList);

      // Add synthetic "user joined" activities for today (not persisted in MongoDB)
      let joinedActivities = [];
      let joinedCount = 0;
      if (parsedPage === 1) {
        const joinedUsers = includeRecentUsers
          ? await pgUserService.getUsersJoinedInLastDays(recentUsersDays, recentUsersLimit)
          : await pgUserService.getUsersJoinedToday(Math.max(parsedLimit * 2, 20));

        joinedCount = joinedUsers.length;
        joinedActivities = joinedUsers.map((user) => ({
          _id: `user_joined_${user.id}_${new Date(user.created_at).getTime()}`,
          type: 'user_joined',
          userId: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar_url,
          data: {
            joinedAt: user.created_at
          },
          createdAt: user.created_at,
          isPublic: true
        }));
      }

      const filteredPublicActivities = enrichedActivities.filter((activity) => {
        // Exclude activities from private profiles
        if (activity?.data?.userIsPrivate) return false;

        // Exclude goal-related activities for non-public goals
        if (activity?.data?.goalId) {
          return activity?.data?.goalIsPublic === true;
        }

        return true;
      });

      const combinedActivities = [...filteredPublicActivities, ...joinedActivities]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, parsedLimit);

        activities = {
          activities: combinedActivities,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: totalActivities + (parsedPage === 1 ? joinedCount : 0),
            pages: Math.ceil((totalActivities + (parsedPage === 1 ? joinedCount : 0)) / parsedLimit)
          }
        };

        // Cache the result
        await cacheService.setGlobalActivities(activities, cacheParams);
      }
    }

    res.status(200).json({
      success: true,
      data: { ...activities, activities: await hydrateActivityAuthors(activities.activities || []) },
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
    const canViewActivities = Number(userId) === Number(req.user.id) || await pgFollowService.isFollowing(req.user.id, userId);
    
    if (!canViewActivities) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const activities = await Activity.getUserActivities(userId, {
      includePrivateShares: Number(userId) === Number(req.user.id),
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
      if (likeFlag === true) {
        await pgLikeService.likeTarget({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
      } else if (likeFlag === false) {
        await pgLikeService.unlikeTarget({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
      } else {
        // Toggle behaviour
        await pgLikeService.toggleLike({ userId: req.user.id, targetType: 'activity', targetId: String(id) });
      }

      const [likeCount, isLiked] = await Promise.all([
        pgLikeService.getLikeCount(String(id), 'activity'),
        pgLikeService.hasUserLiked(req.user.id, 'activity', String(id))
      ]);
      
      await require('../services/socialNotificationLifecycle').safely(() =>
        Notification.createActivityLikeNotification(req.user.id, activity));

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
      { $project: { type: 1, data: 1, createdAt: 1, likeCount: 1, userId: 1 } }
    ]);
    
    const total = await Activity.countDocuments({
      isPublic: true,
      isActive: true,
      createdAt: { $gte: startDate }
    });
    
    res.status(200).json({
      success: true,
      data: {
        activities: await hydrateActivityAuthors(activities),
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
      pgUserService.getUserById(req.user.id)
      // Don't await notification creation - do it async/non-blocking
    ]);
    
    // Send comment notification asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await Notification.createActivityCommentNotification(req.user.id, activity, comment);
      } catch (err) {
        logger.error('[addActivityComment] Error creating comment notification:', err?.message);
      }
    });
    
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
        
        // Send mention notifications asynchronously (non-blocking)
        setImmediate(async () => {
          try {
            await Promise.all(mentionedIds
              .filter(uid => uid !== String(req.user.id) && uid !== String(activity.userId))
              .map(uid => Notification.createMentionNotification(req.user.id, uid, { activityId: id, commentId: comment._id }))
            );
          } catch (err) {
            logger.error('[addActivityComment] Error creating mention notifications:', err?.message);
          }
        });
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
    
    // Send reply and mention notifications asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await Notification.createCommentReplyNotification(req.user.id, parent, activity, reply);
      } catch (err) {
        logger.error('[replyToActivityComment] Error creating reply notification:', err?.message);
      }
      
      if (mentionUserId) {
        try {
          await Notification.createMentionNotification(req.user.id, mentionUserId, { activityId: id, commentId: reply._id });
        } catch (err) {
          logger.error('[replyToActivityComment] Error creating mention notification:', err?.message);
        }
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
    });
    
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
    
    await require('../services/socialNotificationLifecycle').safely(() =>
      Notification.createCommentLikeNotification(req.user.id, comment));

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
