const Goal = require('../models/Goal');
const User = require('../models/User');
const Activity = require('../models/Activity');
const userService = require('./userService');

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
      priority,
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
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
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
      priority = 'medium',
      duration,
      targetDate,
      isPublic = true,
      tags = []
    } = goalData;
    
    // Validate required fields
    if (!title || !category) {
      throw new Error('Title and category are required');
    }
    
    // Calculate points based on priority and duration
    const pointsEarned = this.calculateGoalPoints(priority, duration);
    
    const goal = await Goal.create({
      userId,
      title,
      description,
      category,
      priority,
      duration,
      targetDate,
      isPublic,
      tags,
      pointsEarned
    });
    
    const currentUser = (await User.findById(userId).select('name avatar').lean());
    // Create activity
    await Activity.createActivity(
      userId,
      currentUser.name,
      currentUser.avatar,
      'goal_created',
      {
        goalId: goal._id,
        goalTitle: title,
        goalCategory: category,
        pointsEarned
      }
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
      'title', 'description', 'category', 'priority', 
      'duration', 'targetDate', 'isPublic', 'tags'
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
    
    // Recalculate points if priority or duration changed
    if (updates.priority || updates.duration) {
      updates.pointsEarned = this.calculateGoalPoints(
        updates.priority || goal.priority,
        updates.duration || goal.duration
      );
    }
    
    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      updates,
      { new: true, runValidators: true }
    );
    
    return updatedGoal;
  }
  
  /**
   * Delete a goal
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
    
    // Soft delete
    goal.isActive = false;
    await goal.save();
    
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
    
    // Update user points and stats
    const user = await User.findById(userId);
    if (user) {
      user.totalPoints = (user.totalPoints || 0) + goal.pointsEarned;
      user.completedGoals = (user.completedGoals || 0) + 1;
      
      // Update daily completions for streak calculation
      const today = new Date().toDateString();
      if (!user.dailyCompletions) {
        user.dailyCompletions = new Map();
      }
      
      const todayCount = user.dailyCompletions.get(today) || 0;
      user.dailyCompletions.set(today, todayCount + 1);
      
      await user.save();
      
      // Update user level and streak
      await userService.updateUserLevel(userId);
      await userService.updateUserStreak(userId);
    }
    
    // Create completion activity
    await Activity.createActivity(
      userId,
      user.name,
      user.avatar,
      'goal_completed',
      {
        goalId: goal._id,
        goalTitle: goal.title,
        goalCategory: goal.category,
        pointsEarned: goal.pointsEarned,
        completionNote
      }
    );
    
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
      // Uncomplete the goal
      goal.completed = false;
      goal.completedAt = null;
      goal.completionNote = null;
      goal.completionProof = null;
      
      // Deduct points from user
      const user = await User.findById(userId);
      if (user) {
        user.totalPoints = Math.max(0, (user.totalPoints || 0) - goal.pointsEarned);
        user.completedGoals = Math.max(0, (user.completedGoals || 0) - 1);
        await user.save();
      }
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
      totalPoints: goals.reduce((sum, g) => sum + (g.completed ? g.pointsEarned : 0), 0),
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
    const { limit = 10, timeframe = 'week' } = params;
    
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
    
    const trendingGoals = await Goal.aggregate([
      {
        $match: {
          completed: true,
          completedAt: { $gte: startDate },
          isPublic: true
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
          likeCount: { $size: '$likes' },
          trendingScore: {
            $add: [
              '$pointsEarned',
              { $multiply: [{ $size: '$likes' }, 5] }
            ]
          }
        }
      },
      {
        $sort: { trendingScore: -1, completedAt: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          priority: 1,
          completedAt: 1,
          pointsEarned: 1,
          likeCount: 1,
          completionNote: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            avatar: '$user.avatar',
            level: '$user.level'
          }
        }
      }
    ]);
    
    return trendingGoals;
  }
  
  /**
   * Calculate points for a goal based on priority and duration
   */
  calculateGoalPoints(priority, duration) {
    let basePoints = 10;
    
    // Priority multiplier
    const priorityMultiplier = {
      low: 1,
      medium: 1.5,
      high: 2,
      urgent: 2.5
    };
    
    // Duration multiplier
    const durationMultiplier = {
      short: 1,      // < 1 week
      medium: 1.5,   // 1-4 weeks
      long: 2,       // 1-3 months
      extended: 2.5  // > 3 months
    };
    
    const priorityBonus = priorityMultiplier[priority] || 1;
    const durationBonus = durationMultiplier[duration] || 1;
    
    return Math.round(basePoints * priorityBonus * durationBonus);
  }
  
  /**
   * Search goals
   */
  async searchGoals(searchTerm, params = {}) {
    const { limit = 20, page = 1, category, interest } = params;

    const t = (searchTerm || '').trim().toLowerCase();
    const hasText = t.length >= 2;

    const baseMatch = {
      completed: true,
      isPublic: true,
      isActive: true
    };

    // Join with user to ensure only public/active users
    const pipeline = [
      { $match: baseMatch },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.isActive': true, 'user.isPrivate': { $ne: true } } },
    ];

    // Filter by category or interest (map interest to category if needed)
    if (category) {
      pipeline.push({ $match: { category } });
    }
    if (interest) {
      // If your interests map to categories, match either; else skip or extend schema
      pipeline.push({ $match: { category: { $regex: new RegExp(interest, 'i') } } });
    }

    if (hasText) {
      pipeline.push({ $match: { titleLower: { $regex: new RegExp(t) } } });
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    pipeline.push(
      { $sort: { completedAt: -1, pointsEarned: -1 } },
      { $facet: {
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) },
            { $project: { title: 1, category: 1, completedAt: 1, pointsEarned: 1, likeCount: 1, user: { _id: 1, name: 1, avatar: 1 } } }
          ],
          total: [ { $count: 'count' } ]
        }
      }
    );

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