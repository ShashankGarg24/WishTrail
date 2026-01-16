const Activity = require('../models/Activity');
const UserPreferences = require('../models/extended/UserPreferences');
const GoalDetails = require('../models/extended/GoalDetails');
const userService = require('./userService');
const cacheService = require('./cacheService');
const pgUserService = require('./pgUserService');
const pgGoalService = require('./pgGoalService');

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
    
    const queryParams = { userId, page, limit };
    
    // Filter by status
    if (status === 'completed') {
      queryParams.completed = true;
    } else if (status === 'active') {
      queryParams.completed = false;
    }
    
    // Filter by category
    if (category) {
      queryParams.category = category;
    }
    
    // Sort options
    queryParams.sort = sortOrder === 'desc' ? 'newest' : 'oldest';
    
    return await pgGoalService.getUserGoals(queryParams);
  }
  
  /**
   * Get goal by ID
   */
  async getGoalById(goalId, requestingUserId) {
    const goal = await pgGoalService.getGoalById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check if user can view this goal
    if (goal.user_id !== requestingUserId && !goal.is_public) {
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
      year,
      isPublic = true,
      tags = []
    } = goalData;
    
    // Validate required fields
    if (!title || !category) {
      throw new Error('Title and category are required');
    }
    
    const goal = await pgGoalService.createGoal({
      userId,
      title,
      category,
      year,
      targetDate,
      isPublic,
    });
    
    // Create GoalDetails in MongoDB for extended data
    if (description || tags.length > 0) {
      await GoalDetails.create({
        goalId: goal.id,
        userId,
        description,
        tags
      });
    }
    
    const currentUser = await pgUserService.getUserById(userId);
    // Create activity - respect goal's privacy setting
    await Activity.createActivity(
      userId,
      currentUser.name,
      currentUser.username,
      currentUser.avatar_url,
      'goal_created',
      {
        goalId: goal.id,
        goalTitle: title,
        goalCategory: category
      },
      { isPublic: goal.is_public }
    );
    
    return goal;
  }
  
  /**
   * Update a goal
   */
  async updateGoal(goalId, userId, updateData) {
    const goal = await pgGoalService.getGoalById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    // Prevent updating completed goals
    if (goal.completedAt) {
      throw new Error('Cannot update completed goals');
    }
    
    const allowedUpdates = ['title', 'category', 'target_date', 'is_public'];
    const pgUpdates = {};
    const detailUpdates = {};
    
    // Map updates to PostgreSQL field names and separate GoalDetails fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'targetDate') pgUpdates.target_date = updateData[key];
        else if (key === 'isPublic') pgUpdates.is_public = updateData[key];
        else if (allowedUpdates.includes(key)) pgUpdates[key] = updateData[key];
        else if (key === 'description' || key === 'tags') detailUpdates[key] = updateData[key];
      }
    });
    
    let updatedGoal = goal;
    if (Object.keys(pgUpdates).length > 0) {
      updatedGoal = await pgGoalService.updateGoal(goalId, userId, pgUpdates);
    }
    
    // Update GoalDetails if needed
    if (Object.keys(detailUpdates).length > 0) {
      await GoalDetails.findOneAndUpdate(
        { goalId },
        { $set: detailUpdates },
        { upsert: true }
      );
    }
    
    try { await cacheService.invalidateTrendingGoals(); } catch (_) {}
    
    return updatedGoal;
  }
  
  /**
   * Delete a goal (Hard delete with cascading cleanup)
   * Note: This method is kept for compatibility but main logic is in goalController
   */
  async deleteGoal(goalId, userId) {
    const goal = await pgGoalService.getGoalById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    // Note: Full cascading delete is handled in goalController with transaction
    // This method is kept for service-level calls if needed
    await pgGoalService.deleteGoal(goalId, userId);
    
    // Also soft-delete GoalDetails
    await GoalDetails.findOneAndUpdate(
      { goalId },
      { isActive: false }
    );
    
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
    
    const goal = await pgGoalService.getGoalById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    // Check if already completed
    if (goal.completed) {
      throw new Error('Goal is already completed');
    }
    
    // Mark as completed in PostgreSQL
    const completedGoal = await pgGoalService.completeGoal(goalId, userId);
    
    // Store completion note/proof in GoalDetails
    if (completionNote || completionProof) {
      await GoalDetails.findOneAndUpdate(
        { goalId },
        { 
          $set: { 
            completionNote,
            completionProof,
            completedAt: completedGoal.completed_at
          }
        },
        { upsert: true }
      );
    }
    
    try { await cacheService.invalidateTrendingGoals(); } catch (_) {}
    
    // Update user stats in PostgreSQL
    const user = await pgUserService.getUserById(userId);
    if (user) {
      await pgUserService.incrementStats(userId, { completed_goals: 1 });
      await userService.updateUserStreak(userId);
    }
    
    // Create completion activity (global) - include completion details in metadata
    await Activity.createActivity(
      userId,
      user.name,
      user.username,
      user.avatar_url,
      'goal_completed',
      {
        goalId: completedGoal.id,
        goalTitle: completedGoal.title,
        goalCategory: completedGoal.category,
        completionNote,
        metadata: {
          completionNote: completionNote || '',
          completionAttachmentUrl: completionProof || ''
        }
      },
      { isPublic: completedGoal.is_public }
    );
    
    // Mirror into community feed if a community item references this goal
    try {
      const CommunityItem = require('../models/CommunityItem');
      const CommunityActivity = require('../models/CommunityActivity');
      const link = await CommunityItem.findOne({ type: 'goal', sourceId: goalId, status: 'approved', isActive: true }).select('communityId title').lean();
      if (link && link.communityId) {
        await CommunityActivity.create({
          communityId: link.communityId,
          userId,
          name: user?.name,
          avatar: user?.avatar_url,
          type: 'goal_completed',
          data: { goalId: completedGoal.id, goalTitle: completedGoal.title, goalCategory: completedGoal.category}
        });
      }
    } catch (_) {}
    
    return completedGoal;
  }
  
  /**
   * Toggle goal completion status
   */
  async toggleGoal(goalId, userId) {
    const goal = await pgGoalService.getGoalById(goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Check ownership
    if (goal.user_id !== userId) {
      throw new Error('Access denied');
    }
    
    if (goal.completed) {
      // Prevent uncompleting goals - once completed, goals cannot be undone
      throw new Error('Completed goals cannot be uncompleted');
    } else {
      // Complete the goal
      return await this.completeGoal(goalId, userId);
    }
  }
  
  /**
   * Get yearly goals for a user
   */
  async getYearlyGoals(userId, year, requestingUserId) {
    // Check if user can view these goals
    if (userId !== requestingUserId) {
      const user = await pgUserService.getUserById(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }
    }
    
    // Get goals for this year from PostgreSQL
    const result = await pgGoalService.getUserGoals({
      userId,
      year,
      page: 1,
      limit: 1000 // Get all for the year
    });
    
    const goals = result.goals;
    
    // Group goals by month
    const monthlyGoals = {};
    goals.forEach(goal => {
      const month = new Date(goal.created_at).getMonth();
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
    const { limit = 10, category, days = 7 } = params;

    const result = await pgGoalService.getTrendingGoals({
      category,
      page: 1,
      limit: parseInt(limit),
      days: parseInt(days)
    });

    return result.goals;
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
      username,
      days = 7
    } = params;

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const parsedPage = Math.max(1, parseInt(page));

    // For category strategy, pass category directly
    if (strategy === 'category' && category) {
      return await pgGoalService.getTrendingGoals({
        category,
        page: parsedPage,
        limit: parsedLimit,
        days: parseInt(days)
      });
    }

    // For personalized, get user interests and query multiple categories
    if (strategy === 'personalized' && username) {
      const pgUser = await pgUserService.findByUsername(username);
      if (pgUser) {
        const prefs = await UserPreferences.findOne({ userId: pgUser.id }).select('interests').lean();
        const interests = Array.isArray(prefs && prefs.interests) ? prefs.interests : [];
        
        // Map interests to goal categories
        const catSet = new Set();
        for (const i of interests) {
          catSet.add(mapInterestToCategory(i));
        }
        const interestCategories = Array.from(catSet);
        
        // If user has interests, fetch trending goals for those categories
        if (interestCategories.length > 0) {
          // For now, use first category (could be enhanced to fetch from multiple)
          return await pgGoalService.getTrendingGoals({
            category: interestCategories[0],
            page: parsedPage,
            limit: parsedLimit,
            days: parseInt(days)
          });
        }
      }
    }

    // Default: global trending
    return await pgGoalService.getTrendingGoals({
      page: parsedPage,
      limit: parsedLimit,
      days: parseInt(days)
    });
  }
  
  /**
   * Search goals
   */
  async searchGoals(searchTerm, params = {}) {
    const { limit = 20, page = 1, category, interest, requestingUserId } = params;

    // Ensure searchTerm is a string before using trim()
    let t = '';
    if (typeof searchTerm === 'string') {
      t = searchTerm.trim().toLowerCase();
    } else if (searchTerm && typeof searchTerm === 'object' && searchTerm.q) {
      t = String(searchTerm.q).trim().toLowerCase();
    } else {
      t = String(searchTerm || '').trim().toLowerCase();
    }
    const hasText = t.length >= 2;
    const escapeRegex = (s) => String(s || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const safe = hasText ? escapeRegex(t) : '';

    // Get blocked user IDs and following IDs
    let blockedUserIds = [];
    let followingIds = [];
    
    if (requestingUserId) {
      const pgBlockService = require('./pgBlockService');
      const pgFollowService = require('./pgFollowService');
      
      const [blockedOut, blockedIn, following] = await Promise.all([
        pgBlockService.getBlockedUserIds(requestingUserId),
        pgBlockService.getBlockerUserIds(requestingUserId),
        pgFollowService.getFollowingIds(requestingUserId)
      ]);
      
      // Combine blocked users (both directions)
      blockedUserIds = [...blockedOut, ...blockedIn];
      followingIds = following;
      
      // Add requesting user to blocked list to exclude their own goals
      blockedUserIds.push(requestingUserId);
    }

    // Build optimized base match query (uses compound index)
    // Build SQL query for PostgreSQL
    const { query: pgQuery } = require('../config/supabase');
    
    // Build WHERE conditions
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Base conditions
    conditions.push(`g.is_public = true`);

    // Category filter
    if (category) {
      conditions.push(`g.category = $${paramIndex++}`);
      values.push(category);
    } else if (interest) {
      const mappedCategory = mapInterestToCategory(interest);
      conditions.push(`g.category = $${paramIndex++}`);
      values.push(mappedCategory);
    }

    // Text search filter
    if (hasText) {
      conditions.push(`g.title ILIKE $${paramIndex++}`);
      values.push(`%${t}%`);
    }

    // Exclude blocked users and requesting user
    if (blockedUserIds.length > 0) {
      conditions.push(`g.user_id != ALL($${paramIndex++})`);
      values.push(blockedUserIds);
    }

    // Privacy filter: show public users OR users I follow
    const privacyConditions = [];
    privacyConditions.push(`u.is_private = false`); // Public users
    
    if (followingIds.length > 0) {
      privacyConditions.push(`u.id = ANY($${paramIndex++})`); // Users I follow
      values.push(followingIds);
    }
    
    conditions.push(`(${privacyConditions.join(' OR ')})`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      ${whereClause}
    `;

    // Data query with pagination
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const dataSql = `
      SELECT 
        g.id,
        g.title,
        g.category,
        g.completed_at as "completedAt",
        g.target_date as "targetDate",
        g.created_at as "createdAt",
        u.id as "userId",
        u.name as "userName",
        u.username,
        u.avatar_url as "userAvatar"
      FROM goals g
      INNER JOIN users u ON g.user_id = u.id
      ${whereClause}
      ORDER BY g.completed_at DESC NULLS LAST, g.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [countResult, dataResult] = await Promise.all([
      pgQuery(countSql, values),
      pgQuery(dataSql, values)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);
    const goals = dataResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      completedAt: row.completedAt,
      targetDate: row.targetDate,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        name: row.userName,
        username: row.username,
        avatar: row.userAvatar
      }
    }));

    
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