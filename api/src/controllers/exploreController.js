const User = require('../models/User');
const Goal = require('../models/Goal');
const Activity = require('../models/Activity');
const Follow = require('../models/Follow');
const goalService = require('../services/goalService');
const cacheService = require('../services/cacheService');

// @desc    Get trending goals and users
// @route   GET /api/v1/explore
// @access  Private
const getExploreFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get trending goals (recently completed with high points)
    const trendingGoals = await Goal.aggregate([
      {
        $match: {
          completed: true,
          completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
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
        $match: {
          'user.isActive': true
        }
      },
      {
        $lookup: {
          from: 'likes',
          let: { goalId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$itemId', '$$goalId'] },
                    { $eq: ['$itemType', 'goal'] }
                  ]
                }
              }
            }
          ],
          as: 'likes'
        }
      },
      {
        $addFields: {
          likeCount: { $size: '$likes' }
        }
      },
      {
        $sort: { trendingScore: -1, completedAt: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          completedAt: 1,
          likeCount: 1,
          completionNote: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            avatar: '$user.avatar'
          }
        }
      }
    ]);
    
    // Get popular users (high followers)
    const popularUsers = await User.aggregate([
      {
        $match: {
          isActive: true
        }
      },
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
          followerCount: { $size: '$followers' },
          popularityScore: {
            $add: [
              { $multiply: [{ $size: '$followers' }, 10] }
            ]
          }
        }
      },
      {
        $sort: { popularityScore: -1 }
      },
      {
        $limit: 8
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          bio: 1,
          completedGoals: 1,
          followerCount: 1
        }
      }
    ]);
    
    // Add following status to popular users
    const popularUsersWithFollowingStatus = await Promise.all(
      popularUsers.map(async (user) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          isFollowing: user._id.toString() !== req.user.id ? isFollowing : null
        };
      })
    );
    
    // Get recent activities from followed users
    const following = await Follow.getFollowing(req.user.id);
    const followingIds = following.map(f => f._id);
    
    const recentActivities = await Activity.aggregate([
      {
        $match: {
          userId: { $in: followingIds },
          type: 'goal_completed'
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 15
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
          _id: 1,
          type: 1,
          data: 1,
          createdAt: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            avatar: '$user.avatar'
          }
        }
      }
    ]);
    
    // Get category breakdown
    const categoryStats = await Goal.aggregate([
      {
        $match: {
          completed: true,
          completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          category: '$_id',
          goalCount: '$count'
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        trendingGoals,
        popularUsers: popularUsersWithFollowingStatus,
        recentActivities,
        categoryStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggested users to follow
// @route   GET /api/v1/explore/users
// @access  Private
const getSuggestedUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    
    // Get users current user is not following
    const following = await Follow.getFollowing(req.user.id);
    const followingIds = following.map(f => f._id);
    followingIds.push(req.user.id); // Exclude current user
    
    let pipeline = [
      {
        $match: {
          _id: { $nin: followingIds },
          isActive: true
        }
      }
    ];
    
    // Filter by category if specified
    if (category) {
      pipeline.push({
        $lookup: {
          from: 'goals',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                category: category,
                completed: true
              }
            }
          ],
          as: 'categoryGoals'
        }
      });
      
      pipeline.push({
        $match: {
          'categoryGoals.0': { $exists: true }
        }
      });
    }
    
    // Add follower count and recent activity
    pipeline.push(
      {
        $lookup: {
          from: 'follows',
          localField: '_id',
          foreignField: 'followingId',
          as: 'followers'
        }
      },
      {
        $lookup: {
          from: 'goals',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                completed: true,
                completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            }
          ],
          as: 'recentGoals'
        }
      },
      {
        $addFields: {
          followerCount: { $size: '$followers' },
          recentGoalsCount: { $size: '$recentGoals' },
          suggestionScore: {
            $add: [
              { $multiply: [{ $size: '$followers' }, 5] },
              { $multiply: [{ $size: '$recentGoals' }, 10] }
            ]
          }
        }
      },
      {
        $sort: { suggestionScore: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          bio: 1,
          completedGoals: 1,
          followerCount: 1,
          recentGoalsCount: 1
        }
      }
    );
    
    const suggestedUsers = await User.aggregate(pipeline);
    
    // Add following status to each user
    const usersWithFollowingStatus = await Promise.all(
      suggestedUsers.map(async (user) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          isFollowing: isFollowing
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        users: usersWithFollowingStatus,
        category: category || 'all'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending categories
// @route   GET /api/v1/explore/categories
// @access  Private
const getTrendingCategories = async (req, res, next) => {
  try {
    const { timeframe = 'week' } = req.query;
    
    let startDate;
    const now = new Date();
    
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
    
    const trendingCategories = await Goal.aggregate([
      {
        $match: {
          completed: true,
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          completedGoals: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          trendingScore: {
            $add: [
              '$completedGoals',
              { $multiply: ['$uniqueUserCount', 2] }
            ]
          }
        }
      },
      {
        $sort: { trendingScore: -1 }
      },
      {
        $project: {
          category: '$_id',
          completedGoals: 1,
          uniqueUserCount: 1,
          trendingScore: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        categories: trendingCategories,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search goals and users
// @route   GET /api/v1/explore/search
// @access  Private
const searchExplore = async (req, res, next) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }
    
    const searchRegex = new RegExp(q, 'i');
    const results = {};
    
    if (type === 'all' || type === 'users') {
      // Search users
      const users = await User.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { bio: searchRegex }
        ]
      })
      .select('name avatar bio completedGoals')
      .limit(type === 'users' ? limit : 10);
      
      results.users = users;
    }
    
    if (type === 'all' || type === 'goals') {
      // Search completed goals
      const goals = await Goal.aggregate([
        {
          $match: {
            completed: true,
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { category: searchRegex }
            ]
          }
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
          $match: {
            'user.isActive': true
          }
        },
        {
          $sort: {completedAt: -1 }
        },
        {
          $limit: type === 'goals' ? limit : 10
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            category: 1,
            completedAt: 1,
            user: {
              _id: '$user._id',
              name: '$user.name',
              avatar: '$user.avatar'
            }
          }
        }
      ]);
      
      results.goals = goals;
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExploreFeed,
  getSuggestedUsers,
  getTrendingCategories,
  searchExplore,
  // @desc    Get trending goals (fast + cached)
  // @route   GET /api/v1/explore/goals/trending
  // @access  Private
  async getTrendingGoals(req, res, next) {
    try {
      const { strategy = 'global', category, page = 1, limit = 20 } = req.query;
      if (strategy === 'category' && !category) {
        return res.status(400).json({ success: false, message: 'category is required for strategy=category' });
      }

      const cacheParams = {
        strategy,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      if (category) cacheParams.category = category;
      if (strategy === 'personalized') cacheParams.userId = req.user.id;

      const cached = await cacheService.getTrendingGoals(cacheParams);
      if (cached) {
        return res.status(200).json({ success: true, data: cached });
      }

      const result = await goalService.getTrendingGoalsPaged({
        page,
        limit,
        strategy,
        category,
        userId: req.user.id
      });

      const ttl = strategy === 'personalized'
        ? cacheService.CACHE_TTL.FIVE_MINUTES
        : cacheService.CACHE_TTL.TEN_MINUTES;
      await cacheService.setTrendingGoals(result, cacheParams, ttl);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}; 