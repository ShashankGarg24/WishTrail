const User = require('../models/User');
const Goal = require('../models/Goal');
const cacheService = require('../services/cacheService');
const Follow = require('../models/Follow');

// @desc    Get global leaderboard
// @route   GET /api/v1/leaderboard
// @access  Public
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { type = 'points', page = 1, limit = 50, timeframe = 'all', category } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    // Create cache parameters (exclude user-specific data)
    const cacheParams = {
      type,
      page: parsedPage,
      limit: parsedLimit,
      timeframe,
      category: category || null
    };

    // Try to get from cache first
    let cachedData = await cacheService.getGlobalLeaderboard(cacheParams);
    let fromCache = false;

    if (cachedData) {
      // We have cached data, but we may need to add user-specific following and then strip fields
      let leaderboard = cachedData.leaderboard;
      if (req.user) {
        leaderboard = await Promise.all(
          leaderboard.map(async (user) => {
            const isFollowing = await Follow.isFollowing(req.user.id, user._id);
            return {
              ...user,
              isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
            };
          })
        );
      }
      // Ensure username exists even for legacy cached entries
      try {
        const missing = (leaderboard || []).filter(u => !u.username && u?._id).map(u => u._id);
        if (missing.length > 0) {
          const users = await User.find({ _id: { $in: missing } }).select('username');
          const idToUsername = new Map(users.map(u => [u._id.toString(), u.username]));
          leaderboard = leaderboard.map(u => ({
            ...u,
            username: u.username || idToUsername.get(u?._id?.toString()) || null
          }));
        }
      } catch {}
      fromCache = true;
      // Map to minimal field set
      const minimal = leaderboard.map(u => ({
        avatar: u.avatar,
        completedGoals: u.completedGoals,
        totalGoals: u.totalGoals,
        currentStreak: u.currentStreak,
        isFollowing: u.isFollowing,
        name: u.name,
        rank: u.rank,
        totalPoints: u.totalPoints,
        username: u.username
      }));
      return res.status(200).json({
        success: true,
        data: { leaderboard: minimal },
        fromCache
      });
    }

    // Cache miss - fetch from database
    const sortFields = {
      points: 'totalPoints',
      goals: 'completedGoals',
      streak: 'currentStreak',
      level: 'level'
    };

    let sortField = sortFields[type] || 'totalPoints';
    let sortOrder = -1;

    const matchStage = {
      isActive: true,
      totalPoints: { $gt: 0 }
    };

    const pipeline = [{ $match: matchStage }];

    const now = new Date();
    let startDate = null;

    // Handle category and/or timeframe filters
    if (category || (timeframe !== 'all' && ['points', 'goals'].includes(type))) {
      // Determine timeframe filter
      if (timeframe !== 'all') {
        switch (timeframe) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
      }

      // Build goals lookup with filters
      const goalsMatch = {
        $expr: { $eq: ['$userId', '$$userId'] },
        completed: true
      };
      
      if (startDate) {
        goalsMatch.completedAt = { $gte: startDate };
      }
      
      if (category) {
        goalsMatch.category = category;
      }

      pipeline.push(
        {
          $lookup: {
            from: 'goals',
            let: { userId: '$_id' },
            pipeline: [
              { $match: goalsMatch }
            ],
            as: 'filteredGoals'
          }
        },
        {
          $addFields: {
            recentPoints: { $sum: '$filteredGoals.pointsEarned' },
            recentGoalsCount: { $size: '$filteredGoals' }
          }
        }
      );

      // Only show users who have goals matching the filters
      if (category || timeframe !== 'all') {
        pipeline.push({
          $match: {
            recentGoalsCount: { $gt: 0 }
          }
        });
      }

      sortField = type === 'points' ? 'recentPoints' : 'recentGoalsCount';
    }

    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      { $skip: (parsedPage - 1) * parsedLimit },
      { $limit: parsedLimit },
      {
        $lookup: {
          from: 'follows',
          localField: '_id',
          foreignField: 'followingId',
          as: 'followers'
        }
      },
      {
        $project: {
          name: 1,
          username: 1,
          avatar: 1,
          totalPoints: 1,
          completedGoals: 1,
          totalGoals: 1,
          currentStreak: 1,
          createdAt: 1
        }
      }
    );

    let leaderboard = await User.aggregate(pipeline);

        // Add rank to leaderboard (without user-specific data for caching)
        const leaderboardWithRank = leaderboard.map((user, index) => ({
          ...user,
          rank: (parsedPage - 1) * parsedLimit + index + 1
        }));
    
        const total = await User.countDocuments(matchStage);
    
        const pagination = {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit)
        };
    
        // Cache the base data (without user-specific isFollowing)
        const cacheableData = {
          leaderboard: leaderboardWithRank,
          pagination
        };
        
        await cacheService.setGlobalLeaderboard(cacheableData, cacheParams);
    
    // Now add user-specific data for the response    
    if (req.user) {
      leaderboard = await Promise.all(
        leaderboardWithRank.map(async (user, index) => {
          const isFollowing = await Follow.isFollowing(req.user.id, user._id);
          return {
            ...user,
            isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
          };
        })
      );
    } else {
      leaderboard = leaderboardWithRank;
    }

    // Map to minimal field set for response
    const minimal = leaderboard.map(u => ({
      avatar: u.avatar,
      completedGoals: u.completedGoals,
      totalGoals: u.totalGoals,
      currentStreak: u.currentStreak,
      isFollowing: u.isFollowing,
      name: u.name,
      rank: u.rank,
      totalPoints: u.totalPoints,
      username: u.username
    }));
    res.status(200).json({
      success: true,
      data: { leaderboard: minimal },
      fromCache
    });
  } catch (error) {
    next(error);
  }
};


