const User = require('../models/User');
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const Follow = require('../models/Follow');

// @desc    Get global leaderboard
// @route   GET /api/v1/leaderboard
// @access  Public
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { type = 'points', page = 1, limit = 50, timeframe = 'all' } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

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

    if (timeframe !== 'all' && ['points', 'goals'].includes(type)) {
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

      if (startDate) {
        pipeline.push(
          {
            $lookup: {
              from: 'goals',
              let: { userId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$userId', '$$userId'] },
                    completed: true,
                    completedAt: { $gte: startDate }
                  }
                }
              ],
              as: 'recentGoals'
            }
          },
          {
            $addFields: {
              recentPoints: { $sum: '$recentGoals.pointsEarned' },
              recentGoalsCount: { $size: '$recentGoals' }
            }
          }
        );

        sortField = type === 'points' ? 'recentPoints' : 'recentGoalsCount';
      }
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
        $addFields: {
          followerCount: { $size: '$followers' }
        }
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          level: 1,
          totalPoints: 1,
          completedGoals: 1,
          currentStreak: 1,
          followerCount: 1,
          recentPoints: 1,
          recentGoalsCount: 1,
          createdAt: 1
        }
      }
    );

    let leaderboard = await User.aggregate(pipeline);

    // Only compute isFollowing if user is logged in
    if (req.user) {
      leaderboard = await Promise.all(
        leaderboard.map(async (user, index) => {
          const isFollowing = await Follow.isFollowing(req.user.id, user._id);
          return {
            ...user,
            rank: (parsedPage - 1) * parsedLimit + index + 1,
            isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
          };
        })
      );
    } else {
      leaderboard = leaderboard.map((user, index) => ({
        ...user,
        rank: (parsedPage - 1) * parsedLimit + index + 1
      }));
    }

    const total = await User.countDocuments(matchStage);

    let currentUserRank = null;
    if (req.user) {
      currentUserRank = await getUserRank(req.user.id, type, timeframe);
    }

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit)
        },
        currentUserRank,
        type,
        timeframe
      }
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
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
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
    
    // Add rank and following status to each user
    const rankedLeaderboard = await Promise.all(
      leaderboard.map(async (user, index) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          rank: (page - 1) * limit + index + 1,
          isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
        };
      })
    );
    
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
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        category,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get achievement leaderboard
// @route   GET /api/v1/leaderboard/achievements
// @access  Private
const getAchievementLeaderboard = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, rarity } = req.query;
    
    const pipeline = [
      {
        $lookup: {
          from: 'userachievements',
          localField: '_id',
          foreignField: 'userId',
          as: 'achievements'
        }
      },
      {
        $match: {
          isActive: true,
          'achievements.0': { $exists: true }
        }
      }
    ];
    
    // Filter by rarity if specified
    if (rarity) {
      pipeline.push({
        $lookup: {
          from: 'achievements',
          localField: 'achievements.achievementId',
          foreignField: '_id',
          as: 'achievementDetails'
        }
      });
      
      pipeline.push({
        $addFields: {
          filteredAchievements: {
            $filter: {
              input: '$achievementDetails',
              as: 'achievement',
              cond: { $eq: ['$$achievement.rarity', rarity] }
            }
          }
        }
      });
      
      pipeline.push({
        $addFields: {
          achievementCount: { $size: '$filteredAchievements' }
        }
      });
    } else {
      pipeline.push({
        $addFields: {
          achievementCount: { $size: '$achievements' }
        }
      });
    }
    
    pipeline.push(
      { $sort: { achievementCount: -1, totalPoints: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          avatar: 1,
          level: 1,
          totalPoints: 1,
          achievementCount: 1
        }
      }
    );
    
    const leaderboard = await User.aggregate(pipeline);
    
    // Add rank and following status to each user
    const rankedLeaderboard = await Promise.all(
      leaderboard.map(async (user, index) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          rank: (page - 1) * limit + index + 1,
          isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        rarity: rarity || 'all'
      }
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
    const { type = 'points', page = 1, limit = 50 } = req.query;
    
    // Get user's following list
    const following = await Follow.getFollowing(req.user.id);
    const followingIds = following.map(f => f._id);
    
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
    
    const leaderboard = await User.find({
      _id: { $in: followingIds },
      isActive: true
    })
    .select('name avatar level totalPoints completedGoals currentStreak')
    .sort({ [sortField]: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    // Add rank to each user and highlight current user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user.toObject(),
      rank: (page - 1) * limit + index + 1,
      isCurrentUser: user._id.toString() === req.user.id.toString(),
      isFollowing: user._id.toString() !== req.user.id.toString() ? true : null // All users in friends leaderboard are followed
    }));
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        type
      }
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
  getAchievementLeaderboard,
  getFriendsLeaderboard,
  getLeaderboardStats,
  getUserRank
}; 