const Goal = require('../models/Goal');
const User = require('../models/User');
const Activity = require('../models/Activity');
const userService = require('./userService');
const cacheService = require('./cacheService');

// Map user interests to goal categories for consistent filtering
function mapInterestToCategory(raw) {
  if (!raw) return 'Other';
  const interest = String(raw).toLowerCase();
  const map = {
    // Health & Fitness
    fitness: 'Health & Fitness',
    health: 'Health & Fitness',
    sports: 'Health & Fitness',

    // Education & Learning
    education: 'Education & Learning',

    // Career & Business
    career: 'Career & Business',
    business: 'Career & Business',
    technology: 'Career & Business',

    // Personal Development
    personal_growth: 'Personal Development',
    lifestyle: 'Personal Development',
    spirituality: 'Personal Development',

    // Financial Goals
    finance: 'Financial Goals',

    // Creative Projects
    creativity: 'Creative Projects',
    hobbies: 'Creative Projects',
    art: 'Creative Projects',
    music: 'Creative Projects',
    reading: 'Creative Projects',
    cooking: 'Creative Projects',
    gaming: 'Creative Projects',

    // Travel & Adventure
    travel: 'Travel & Adventure',
    nature: 'Travel & Adventure',

    // Relationships / Family & Friends
    relationships: 'Relationships',
  };
  return map[interest] || 'Other';
}

class GoalService {
  /**
   * Get goals with pagination and filters
   */
  async getGoals(userId, params = {}) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;
    
    let query = { userId };
    
    // Filter by status
    if (status === 'completed') {
      query.completed = true;
    } else if (status === 'active') {
      query.completed = false;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const goals = await Goal.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name avatar');
    
    const total = await Goal.countDocuments(query);
    
    return {
      goals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get goal by ID
   */
  async getGoalById(goalId, requestingUserId) {
    const goal = await Goal.findById(goalId).populate('userId', 'name avatar');
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check if user can view this goal
    if (goal.userId._id.toString() !== requestingUserId && !goal.isPublic) {
      throw new Error('Access denied');
    }
    
    return goal;
  }
  
  /**
   * Create a new goal
   */
  async createGoal(userId, goalData) {
    const {
      title,
      description,
      category,
      targetDate,
      isPublic = true,
      tags = []
    } = goalData;
    
    // Validate required fields
    if (!title || !category) {
      throw new Error('Title and category are required');
    }
    
    
    const goal = await Goal.create({
      userId,
      title,
      description,
      category,
      targetDate,
      isPublic,
      tags
    });
    
    const currentUser = (await User.findById(userId).select('name avatar').lean());
    // Create activity - respect goal's privacy setting
    await Activity.createActivity(
      userId,
      currentUser.name,
      currentUser.avatar,
      'goal_created',
      {
        goalId: goal._id,
        goalTitle: title,
        goalCategory: category
      },
      { isPublic: goal.isPublic }
    );
    
    return goal;
  }
  
  /**
   * Update a goal
   */
  async updateGoal(goalId, userId, updateData) {
    const goal = await Goal.findById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.userId.toString() !== userId) {
      throw new Error('Access denied');
    }
    
    // Prevent updating completed goals
    if (goal.completed) {
      throw new Error('Cannot update completed goals');
    }
    
    const allowedUpdates = [
      'title', 'description', 'category', 'targetDate', 'isPublic', 'tags'
    ];
    
    const updates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      throw new Error('No valid updates provided');
    }
    
    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      updates,
      { new: true, runValidators: true }
    );
    try { await cacheService.invalidateTrendingGoals(); } catch (_) {}
    