// Helper function to get user's rank
const getUserRank = async (userId, type = 'points', timeframe = 'all') => {
  try {
    let sortField = 'totalPoints';
    
    switch (type) {
      case 'points':
        sortField = 'totalPoints';
        break;
      case 'goals':
        sortField = 'completedGoals';
        break;
      case 'streak':
        sortField = 'currentStreak';
        break;
      case 'level':
        sortField = 'level';
        break;
    }
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    const userValue = user[sortField];
    const rank = await User.countDocuments({
      isActive: true,
      [sortField]: { $gt: userValue }
    });
    
    return {
      rank: rank + 1,
      value: userValue,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        level: user.level
      }
    };
  } catch (error) {
    return null;
  }
};

// @desc    Get category leaderboard
// @route   GET /api/v1/leaderboard/category/:category
// @access  Private
const getCategoryLeaderboard = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50, timeframe = 'all' } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    // Create cache parameters (exclude user-specific data)
    const cacheParams = {
      category,
      page: parsedPage,
      limit: parsedLimit,
      timeframe
    };

    // Try to get from cache first
    let cachedData = await cacheService.getCategoryLeaderboard(cacheParams);
    let fromCache = false;

    if (cachedData) {
      // We have cached data, but we need to add user-specific data
      let leaderboard = await Promise.all(
        cachedData.leaderboard.map(async (user, index) => {
          const isFollowing = await Follow.isFollowing(req.user.id, user._id);
          return {
            ...user,
            isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
          };
        })
      );

      fromCache = true;
      
      return res.status(200).json({
        success: true,
        data: {
          leaderboard,
          pagination: cachedData.pagination,
          category,
          timeframe
        },
        fromCache
      });
    }

    // Cache miss - fetch from database
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = null;
    }
    
    const matchQuery = {
      category,
      completed: true
    };
    
    if (startDate) {
      matchQuery.completedAt = { $gte: startDate };
    }
    
    const leaderboard = await Goal.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$pointsEarned' },
          goalCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.isActive': true
        }
      },
      {
        $sort: { totalPoints: -1, goalCount: -1 }
      },
      {
        $skip: (parsedPage - 1) * parsedLimit
      },
      {
        $limit: parsedLimit
      },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          level: '$user.level',
          totalPoints: 1,
          goalCount: 1
        }
      }
    ]);
    
    // Get total count for pagination
    const totalQuery = {
      category,
      completed: true,
      ...(startDate && { completedAt: { $gte: startDate } })
    };
    
    const totalResults = await Goal.aggregate([
      { $match: totalQuery },
      { $group: { _id: '$userId' } },
      { $count: 'total' }
    ]);
    
    const total = totalResults.length > 0 ? totalResults[0].total : 0;

    // Add rank to leaderboard (without following status for caching)
    const leaderboardWithRank = leaderboard.map((user, index) => ({
      ...user,
      rank: (parsedPage - 1) * parsedLimit + index + 1
    }));

    // Prepare data for caching (without user-specific data)
    const dataToCache = {
      leaderboard: leaderboardWithRank,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    };

    // Cache the result
    await cacheService.setCategoryLeaderboard(dataToCache, cacheParams);

    // Add following status to each user for response
    const rankedLeaderboard = await Promise.all(
      leaderboardWithRank.map(async (user) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        pagination: dataToCache.pagination,
        category,
        timeframe
      },
      fromCache: false
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get friends leaderboard
// @route   GET /api/v1/leaderboard/friends
// @access  Private
const getFriendsLeaderboard = async (req, res, next) => {
  try {
    const { type = 'points', page = 1, limit = 50, category, timeframe = 'all' } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    // Create cache parameters (include userId since friends list is user-specific)
    const cacheParams = {
      userId: req.user.id,
      type,
      page: parsedPage,
      limit: parsedLimit,
      category: category || null,
      timeframe
    };

    // Try to get from cache first
    let cachedData = await cacheService.getFriendsLeaderboard(cacheParams);
    let fromCache = false;

    if (cachedData) {
      fromCache = true;
      let leaderboard = cachedData.leaderboard || [];
      // Ensure username exists for legacy cached entries
      try {
        const missing = (leaderboard || []).filter(u => !u.username && u?._id).map(u => u._id);
        if (missing.length > 0) {
          const users = await User.find({ _id: { $in: missing } }).select('username');
          const idToUsername = new Map(users.map(u => [u._id.toString(), u.username]));
          leaderboard = leaderboard.map(u => ({
            ...u,
            username: u.username || idToUsername.get(u?._id?.toString()) || null
          }));
        }
      } catch {}
      // Normalize minimal field set
      const minimal = leaderboard.map(u => ({
        avatar: u.avatar,
        completedGoals: u.completedGoals,
        totalGoals: u.totalGoals,
        currentStreak: u.currentStreak,
        isFollowing: u._id?.toString && u._id.toString() !== req.user.id.toString() ? true : null,
        name: u.name,
        rank: u.rank,
        totalPoints: u.totalPoints,
        username: u.username
      }));
      return res.status(200).json({ success: true, data: { leaderboard: minimal }, fromCache });
    }

    // Cache miss - fetch from database
    // Get user's following list
    const following = await Follow.getFollowing(req.user.id);
    const followingIds = following.map(f => f.followingId);
    
    // Include current user in the leaderboard
    followingIds.push(req.user.id);
    
    let sortField = 'totalPoints';
    
    switch (type) {
      case 'points':
        sortField = 'totalPoints';
        break;
      case 'goals':
        sortField = 'completedGoals';
        break;
      case 'streak':
        sortField = 'currentStreak';
        break;
      case 'level':
        sortField = 'level';
        break;
    }
    
    // Build base match
    const match = { _id: { $in: followingIds }, isActive: true };
    // Optional category/timeframe filters via goals lookup
    if (category || (timeframe && timeframe !== 'all')) {
      // aggregate to compute timeframe-bound points/goals if provided
      const pipeline = [
        { $match: match },
        { $lookup: {
            from: 'goals',
            let: { userId: '$_id' },
            pipeline: [
              { $match: {
                  $expr: { $eq: ['$userId', '$$userId'] },
                  ...(category ? { category } : {}),
                  completed: true,
                  ...(timeframe !== 'all' ? { completedAt: { $gte: (() => {
                    const now = new Date();
                    if (timeframe === 'week') return new Date(now.getTime() - 7*24*60*60*1000);
                    if (timeframe === 'month') return new Date(now.getTime() - 30*24*60*60*1000);
                    if (timeframe === 'year') return new Date(new Date().getFullYear(),0,1);
                    return undefined;
                  })() } } : {})
                }
              }
            ],
            as: 'fltGoals'
        }},
        { $addFields: {
            recentPoints: { $sum: '$fltGoals.pointsEarned' },
            recentGoalsCount: { $size: '$fltGoals' }
        }},
        { $project: {
            name: 1,
            username: 1,
            avatar: 1,
            totalPoints: 1,
            completedGoals: 1,
            totalGoals: 1,
            currentStreak: 1,
            recentPoints: 1,
            recentGoalsCount: 1
        }},
        { $sort: { [type === 'points' ? (timeframe !== 'all' ? 'recentPoints' : 'totalPoints') : (timeframe !== 'all' ? 'recentGoalsCount' : 'completedGoals')]: -1 }},
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
      ];
      const agg = await User.aggregate(pipeline);
      // Map to User-like objects
      var leaderboard = agg.map(u => ({
        _id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        totalPoints: u.totalPoints,
        completedGoals: u.completedGoals,
        totalGoals: u.totalGoals,
        currentStreak: u.currentStreak
      }));
    } else {
      const docs = await User.find(match)
        .select('name username avatar totalPoints completedGoals totalGoals currentStreak')
        .sort({ [sortField]: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);
      var leaderboard = docs.map(d => d.toObject());
    }
    
    // Add rank to each user and highlight current user (with all data for friends leaderboard)
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: (parsedPage - 1) * parsedLimit + index + 1,
      isFollowing: user._id.toString() !== req.user.id.toString() ? true : null
    }));

    // Prepare data for caching (friends leaderboard can be fully cached since it's user-specific)
    const dataToCache = {
      leaderboard: rankedLeaderboard
    };

    // Cache the result
    await cacheService.setFriendsLeaderboard(dataToCache, cacheParams);
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard.map(u => ({
          avatar: u.avatar,
          completedGoals: u.completedGoals,
          totalGoals: u.totalGoals,
          currentStreak: u.currentStreak,
          isFollowing: u.isFollowing,
          name: u.name,
          rank: u.rank,
          totalPoints: u.totalPoints,
          username: u.username
        })),
        type
      },
      fromCache: false
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard stats
// @route   GET /api/v1/leaderboard/stats
// @access  Private
const getLeaderboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const activeUsers = await User.countDocuments({ 
      isActive: true, 
      totalPoints: { $gt: 0 } 
    });
    
    const topUser = await User.findOne({ isActive: true })
      .sort({ totalPoints: -1 })
      .select('name avatar totalPoints level');
    
    const avgPoints = await User.aggregate([
      { $match: { isActive: true, totalPoints: { $gt: 0 } } },
      { $group: { _id: null, avgPoints: { $avg: '$totalPoints' } } }
    ]);
    
    const levelDistribution = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const stats = {
      totalUsers,
      activeUsers,
      topUser,
      averagePoints: avgPoints[0]?.avgPoints || 0,
      levelDistribution
    };
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGlobalLeaderboard,
  getCategoryLeaderboard,
  getFriendsLeaderboard,
  getLeaderboardStats,
  getUserRank
}; 