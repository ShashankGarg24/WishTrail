const User = require('../models/User');
const Goal = require('../models/Goal');
const Activity = require('../models/Activity');
const Follow = require('../models/Follow');

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
    
    let query = { isActive: true };
    
    // Search functionality
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Select only fields needed for Discover UI
    const projection = 'name username avatar bio totalGoals completedGoals currentStreak';
    
    const users = await User.find(query)
      .select(projection)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await User.countDocuments(query);
    
    // Add following status if requesting user is provided
    let usersWithFollowingStatus = users;
    if (requestingUserId) {
      usersWithFollowingStatus = await Promise.all(
        users.map(async (user) => {
          const isFollowing = await Follow.isFollowing(requestingUserId, user._id);
          // determine request status
          let isRequested = false;
          if (!isFollowing) {
            const pending = await require('../models/Follow').findOne({ followerId: requestingUserId, followingId: user._id, status: 'pending', isActive: false });
            isRequested = !!pending;
          }
          return {
            ...user,
            isFollowing,
            isRequested
          };
        })
      );
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
    const user = await User.findById(userId)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires');
    
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }
    
    // Check if requesting user is following this user
    let isFollowing = false;
    if (requestingUserId && requestingUserId !== userId) {
      isFollowing = await Follow.isFollowing(requestingUserId, userId);
    }
    
    const userResponse = user.toObject();   
    const userStats = await this.getUserStats(user);
    // Also expose pending request
    let isRequested = false;
    if (requestingUserId && !isFollowing && String(requestingUserId) !== String(userId)) {
      const pending = await require('../models/Follow').findOne({ followerId: requestingUserId, followingId: userId, status: 'pending', isActive: false });
      isRequested = !!pending;
    }
    return { user: userResponse, stats: userStats, isFollowing, isRequested };
  }
  
  /**
   * Get user by ID or username
   */
  async getUserByUsername(username, requestingUserId = null) {
    const cleanUsername = username.replace(/^@/, '');    
    const user = await User.findOne({ username: cleanUsername })
      .select('_id name username avatar bio isPrivate areHabitsPrivate totalGoals followerCount followingCount isActive');

    if (!user || !user.isActive) {
      throw new Error('User not found');
    }

    let isFollowing = false;
    let isRequested = false;
    if (requestingUserId && user._id.toString() !== requestingUserId.toString()) {
      isFollowing = await Follow.isFollowing(requestingUserId, user._id);
      if (!isFollowing) {
        const pending = await require('../models/Follow').findOne({ followerId: requestingUserId, followingId: user._id, status: 'pending', isActive: false });
        isRequested = !!pending;
      }
    }

    // Return minimal user data
    const userResponse = {
      _id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio || '',
      isPrivate: user.isPrivate || false,
      areHabitsPrivate: user.areHabitsPrivate ?? true
    };
    
    // Basic stats only
    const stats = {
      totalGoals: user.totalGoals || 0,
      followers: user.followerCount || 0,
      followings: user.followingCount || 0
    };
    
    return { user: userResponse, stats, isFollowing, isRequested };
  }
  
  /**
   * Get dashboard statistics for user
   */
  async getDashboardStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return only essential stats
    return {
      totalGoals: user.totalGoals || 0,
      completedGoals: user.completedGoals || 0,
      todayCompletions: user.getTodayCompletionCount() || 0,
      dailyLimit: 3,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
    };
  }
  
  async getUserStats(user) {
    const stats = {
      totalGoals: user.totalGoals,
      completedGoals: user.completedGoals,
      activeGoals: user.activeGoals,
      followers: user.followerCount,
      followings: user.followingCount
    };

    return stats;
  }

  /**
   * Get user's profile summary
   */
  async getProfileSummary(userId) {
    const user = await User.findById(userId)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get follower/following counts
    const [followerCount, followingCount] = [
      user.followerCount,
      user.followingCount
    ];
    
    // Get recent goals
    const recentGoals = await Goal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title category completed createdAt');
    
    const userResponse = user.toObject();
    userResponse.followerCount = followerCount;
    userResponse.followingCount = followingCount;
    userResponse.recentGoals = recentGoals;
    
    return userResponse;
  }

  /**
   * List popular interests with counts
   */
  async listPopularInterests(limit = 50) {
    const pipeline = [
      { $match: { isActive: true, interests: { $exists: true, $ne: [] } } },
      { $unwind: '$interests' },
      { $group: { _id: '$interests', count: { $sum: 1 } } },
      // Ensure interests align with Goal categories ordering buckets
      { $sort: { count: -1, _id: 1 } },
      { $limit: parseInt(limit) },
      { $project: { _id: 0, interest: '$_id' } }
    ];
    const results = await User.aggregate(pipeline);
    return results;
  }
  
  /**
   * Get suggested users for a user
   */
  async getSuggestedUsers(userId, params = {}) {
    const { limit = 10, category } = params;
    
    // Get users current user is not following
    const following = await Follow.getFollowing(userId);
    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Exclude current user
    
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
    
    // Add follower count for sorting
    pipeline.push({
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followingId',
        as: 'followers'
      }
    });
    
    pipeline.push({
      $addFields: {
        followerCount: { $size: '$followers' },
        suggestionScore: {
          $add: [
            { $multiply: [{ $size: '$followers' }, 5] },
            { $multiply: ['$completedGoals', 2] }
          ]
        }
      }
    });
    
    pipeline.push(
      { $sort: { suggestionScore: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          avatar: 1,
          bio: 1,
          completedGoals: 1,
          followerCount: 1
        }
      }
    );
    
    const users = await User.aggregate(pipeline);
    return users;
  }
  
  /**
   * Search users
   */
  async searchUsers(searchTerm, params = {}) {
    const { limit = 20, page = 1, requestingUserId, interest } = params;

    const escapeRegex = (s) => String(s || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Get blocked user IDs (both directions: users I blocked + users who blocked me)
    let blockedUserIds = [];
    if (requestingUserId) {
      const Block = require('../models/Block');
      const blocks = await Block.find({
        $or: [
          { blockerId: requestingUserId, isActive: true },
          { blockedId: requestingUserId, isActive: true }
        ]
      }).select('blockerId blockedId').lean();
      
      blockedUserIds = blocks.map(b => 
        String(b.blockerId) === String(requestingUserId) ? b.blockedId : b.blockerId
      );
    }

    const match = { 
      isActive: true,
      _id: { $nin: [...blockedUserIds, requestingUserId] } // Exclude blocked users and self
    };
    
    if (interest && String(interest).trim()) {
      match.interests = String(interest).trim();
    }

    const q = (searchTerm || '').trim();
    const hasQ = q.length >= 2;

    // Build optimized aggregation pipeline
    const pipeline = [];
    
    // First stage: filter by isActive and interest (uses index)
    pipeline.push({ $match: match });

    // If we have search term, add ranking logic
    if (hasQ) {
      const sw = `^${escapeRegex(q.toLowerCase())}`; // starts with
      const ct = escapeRegex(q.toLowerCase()); // contains

      pipeline.push(
        {
          $addFields: {
            _uname: { $toLower: { $ifNull: ['$username', ''] } },
            _name: { $toLower: { $ifNull: ['$name', ''] } }
          }
        },
        {
          $addFields: {
            rank: {
              $switch: {
                branches: [
                  { case: { $regexMatch: { input: '$_uname', regex: sw } }, then: 4 },
                  { case: { $regexMatch: { input: '$_name',  regex: sw } }, then: 3 },
                  { case: { $regexMatch: { input: '$_uname', regex: ct } }, then: 2 },
                  { case: { $regexMatch: { input: '$_name',  regex: ct } }, then: 1 },
                ],
                default: 0
              }
            }
          }
        },
        // Filter out non-matches when searching
        { $match: { rank: { $gt: 0 } } }
      );
    }

    // Add total count and paginated results using $facet
    pipeline.push({
      $facet: {
        data: [
          { $sort: hasQ 
            ? { rank: -1, completedGoals: -1 }
            : { completedGoals: -1, createdAt: -1 }
          },
          { $skip: (Math.max(1, parseInt(page)) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
          // Project only needed fields for better performance
          { $project: {
            _id: 1,
            name: 1,
            username: 1,
            avatar: 1,
            bio: 1,
            completedGoals: 1,
            currentStreak: 1,
            totalGoals: 1,
            interests: 1,
            isPrivate: 1
          }}
        ],
        total: [
          { $count: 'count' }
        ]
      }
    });

    const res = await User.aggregate(pipeline);
    const arr = res && res[0] ? res[0] : { data: [], total: [] };
    const users = arr.data || [];
    const total = (arr.total && arr.total[0] && arr.total[0].count) ? arr.total[0].count : 0;

    // Enrich with following status (use lean queries for speed)
    let enrichedUsers = users;
    if (requestingUserId && users.length > 0) {
      const userIds = users.map(u => u._id);
      
      // Batch fetch all following relationships at once (much faster than individual queries)
      const followingRecords = await Follow.find({
        followerId: requestingUserId,
        followingId: { $in: userIds },
        isActive: true
      }).select('followingId status').lean();
      
      const followingMap = new Map();
      const requestedMap = new Map();
      
      followingRecords.forEach(f => {
        if (f.status === 'accepted') {
          followingMap.set(String(f.followingId), true);
        } else if (f.status === 'pending') {
          requestedMap.set(String(f.followingId), true);
        }
      });
      
      enrichedUsers = users.map(user => ({
        ...user,
        isFollowing: followingMap.get(String(user._id)) || false,
        isRequested: requestedMap.get(String(user._id)) || false
      }));
    }

    return {
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit || 1))
      }
    };
  }
  
  /**
   * Get user's activities
   */
  async getUserActivities(userId, requestingUserId, params = {}) {
    const { page = 1, limit = 10 } = params;
    
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }
    
    // Check if user can view activities (either own activities or following the user)
    const canViewActivities = userId === requestingUserId || 
      await Follow.isFollowing(requestingUserId, userId);
    
    if (!canViewActivities) {
      throw new Error('Access denied');
    }
    
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('data.goalId', 'title category')
      .populate('data.targetUserId', 'name avatar');
    
    const total = await Activity.countDocuments({ userId });
    
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
   * Update user streak
   */
  async updateUserStreak(userId) {
    const user = await User.findById(userId);
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if user completed any goals today
    const todayGoals = await Goal.countDocuments({
      userId,
      completed: true,
      completedAt: { $gte: today }
    });
    
    if (todayGoals > 0) {
      // Check if user completed goals yesterday
      const yesterdayGoals = await Goal.countDocuments({
        userId,
        completed: true,
        completedAt: { $gte: yesterday, $lt: today }
      });
      
      if (yesterdayGoals > 0 || user.currentStreak === 0) {
        // Continue or start streak
        user.currentStreak = (user.currentStreak || 0) + 1;
      } else {
        // Streak broken, restart
        user.currentStreak = 1;
      }
      
      // Update longest streak
      if (user.currentStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.currentStreak;
      }
      
      await user.save();
      
      // Create streak milestone activity
      if (user.currentStreak % 7 === 0) { // Weekly milestones
        await Activity.createActivity(
          userId,
          user.name,
          user.avatar,
          'streak_milestone',
          {
            streakCount: user.currentStreak,
            milestone: `${user.currentStreak} days`
          }
        );
      }
    }
  }
}

module.exports = new UserService(); 