    return updatedGoal;
  }
  
  /**
   * Delete a goal (Hard delete with cascading cleanup)
   * Note: This method is kept for compatibility but main logic is in goalController
   */
  async deleteGoal(goalId, userId) {
    const goal = await Goal.findById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.userId.toString() !== userId) {
      throw new Error('Access denied');
    }
    
    // Note: Full cascading delete is handled in goalController with transaction
    // This method is kept for service-level calls if needed
    await Goal.deleteOne({ _id: goalId });
    
    try { 
      await cacheService.invalidateTrendingGoals(); 
      await cacheService.invalidatePattern('goals:*');
      await cacheService.invalidatePattern('user:*');
    } catch (_) {}
    
    return { message: 'Goal deleted successfully' };
  }
  
  /**
   * Complete a goal
   */
  async completeGoal(goalId, userId, completionData = {}) {
    const { completionNote, completionProof } = completionData;
    
    const goal = await Goal.findById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.userId.toString() !== userId) {
      throw new Error('Access denied');
    }
    
    // Check if already completed
    if (goal.completed) {
      throw new Error('Goal is already completed');
    }
    
    // Check if goal is locked
    if (goal.isLocked) {
      throw new Error('Goal is locked and cannot be completed');
    }
    
    // Mark as completed
    goal.completed = true;
    goal.completedAt = new Date();
    goal.completionNote = completionNote;
    goal.completionProof = completionProof;
    
    await goal.save();
    try { await cacheService.invalidateTrendingGoals(); } catch (_) {}
    
    // Update user stats
    const user = await User.findById(userId);
    if (user) {
      user.completedGoals = (user.completedGoals || 0) + 1;
      
      // Update daily completions for streak calculation
      const today = new Date().toDateString();
      if (!user.dailyCompletions) {
        user.dailyCompletions = new Map();
      }
      
      const todayCount = user.dailyCompletions.get(today) || 0;
      user.dailyCompletions.set(today, todayCount + 1);
      
      await user.save();
      await userService.updateUserStreak(userId);
    }
    
    // Create completion activity (global) - include completion details in metadata
    await Activity.createActivity(
      userId,
      user.name,
      user.avatar,
      'goal_completed',
      {
        goalId: goal._id,
        goalTitle: goal.title,
        goalCategory: goal.category,
        completionNote,
        metadata: {
          completionNote: completionNote || '',
          completionAttachmentUrl: completionProof || ''
        }
      },
      { isPublic: goal.isPublic }
    );
    // Mirror into community feed if a community item references this goal
    try {
      const CommunityItem = require('../models/CommunityItem');
      const CommunityActivity = require('../models/CommunityActivity');
      const link = await CommunityItem.findOne({ type: 'goal', sourceId: goal._id, status: 'approved', isActive: true }).select('communityId title').lean();
      if (link && link.communityId) {
        await CommunityActivity.create({
          communityId: link.communityId,
          userId,
          name: user?.name,
          avatar: user?.avatar,
          type: 'goal_completed',
          data: { goalId: goal._id, goalTitle: goal.title, goalCategory: goal.category}
        });
      }
    } catch (_) {}
    
    return goal;
  }
  
  /**
   * Toggle goal completion status
   */
  async toggleGoal(goalId, userId) {
    const goal = await Goal.findById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.userId.toString() !== userId) {
      throw new Error('Access denied');
    }
    
    if (goal.completed) {
      // Prevent uncompleting goals - once completed, goals cannot be undone
      throw new Error('Completed goals cannot be uncompleted');
    } else {
      // Complete the goal
      return await this.completeGoal(goalId, userId);
    }
    
    await goal.save();
    return goal;
  }
  
  /**
   * Get yearly goals for a user
   */
  async getYearlyGoals(userId, year, requestingUserId) {
    // Check if user can view these goals
    if (userId !== requestingUserId) {
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }
    }
    
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    
    const goals = await Goal.find({
      userId,
      $or: [
        { createdAt: { $gte: startOfYear, $lt: endOfYear } },
        { completedAt: { $gte: startOfYear, $lt: endOfYear } }
      ]
    }).sort({ createdAt: -1 });
    
    // Group goals by month
    const monthlyGoals = {};
    goals.forEach(goal => {
      const month = goal.createdAt.getMonth();
      if (!monthlyGoals[month]) {
        monthlyGoals[month] = [];
      }
      monthlyGoals[month].push(goal);
    });
    
    // Calculate yearly stats
    const stats = {
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.completed).length,
      categoriesUsed: [...new Set(goals.map(g => g.category))].length
    };
    
    return {
      goals: monthlyGoals,
      stats
    };
  }
  
  /**
   * Get trending goals
   */
  async getTrendingGoals(params = {}) {
    const { limit = 10 } = params;

    const trendingGoals = await Goal.aggregate([
      { $match: { completed: true, isPublic: true, isActive: true } },
      { $sort: { completedAt: -1 } },
      { $limit: parseInt(limit) },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { title: 1, description: 1, category: 1, completedAt: 1, likeCount: 1, user: { _id: '$user._id', name: '$user.name', avatar: '$user.avatar'} } }
    ]);

    return trendingGoals;
  }

  /**
   * Get trending goals with pagination and strategies (fast, low-load)
   */
  async getTrendingGoalsPaged(params = {}) {
    const {
      page = 1,
      limit = 20,
      strategy = 'global', // global | category | personalized
      category,
      userId
    } = params;

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const parsedPage = Math.max(1, parseInt(page));
    const skip = (parsedPage - 1) * parsedLimit;

    const baseMatch = { completed: true, isPublic: true, isActive: true };
    if (strategy === 'category' && category) {
      baseMatch.category = category;
    }

    // Personalized categories derived from user interests (optional)
    let interestCategories = [];
    if (strategy === 'personalized' && userId) {
      const user = await User.findById(userId).select('interests').lean();
      const interests = Array.isArray(user && user.interests) ? user.interests : [];
      // Map interests to goal categories
      const catSet = new Set();
      for (const i of interests) {
        catSet.add(mapInterestToCategory(i));
      }
      interestCategories = Array.from(catSet);
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: baseMatch }
    ];

    if (interestCategories.length > 0) {
      pipeline.push({
        $addFields: {
          _interestBoost: { $cond: [{ $in: ['$category', interestCategories] }, 5, 0] },
          trendingScore: { $add: ['$_trendBase', { $cond: [{ $in: ['$category', interestCategories] }, 5, 0] }] }
        }
      });
    } else {
      pipeline.push({ $addFields: { trendingScore: '$_trendBase' } });
    }

    pipeline.push(
      { $sort: { trendingScore: -1, completedAt: -1 } },
      { $facet: {
          data: [
            { $skip: skip },
            { $limit: parsedLimit },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, title: 1, description: 1, category: 1, completedAt: 1, likeCount: 1, user: { _id: '$user._id', name: '$user.name', avatar: '$user.avatar'} } }
          ],
          total: [ { $count: 'count' } ]
        }
      }
    );

    const aggResult = await Goal.aggregate(pipeline).allowDiskUse(true);
    const bucket = aggResult && aggResult[0] ? aggResult[0] : { data: [], total: [] };
    const goals = bucket.data || [];
    const total = (bucket.total && bucket.total[0] && bucket.total[0].count) ? bucket.total[0].count : 0;
    return {
      goals,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    };
  }
  
  /**
   * Search goals
   */
  async searchGoals(searchTerm, params = {}) {
    const { limit = 20, page = 1, category, interest, requestingUserId } = params;

    const t = (searchTerm || '').trim().toLowerCase();
    const hasText = t.length >= 2;
    const escapeRegex = (s) => String(s || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const safe = hasText ? escapeRegex(t) : '';

    // Get blocked user IDs and following IDs
    let blockedUserIds = [];
    let followingIds = [];
    const mongoose = require('mongoose');
    
    if (requestingUserId) {
      const Block = require('../models/Block');
      const Follow = require('../models/Follow');
      
      const [blocks, following] = await Promise.all([
        Block.find({
          $or: [
            { blockerId: requestingUserId, isActive: true },
            { blockedId: requestingUserId, isActive: true }
          ]
        }).select('blockerId blockedId').lean(),
        Follow.find({ 
          followerId: requestingUserId, 
          status: 'accepted', 
          isActive: true 
        }).select('followingId').lean()
      ]);
      
      blockedUserIds = blocks.map(b => 
        String(b.blockerId) === String(requestingUserId) ? b.blockedId : b.blockerId
      );
      followingIds = following.map(f => f.followingId);
      
      // Add requesting user to blocked list to exclude their own goals
      blockedUserIds.push(new mongoose.Types.ObjectId(requestingUserId));
    }

    // Build optimized base match query (uses compound index)
    // Show all goals: completed, active, sub-goals (not just completed)
    const baseMatch = {
      isPublic: true,
      isActive: true
      // No completed filter - show both completed and active goals
    };

    // Add category filter to base match (index optimization)
    if (category) {
      baseMatch.category = category;
    } else if (interest) {
      baseMatch.category = mapInterestToCategory(interest);
    }

    // Add text filter to base match if provided (index optimization)
    if (hasText) {
      baseMatch.titleLower = { $regex: new RegExp(safe) };
    }

    // Optimized pipeline with fewer stages
    const pipeline = [
      // First match uses compound index: isPublic, isActive, completed, category, titleLower
      { $match: baseMatch },
      
      // Lookup users (only necessary fields)
      { 
        $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id', 
          as: 'user',
          pipeline: [
            { $match: { 
              isActive: true,
              _id: { $nin: blockedUserIds } // Excludes blocked users AND requesting user
            } },
            { $project: { _id: 1, name: 1, avatar: 1, username: 1, isPrivate: 1, 'preferences.privacy': 1 } }
          ]
        } 
      },
      { $unwind: '$user' },
      // Filter for privacy: show goals from public users OR friends (users I follow)
      // Support both isPrivate boolean and preferences.privacy enum
      { $match: { 
        $or: [
          { 'user.isPrivate': { $ne: true }, 'user.preferences.privacy': { $in: ['public', null] } }, // Public users
          { 'user.preferences.privacy': 'friends', 'user._id': { $in: followingIds } }, // Friends-only if I follow them
          { 'user.isPrivate': true, 'user._id': { $in: followingIds } } // Private users if I follow them
        ]
      } },
      
      // Use facet for counting and pagination in single pass
      { 
        $facet: {
          data: [
            // Sort: completed goals by completion date, active goals by creation date
            { $sort: { completed: -1, completedAt: -1, createdAt: -1 } },
            { $skip: (Math.max(1, parseInt(page)) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            { 
              $project: { 
                _id: 1,
                title: 1, 
                description: 1,
                category: 1,
                completed: 1,
                completedAt: 1, 
                targetDate: 1,
                startDate: 1,
                likeCount: 1,
                completionNote: 1,
                subGoals: 1,
                user: 1,
                createdAt: 1
              }
            }
          ],
          total: [ { $count: 'count' } ]
        }
      }
    ];

    const res = await Goal.aggregate(pipeline);
    const arr = res && res[0] ? res[0] : { data: [], total: [] };
    const goals = arr.data || [];
    const total = (arr.total && arr.total[0] && arr.total[0].count) ? arr.total[0].count : 0;
    
    return {
      goals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit || 1))
      }
    };
  }
}

module.exports = new GoalService(); 