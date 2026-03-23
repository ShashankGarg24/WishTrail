const { logger } = require('./../config/observability');
const pgUserService = require('./pgUserService');
const pgFollowService = require('./pgFollowService');
const pgBlockService = require('./pgBlockService');
const pgGoalService = require('./pgGoalService');
const pgHabitService = require('./pgHabitService');
const { query: pgQuery } = require('../config/supabase');
const UserPreferences = require('../models/extended/UserPreferences');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

class UserService {
  /**
   * Get all users with pagination and search
   */
  async getUsers(params = {}) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      requestingUserId
    } = params;
    
    // Use PostgreSQL search if search term provided
    if (search && search.trim()) {
      const result = await pgUserService.searchUsers({
        query: search,
        page,
        limit,
        excludeIds: requestingUserId ? [requestingUserId] : []
      });
      
      // Add following status if requesting user is provided
      if (requestingUserId) {
        const userIds = result.users.map(u => u.id);
        const followingStatuses = await pgFollowService.getFollowingStatusBulk(requestingUserId, userIds);
        
        result.users = result.users.map(user => ({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          totalGoals: user.total_goals,
          completedGoals: user.completed_goals,
          currentStreak: user.current_streak,
          isFollowing: followingStatuses[user.id]?.isFollowing || false,
          isRequested: followingStatuses[user.id]?.isRequested || false
        }));
      } else {
        result.users = result.users.map(user => ({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          totalGoals: user.total_goals,
          completedGoals: user.completed_goals,
          currentStreak: user.current_streak
        }));
      }
      
      return result;
    }
    
    // Get top users without search
    const users = await pgUserService.getTopUsers(limit);
    const total = users.length;
    
    // Add following status if requesting user is provided
    let usersWithFollowingStatus = users;
    if (requestingUserId) {
      const userIds = users.map(u => u.id);
      const followingStatuses = await pgFollowService.getFollowingStatusBulk(requestingUserId, userIds);
      
      usersWithFollowingStatus = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        totalGoals: user.total_goals,
        completedGoals: user.completed_goals,
        currentStreak: user.current_streak,
        isFollowing: followingStatuses[user.id]?.isFollowing || false,
        isRequested: followingStatuses[user.id]?.isRequested || false
      }));
    } else {
      usersWithFollowingStatus = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        totalGoals: user.total_goals,
        completedGoals: user.completed_goals,
        currentStreak: user.current_streak
      }));
    }
    
    return {
      users: usersWithFollowingStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get user by ID
   */
  async getUserById(userId, requestingUserId = null) {
    const user = await pgUserService.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if there's a block relationship - only block if THEY blocked ME
    let isBlocked = false;
    let hasBlockedMe = false;
    if (requestingUserId && requestingUserId !== userId) {
      [isBlocked, hasBlockedMe] = await Promise.all([
        pgBlockService.isBlocking(requestingUserId, userId),
        pgBlockService.isBlocking(userId, requestingUserId)
      ]);
      
      // Only deny access if they blocked me (not if I blocked them)
      if (isBlocked || hasBlockedMe) {
        const error = new Error('User not found');
        error.statusCode = 403;
        throw error;
      }
    }
    
    // Check if requesting user is following this user
    let isFollowing = false;
    let isRequested = false;
    if (requestingUserId && requestingUserId !== userId) {
      const followStatus = await pgFollowService.getFollowingStatus(requestingUserId, userId);
      isFollowing = followStatus?.isFollowing || false;
      isRequested = followStatus?.isRequested || false;
    }
    
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      isPrivate: user.is_private,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
    // Fetch MongoDB extended fields (interests, currentMood, socialLinks)
    const prefs = await UserPreferences.findOne({ userId: user.id }).lean();
    if (prefs) {
      userResponse.interests = prefs.interests || [];
      userResponse.currentMood = prefs.preferences?.currentMood || '';
      userResponse.quote = prefs.preferences?.quote || '';
      userResponse.youtube = prefs.socialLinks?.youtube || '';
      userResponse.instagram = prefs.socialLinks?.instagram || '';
    }
    
    const userStats = await this.getUserStats(user);
    return { user: userResponse, stats: userStats, isFollowing, isRequested, isBlocked };
  }
  
  /**
   * Get user by ID or username
   */
  async getUserByUsername(username, requestingUserId = null) {
    const cleanUsername = username.replace(/^@/, '');    
    const user = await pgUserService.findByUsername(cleanUsername);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if there's a block relationship - only block if THEY blocked ME
    let isBlocked = false;
    let hasBlockedMe = false;
    if (requestingUserId && user.id !== requestingUserId) {
      [isBlocked, hasBlockedMe] = await Promise.all([
        pgBlockService.isBlocking(requestingUserId, user.id),
        pgBlockService.isBlocking(user.id, requestingUserId)
      ]);
      
      // Only deny access if they blocked me (not if I blocked them)
      if (isBlocked || hasBlockedMe) {
        const error = new Error('User not found');
        error.statusCode = 403;
        throw error;
      }
    }

    let isFollowing = false;
    let isRequested = false;
    if (requestingUserId && user.id !== requestingUserId) {
      const followStatus = await pgFollowService.getFollowingStatus(requestingUserId, user.id);
      isFollowing = followStatus?.isFollowing || false;
      isRequested = followStatus?.isRequested || false;
    }

    // Get user preferences for habits privacy setting and extended fields
    const prefs = await UserPreferences.findOne({ userId: user.id });

    // Return minimal user data
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar_url,
      bio: user.bio || '',
      isPrivate: user.is_private || false,
      showHabits: prefs?.privacy?.showHabits ?? false,
      interests: prefs?.interests || [],
      currentMood: prefs?.preferences?.currentMood || '',
      quote: prefs?.preferences?.quote || '',
      website: prefs?.socialLinks?.website || '',
      youtube: prefs?.socialLinks?.youtube || '',
      instagram: prefs?.socialLinks?.instagram || '',
      premiumExpiresAt: user.premium_expires_at || null
    };
    
    // Basic stats only
    const stats = {
      totalGoals: user.total_goals || 0,
      followers: user.followers_count || 0,
      followings: user.following_count || 0
    };
    
    return { user: userResponse, stats, isFollowing, isRequested, isBlocked };
  }
  
  /**
   * Get dashboard statistics for user
   */
  async getDashboardStats(userId, todayParam) {
    const user = await pgUserService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await pgUserService.updateLastActive(userId);

    // Use client-supplied local date (matches what the log stored) or fall back to UTC
    const todayUTC  = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : new Date().toISOString().split('T')[0];
    // Run all queries in parallel for a single round-trip budget
    const [
      todayGoalRows,
      habitStatsRow,
      todayLogsRow,
      active7DaysRows,
      done7DaysRows,
    ] = await Promise.all([

      // Goal completions made today (for the Goals tab)
      pgGoalService.getUserGoals({ userId, completed: true, page: 1, limit: 100 }),

      // Total active habits + best (longest) streak across all habits
      pgQuery(
        `SELECT
           COUNT(*) AS total_habits,
           COALESCE(MAX(longest_streak), 0) AS best_streak
         FROM habits
         WHERE user_id = $1`,
        [userId]
      ),

      // Habit logs recorded today with status = 'done'
      pgQuery(
        `SELECT COUNT(*) AS today_habit_logs
         FROM habit_logs
         WHERE user_id = $1 AND status = 'done' AND date_key = $2::date`,
        [userId, todayUTC]
      ),

      // Per-day active habit counts for last 7 days (considering each habit's creation date)
      pgQuery(
        `WITH days AS (
           SELECT generate_series($2::date - INTERVAL '6 days', $2::date, INTERVAL '1 day')::date AS date_key
         )
         SELECT
           days.date_key::text,
           COUNT(h.id) FILTER (
             WHERE h.id IS NOT NULL
               AND (
                 h.frequency = 'daily'
                 OR (
                   h.frequency IN ('weekly', 'custom')
                   AND h.days_of_week @> ARRAY[EXTRACT(DOW FROM days.date_key)::int]
                 )
               )
           ) AS active_count
         FROM days
         LEFT JOIN habits h
           ON h.user_id = $1
          AND h.created_at::date <= days.date_key
         GROUP BY days.date_key
         ORDER BY days.date_key`,
        [userId, todayUTC]
      ),

      // Per-day 'done' log counts for the last 7 days (today inclusive)
      pgQuery(
        `SELECT date_key::text, COUNT(*) AS done_count
         FROM habit_logs
         WHERE user_id = $1
           AND status   = 'done'
           AND date_key >= $2::date - INTERVAL '6 days'
           AND date_key <= $2::date
         GROUP BY date_key
         ORDER BY date_key`,
        [userId, todayUTC]
      ),
    ]);

    // ── Goal today-completions ────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCompletions = todayGoalRows.goals.filter(
      g => new Date(g.completed_at) >= todayStart
    ).length;

    // ── Habit scalar stats ────────────────────────────────────────────────────
    const hs           = habitStatsRow.rows[0];
    const totalHabits  = parseInt(hs.total_habits)   || 0;
    const bestStreak   = parseInt(hs.best_streak)    || 0;
    logger.info(todayLogsRow);
    const todayHabitLogs = parseInt(todayLogsRow.rows[0].today_habit_logs) || 0;
    const activeMap = {};
    for (const row of active7DaysRows.rows) {
      activeMap[row.date_key] = parseInt(row.active_count) || 0;
    }
    const activeToday  = activeMap[todayUTC] || 0;

    // ── 7-day weighted momentum ───────────────────────────────────────────────
    // Weight: today = 7, yesterday = 6, … 6 days ago = 1  (more recent = heavier)
    // Daily performance = min(done / activeToday, 1) * 100  (capped at 100 %)
    const logsMap = {};
    for (const row of done7DaysRows.rows) {
      logsMap[row.date_key] = parseInt(row.done_count) || 0;
    }

    let weightedSum  = 0;
    let totalWeight  = 0;
    const momentumBaseDate = new Date(`${todayUTC}T12:00:00Z`);
    for (let i = 0; i < 7; i++) {
      const d = new Date(momentumBaseDate);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey    = d.toISOString().split('T')[0];
      const weight     = 7 - i;                          // today=7 … 6 days ago=1
      const done       = logsMap[dateKey] || 0;
      const activeOnDay = activeMap[dateKey] || 0;
      const perf       = activeOnDay > 0
        ? Math.min(100, Math.round((done / activeOnDay) * 100))
        : 0;
      weightedSum  += perf * weight;
      totalWeight  += weight;
    }
    const weekMomentum = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    return {
      // Goals
      totalGoals:     user.total_goals     || 0,
      completedGoals: user.completed_goals || 0,
      todayCompletions,
      currentStreak:  user.current_streak  || 0,
      longestStreak:  user.longest_streak  || 0,
      // Habits
      totalHabits,
      bestStreak,
      todayHabitLogs,
      activeToday,
      weekMomentum,
    };
  }
  
  async getUserStats(user) {
    const stats = {
      totalGoals: user.total_goals || 0,
      completedGoals: user.completed_goals || 0,
      activeGoals: (user.total_goals || 0) - (user.completed_goals || 0),
      followers: user.followers_count || 0,
      followings: user.following_count || 0
    };

    return stats;
  }

  /**
   * Get user's profile summary
   */
  async getProfileSummary(userId) {
    const user = await pgUserService.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get recent goals from PostgreSQL
    const recentGoalsResult = await pgGoalService.getUserGoals({
      userId,
      page: 1,
      limit: 3,
      sort: 'newest'
    });
    
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      totalGoals: user.total_goals,
      completedGoals: user.completed_goals,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      followerCount: user.followers_count,
      followingCount: user.following_count,
      isPrivate: user.is_private,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      recentGoals: recentGoalsResult.goals.map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        completed: g.completed,
        createdAt: g.created_at
      }))
    };
    
    // Fetch MongoDB extended fields (interests, currentMood, socialLinks)
    const prefs = await UserPreferences.findOne({ userId: user.id }).lean();
    if (prefs) {
      userResponse.interests = prefs.interests || [];
      userResponse.currentMood = prefs.preferences?.currentMood || '';
      userResponse.quote = prefs.preferences?.quote || '';
      userResponse.youtube = prefs.socialLinks?.youtube || '';
      userResponse.instagram = prefs.socialLinks?.instagram || '';
    }
    
    return userResponse;
  }

  /**
   * List popular interests with counts
   */
  async listPopularInterests(limit = 50) {
    const pipeline = [
      { $match: { interests: { $exists: true, $ne: [] } } },
      { $unwind: '$interests' },
      { $group: { _id: '$interests', count: { $sum: 1 } } },
      // Ensure interests align with Goal categories ordering buckets
      { $sort: { count: -1, _id: 1 } },
      { $limit: parseInt(limit) },
      { $project: { _id: 0, interest: '$_id' } }
    ];
    const results = await UserPreferences.aggregate(pipeline);
    return results;
  }
  
  /**
   * Get suggested users for a user
   */
  async getSuggestedUsers(userId, params = {}) {
    const { limit = 10, category } = params;
    
    // Get users current user is following
    const following = await pgFollowService.getFollowing(userId);
    const followingIds = following.map(f => f.following_id);
    followingIds.push(userId); // Exclude current user
    
    // Get top users excluding those already followed
    const allUsers = await pgUserService.getTopUsers(limit * 3); // Get more to filter
    
    let suggestedUsers = allUsers.filter(user => !followingIds.includes(user.id));
    
    // Filter by category if specified
    if (category) {
      const usersWithCategoryGoals = await Promise.all(
        suggestedUsers.map(async (user) => {
          const goals = await pgGoalService.getUserGoals({
            userId: user.id,
            category,
            completed: true,
            limit: 1,
            requestingUserId: userId // Filter private goals
          });
          return goals.goals.length > 0 ? user : null;
        })
      );
      suggestedUsers = usersWithCategoryGoals.filter(u => u !== null);
    }
    
    // Sort by suggestion score
    suggestedUsers = suggestedUsers
      .map(user => ({
        ...user,
        suggestionScore: (user.followers_count * 5) + (user.completed_goals * 2)
      }))
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, limit)
      .map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        completedGoals: user.completed_goals,
        followerCount: user.followers_count
      }));
    
    return suggestedUsers;
  }
  
  /**
   * Search users
   */
  async searchUsers(searchTerm, params = {}) {
    const { limit = 20, page = 1, requestingUserId, interest } = params;

    // Get blocked user IDs (both directions: users I blocked + users who blocked me)
    let blockedUserIds = [];
    if (requestingUserId) {
      const blockedOut = await pgBlockService.getBlockedUserIds(requestingUserId);
      const blockedIn = await pgBlockService.getBlockerUserIds(requestingUserId);
      blockedUserIds = [...blockedOut, ...blockedIn];
    }

    const excludeIds = [...blockedUserIds];
    if (requestingUserId) {
      excludeIds.push(requestingUserId);
    }
    
    // Filter by interest using UserPreferences if specified
    let userIdsWithInterest = null;
    if (interest && String(interest).trim()) {
      const interestToSearch = String(interest).trim();
      
      // Case-insensitive search using regex
      const prefs = await UserPreferences.find({
        interests: { $regex: new RegExp(`^${interestToSearch}$`, 'i') }
      }).select('userId interests').lean();
      
      userIdsWithInterest = prefs.map(p => p.userId);
      
      if (userIdsWithInterest.length === 0) {
        return {
          users: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
        };
      }
    }

    let users = [];
    
    // If interest is specified, fetch users by interest IDs
    if (userIdsWithInterest) {
      // Filter out excluded IDs from the interest-based user list
      const filteredUserIds = userIdsWithInterest.filter(id => !excludeIds.includes(id));
      
      if (filteredUserIds.length === 0) {
        return {
          users: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
        };
      }
      
      // Fetch users by IDs with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const paginatedUserIds = filteredUserIds.slice(offset, offset + parseInt(limit));
      
      // If there's also a search term, filter by name/username match
      if (searchTerm && String(searchTerm).trim()) {
        const searchLower = String(searchTerm).trim().toLowerCase();
        const allUsers = await pgUserService.getUsersByIds(paginatedUserIds);
        users = allUsers.filter(u => 
          u.name.toLowerCase().includes(searchLower) || 
          u.username.toLowerCase().includes(searchLower)
        );
      } else {
        users = await pgUserService.getUsersByIds(paginatedUserIds);
      }
    } else {
      // No interest filter, do regular search
      const result = await pgUserService.searchUsers({
        query: searchTerm,
        page,
        limit,
        excludeIds
      });
      users = result.users;
    }

    // Enrich with following status and block status
    let enrichedUsers = users;
    
    // Double-check: Filter out any blocked users that might have slipped through
    if (requestingUserId && excludeIds.length > 0) {
      const beforeFilter = users.length;
      users = users.filter(u => !excludeIds.includes(u.id));
    }
    
    if (requestingUserId && users.length > 0) {
      const userIds = users.map(u => u.id);
      const followingStatuses = await pgFollowService.getFollowingStatusBulk(requestingUserId, userIds);
      
      enrichedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar_url || user.avatar,
        bio: user.bio,
        completedGoals: user.completed_goals,
        currentStreak: user.current_streak,
        totalGoals: user.total_goals,
        isPrivate: user.is_private,
        isFollowing: followingStatuses[user.id]?.isFollowing || false,
        isRequested: followingStatuses[user.id]?.isRequested || false,
        isBlocked: false // Blocked users are already filtered out
      }));
    } else {
      enrichedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar_url || user.avatar,
        bio: user.bio,
        completedGoals: user.completed_goals,
        currentStreak: user.current_streak,
        totalGoals: user.total_goals,
        isPrivate: user.is_private,
        isBlocked: false // Blocked users are already filtered out
      }));
      logger.info('✨ Enriched users (no auth):', enrichedUsers.length);
    }
    
    logger.info('📦 Returning:', enrichedUsers.length, 'users');
    return {
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: enrichedUsers.length,
        pages: Math.ceil(enrichedUsers.length / parseInt(limit || 1))
      }
    };
  }
  
  /**
   * Get user's activities
   */
  async getUserActivities(userId, requestingUserId, params = {}) {
    const { page = 1, limit = 10 } = params;
    
    const user = await pgUserService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user can view activities (either own activities or following the user)
    let canViewActivities = userId === requestingUserId;
    if (!canViewActivities) {
      const followStatus = await pgFollowService.getFollowingStatus(requestingUserId, userId);
      canViewActivities = followStatus?.isFollowing || false;
    }
    
    if (!canViewActivities) {
      throw new Error('Access denied');
    }
    
    // Activities are still in MongoDB - fetch with lean()
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Activity.countDocuments({ userId });
    
    // Enrich activities with PostgreSQL data and achievements
    const goalIds = [...new Set(activities.map(a => a.data?.goalId).filter(Boolean))];
    const userIds = [...new Set(activities.map(a => a.data?.targetUserId).filter(Boolean))];
    const achievementIds = [...new Set(activities.map(a => a.data?.achievementId).filter(Boolean))];
    
    const Achievement = require('../models/Achievement');
    const [goals, users, achievements] = await Promise.all([
      goalIds.length > 0 ? pgGoalService.getGoalsByIds(goalIds) : Promise.resolve([]),
      userIds.length > 0 ? pgUserService.getUsersByIds(userIds) : Promise.resolve([]),
      achievementIds.length > 0 ? Achievement.find({ _id: { $in: achievementIds } }).select('name description icon').lean() : Promise.resolve([])
    ]);
    
    const goalMap = new Map(goals.map(g => [g.id, g]));
    const userMap = new Map(users.map(u => [u.id, u]));
    const achievementMap = new Map(achievements.map(a => [a._id.toString(), a]));
    
    const enrichedActivities = activities.map(activity => {
      const enriched = { ...activity };
      if (activity.data?.goalId) {
        const goal = goalMap.get(activity.data.goalId);
        if (goal) {
          // Create nested goal object for backward compatibility
          enriched.data = {
            ...enriched.data,
            goal: {
              id: goal.id,
              title: goal.title,
              category: goal.category,
              completed: goal.completed,
              completed_at: goal.completed_at
            },
            // Also keep flat fields for compatibility
            goalTitle: goal.title,
            goalCategory: goal.category
          };
        }
      }
      if (activity.data?.targetUserId) {
        const targetUser = userMap.get(activity.data.targetUserId);
        if (targetUser) {
          // Create nested user object for backward compatibility
          enriched.data = {
            ...enriched.data,
            targetUser: {
              id: targetUser.id,
              name: targetUser.name,
              username: targetUser.username,
              avatar_url: targetUser.avatar_url
            },
            // Also keep flat fields for compatibility
            targetUserName: targetUser.name
          };
        }
      }
      if (activity.data?.achievementId) {
        const achievement = achievementMap.get(activity.data.achievementId.toString());
        if (achievement) {
          // Create nested achievement object for backward compatibility
          enriched.data = {
            ...enriched.data,
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
      return enriched;
    });
    
    return {
      activities: enrichedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  

  /**
   * Update user streak
   */
  async updateUserStreak(userId) {
    const user = await pgUserService.findById(userId);
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if user completed any goals today using PostgreSQL
    const todayGoalsResult = await pgGoalService.getUserGoals({
      userId,
      completed: true,
      page: 1,
      limit: 100
    });
    
    const todayGoals = todayGoalsResult.goals.filter(g => {
      const completedDate = new Date(g.completed_at);
      return completedDate >= today;
    }).length;
    
    if (todayGoals > 0) {
      // Check if user completed goals yesterday
      const yesterdayGoals = todayGoalsResult.goals.filter(g => {
        const completedDate = new Date(g.completed_at);
        return completedDate >= yesterday && completedDate < today;
      }).length;
      
      let newStreak = user.current_streak || 0;
      
      if (yesterdayGoals > 0 || newStreak === 0) {
        // Continue or start streak
        newStreak = newStreak + 1;
      } else {
        // Streak broken, restart
        newStreak = 1;
      }
      
      // Update longest streak
      const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);
      
      await pgUserService.updateStats(userId, {
        current_streak: newStreak,
        longest_streak: newLongestStreak
      });
      
      // Create streak milestone activity (MongoDB)
      if (newStreak % 7 === 0) { // Weekly milestones
        await Activity.createActivity(
          userId,
          user.name,
          user.username,
          user.avatar,
          'streak_milestone',
          {
            streakCount: newStreak
          }
        );
      }
    }
  }
}

module.exports = new UserService(); 