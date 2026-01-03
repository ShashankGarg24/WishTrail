const { validationResult } = require('express-validator');
const goalService = require('../services/goalService');
const pgGoalService = require('../services/pgGoalService');
const pgUserService = require('../services/pgUserService');
const pgLikeService = require('../services/pgLikeService');
const pgHabitService = require('../services/pgHabitService');
const mongoose = require('mongoose');
const { sanitizeGoalsForProfile } = require('../utility/sanitizer');
const GoalDetails = require('../models/extended/GoalDetails');
const { getCurrentDateInTimezone } = require('../utility/timezone');
// @desc    Search goals (completed, discoverable, public users)
// @route   GET /api/v1/goals/search?q=&category=&interest=&page=&limit=
// @access  Private
const searchGoals = async (req, res, next) => {
  try {
    const { q = '', category, interest, page = 1, limit = 20 } = req.query;

    // Cache only interest-based searches (with or without q)
    // Note: Cache doesn't include user-specific filters (blocking, following)
    const cacheService = require('../services/cacheService');
    const cacheParams = { q, interest, category, page: parseInt(page), limit: parseInt(limit) };
    let cached = null;
    if (interest || category) {
      cached = await cacheService.getGoalSearch(cacheParams);
    }

    let payload = cached;
    if (!payload) {
      payload = await goalService.searchGoals(q, { 
        category, 
        interest, 
        page, 
        limit,
        requestingUserId: req.user.id // Pass user ID for privacy/blocking filters
      });
      if (interest || category) {
        await cacheService.setGoalSearch(payload, cacheParams);
      }
    }

    return res.status(200).json({ success: true, data: payload, fromCache: !!cached });
  } catch (err) {
    next(err);
  }
};
const Activity = require('../models/Activity');
const ActivityComment = require('../models/ActivityComment');
const { createCanvas } = require('canvas');
const goalDivisionService = require('../services/goalDivisionService');
// @desc    Get goal post details for modal (Instagram-like)
// @route   GET /api/v1/goals/:id/post
// @access  Private (visible per visibility rules)
const getGoalPost = async (req, res, next) => {
  try {
    const goal = await pgGoalService.getGoalById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    // Get extended details from MongoDB
    const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();
    
    // Visibility: owner or public share or follower-only if you add such logic later
    const isOwner = String(goal.user_id) === String(req.user.id);
    if (!isOwner) {
      // Check if user is active (PostgreSQL)
      const user = await pgUserService.getUserById(goal.user_id);
      if (!user || !user.is_active) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Determine shareable content
    const shareNote = goalDetails?.shareCompletionNote ? (goalDetails.completionNote || '') : '';
    const shareImage = goalDetails?.shareCompletionNote ? (goalDetails.completionAttachmentUrl || '') : '';


    // Latest comments count

    // Note: Activities in MongoDB still have old ObjectId references for goalId
    // PostgreSQL goals won't have matching Activity documents until activities are migrated
    // Skip Activity queries for now since data.goalId in Activity is ObjectId but goals are now BigInt in PostgreSQL
    let likeCount = goal.like_count || 0;
    let isLiked = false;
    let commentCount = 0;

    // Build timeline from activities related to this goal
    // TODO: Migrate Activity.data.goalId to store PostgreSQL BigInt IDs
    const timelineActivities = [];

    const timeline = timelineActivities.map(act => ({
      type: act.type,
      timestamp: act.createdAt,
      data: {
        name: act.data?.subGoalTitle || act.data?.habitName || null,
        linkedGoalId: act.data?.linkedGoalId || null
      }
    }));

    // ✅ Enrich sub-goals with real completion date
    let enrichedSubGoals = [];
    if (goalDetails?.subGoals && goalDetails.subGoals.length > 0) {
      const linkedIds = goalDetails.subGoals.map(sg => sg.linkedGoalId).filter(Boolean);
      const linkedGoals = await pgGoalService.getGoalsByIds(linkedIds);

      const linkedMap = {};
      for (const lg of linkedGoals) {
        linkedMap[String(lg.id)] = lg;
      }

      enrichedSubGoals = goalDetails.subGoals.map(sg => {
        const linked = sg.linkedGoalId ? linkedMap[String(sg.linkedGoalId)] : null;
        return {
          title: sg.title,
          linkedGoalId: sg.linkedGoalId,
          weight: sg.weight,
          completed: sg.completed,
          completedAt: linked?.completed_at ? linked.completed_at : sg.completedAt || null,
          description: sg.description
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        goal: {
          id: goal.id,
          title: goal.title,
          description: goalDetails?.description || '',
          category: goal.category,
          completedAt: goal.completed_at,
          subGoals: enrichedSubGoals,
          timeline: timeline
        },
        user: {
          id: goal.user_id,
          name: goal.user_name,
          avatar: goal.user_avatar,
          username: goal.username,
        },
        share: {
          note: shareNote,
          image: shareImage,
        },
        social: {
          likeCount,
          isLiked,
          commentCount,
          activityId: null // TODO: Update when Activity.data.goalId is migrated to PostgreSQL IDs
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's goals
// @route   GET /api/v1/goals
// @access  Private
const getGoals = async (req, res, next) => {
  try {
    const { year, category, status, page = 1, limit = 10, includeProgress, communityOnly, q, search, filter = 'all', sort = 'newest' } = req.query;
    
    // If there's a search query, do simple user-specific search
    const searchQuery = q || search;
    if (searchQuery) {
      let completedFilter = undefined;
      if (status === 'completed' || filter === 'completed') completedFilter = true;
      if (status === 'pending' || filter === 'in-progress') completedFilter = false;
      
      // Get goals from PostgreSQL
      const result = await pgGoalService.getUserGoals({
        userId: req.user.id,
        year: year ? parseInt(year) : undefined,
        category,
        completed: completedFilter,
        page,
        limit,
        sort
      });
      
      // Filter by search query in-memory (or enhance pgGoalService to support search)
      const rawGoals = result.goals.filter(g => 
        g.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
      
      // Filter by communityOnly if needed
      let filteredGoals = rawGoals;
      if (communityOnly === 'true' || communityOnly === true) {
        const goalIds = rawGoals.map(g => g.id);
        const detailsWithCommunity = await GoalDetails.find({
          goalId: { $in: goalIds },
          'communityInfo': { $exists: true },
          isActive: true
        }).select('goalId').lean();
        const communityGoalIds = new Set(detailsWithCommunity.map(d => d.goalId));
        filteredGoals = rawGoals.filter(g => communityGoalIds.has(g.id));
      }

      const goals = [];
      const wantProgress = String(includeProgress) === 'true';
      const goalIds = filteredGoals.map(g => g.id);
      const detailsMap = {};
      if (goalIds.length > 0) {
        const details = await GoalDetails.find({ goalId: { $in: goalIds }, isActive: true }).lean();
        details.forEach(d => { detailsMap[d.goalId] = d; });
      }
      
      for (const g of filteredGoals) {
        const obj = {
          id: g.id,
          userId: g.user_id,
          title: g.title,
          category: g.category,
          year: g.year,
          targetDate: g.target_date,
          completed: g.completed,
          completedAt: g.completed_at,
          isPublic: g.is_public,
          isDiscoverable: g.is_discoverable,
          likeCount: g.like_count,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
          description: detailsMap[g.id]?.description || '',
          subGoals: detailsMap[g.id]?.subGoals || [],
          habitLinks: detailsMap[g.id]?.habitLinks || []
        };
        
        if (wantProgress) {
          try {
            const progress = await goalDivisionService.computeGoalProgress(g.id, req.user.id);
            obj.progress = progress;
          } catch (_) { obj.progress = { percent: 0, breakdown: { subGoals: [], habits: [] } }; }
        }
        goals.push(obj);
      }
      
      const total = result.pagination.total;
      const sanitizedGoals = wantProgress ? goals : sanitizeGoalsForProfile(goals);
      
      return res.status(200).json({
        success: true,
        data: {
          goals: sanitizedGoals,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    }

    let completedFilter = undefined;
    if (status === 'completed' || filter === 'completed') completedFilter = true;
    if (status === 'pending' || filter === 'in-progress') completedFilter = false;
    
    // Get goals from PostgreSQL
    const result = await pgGoalService.getUserGoals({
      userId: req.user.id,
      year: year ? parseInt(year) : undefined,
      category,
      completed: completedFilter,
      page,
      limit,
      sort
    });
    
    let rawGoals = result.goals;
    
    // Community-only filter
    if (communityOnly === 'true' || communityOnly === true) {
      const goalIds = rawGoals.map(g => g.id);
      const detailsWithCommunity = await GoalDetails.find({
        goalId: { $in: goalIds },
        'communityInfo': { $exists: true },
        isActive: true
      }).select('goalId').lean();
      const communityGoalIds = new Set(detailsWithCommunity.map(d => d.goalId));
      rawGoals = rawGoals.filter(g => communityGoalIds.has(g.id));
    }

    // add virtual fields and optional computed progress
    const goals = [];
    const wantProgress = String(includeProgress) === 'true';
    
    // Get extended details from MongoDB
    const goalIds = rawGoals.map(g => g.id);
    const detailsMap = {};
    if (goalIds.length > 0) {
      const details = await GoalDetails.find({ goalId: { $in: goalIds }, isActive: true }).lean();
      details.forEach(d => { detailsMap[d.goalId] = d; });
    }
    
    for (const g of rawGoals) {
      const obj = {
        id: g.id,
        userId: g.user_id,
        title: g.title,
        category: g.category,
        year: g.year,
        targetDate: g.target_date,
        completed: g.completed,
        completedAt: g.completed_at,
        isPublic: g.is_public,
        isDiscoverable: g.is_discoverable,
        likeCount: g.like_count,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        description: detailsMap[g.id]?.description || '',
        subGoals: detailsMap[g.id]?.subGoals || [],
        habitLinks: detailsMap[g.id]?.habitLinks || []
      };
      
      if (wantProgress) {
        try {
          const progress = await goalDivisionService.computeGoalProgress(g.id, req.user.id);
          obj.progress = progress;
        } catch (_) { obj.progress = { percent: 0, breakdown: { subGoals: [], habits: [] } }; }
      }
      goals.push(obj);
    }
    const total = result.pagination.total;

    // ✅ Sanitize goals - use minimal fields when not requesting progress (profile view)
    const sanitizedGoals = wantProgress ? goals : sanitizeGoalsForProfile(goals);

    res.status(200).json({
      success: true,
      data: {
        goals: sanitizedGoals,
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

// @desc    Get single goal
// @route   GET /api/v1/goals/:id
// @access  Private
const getGoal = async (req, res, next) => {
  try {
    const goal = await pgGoalService.getGoalById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check if user owns goal or if goal is from followed user
    if (goal.user_id.toString() !== req.user.id.toString()) {
      // Check if user follows the goal owner
      const isFollowing = await User.findById(req.user.id).select('following');
      if (!isFollowing.following.includes(goal.user_id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get extended details from MongoDB
    const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();
    
    // Combine PostgreSQL and MongoDB data
    const combinedGoal = {
      id: goal.id,
      userId: goal.user_id,
      title: goal.title,
      category: goal.category,
      year: goal.year,
      targetDate: goal.target_date,
      completed: goal.completed,
      completedAt: goal.completed_at,
      isPublic: goal.is_public,
      isDiscoverable: goal.is_discoverable,
      likeCount: goal.like_count,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      description: goalDetails?.description || '',
      subGoals: goalDetails?.subGoals || [],
      habitLinks: goalDetails?.habitLinks || [],
      completionNote: goalDetails?.completionNote || '',
      completionAttachmentUrl: goalDetails?.completionAttachmentUrl || '',
      shareCompletionNote: goalDetails?.shareCompletionNote || false
    };

    const wantProgress = String(req.query.includeProgress) === 'true';
    let progress = undefined;
    if (wantProgress) {
      try { progress = await goalDivisionService.computeGoalProgress(goal.id, req.user.id); } catch (_) { /* ignore */ }
    }
    res.status(200).json({ success: true, data: { goal: combinedGoal, progress } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new goal
// @route   POST /api/v1/goals
// @access  Private
const createGoal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, category, targetDate, year, subGoals, habitLinks } = req.body;
    const isPublicFlag = (req.body.isPublic === true || req.body.isPublic === 'true') ? true : false;
    const isDiscoverableFlag = (req.body.isDiscoverable === true || req.body.isDiscoverable === 'true') ? true : false;

    // Check daily goal creation limit (max 5 per day)
    const dailyCheck = await pgGoalService.checkDailyLimit(req.user.id, 5);
    if (!dailyCheck.canCreate) {
      return res.status(400).json({
        success: false,
        message: 'Daily goal creation limit reached (5 goals per day)'
      });
    }

    // Check year limit (max 50 goals per year)
    const currentYear = year || new Date().getFullYear();
    const yearCheck = await pgGoalService.checkYearlyLimit(req.user.id, currentYear, 50);
    if (!yearCheck.canCreate) {
      return res.status(400).json({
        success: false,
        message: 'Year goal limit reached (50 goals per year)'
      });
    }

    const session = await mongoose.startSession();
    let createdGoal = null;
    await session.withTransaction(async () => {
      // Create goal in PostgreSQL
      const goal = await pgGoalService.createGoal({
        userId: req.user.id,
        title,
        category,
        year: currentYear,
        targetDate,
        isPublic: isPublicFlag,
        isDiscoverable: isDiscoverableFlag
      });

      // Prepare sub-goals and habit links
      const processedSubGoals = Array.isArray(subGoals) && subGoals.length > 0
        ? subGoals.map(sg => ({
            title: String(sg.title || '').trim(),
            linkedGoalId: sg.linkedGoalId || undefined,
            weight: Number(sg.weight || 0),
            completed: false,
            completedAt: sg.completedAt || undefined,
            description: sg.description || ''
          }))
        : [];

      const processedHabitLinks = Array.isArray(habitLinks) && habitLinks.length > 0
        ? habitLinks.map(hl => ({
            habitId: hl.habitId,
            habitName: hl.habitName || 'Habit',
            weight: Number(hl.weight || 0),
            endDate: hl.endDate || undefined
          }))
        : [];

      // Create extended details in MongoDB
      await GoalDetails.create([{
        goalId: goal.id,
        description: description || '',
        subGoals: processedSubGoals,
        habitLinks: processedHabitLinks,
        isActive: true
      }], { session });

      createdGoal = {
        id: goal.id,
        userId: goal.user_id,
        title: goal.title,
        category: goal.category,
        year: goal.year,
        targetDate: goal.target_date,
        completed: goal.completed,
        isPublic: goal.is_public,
        isDiscoverable: goal.is_discoverable,
        description: description || '',
        subGoals: processedSubGoals,
        habitLinks: processedHabitLinks,
        createdAt: goal.created_at
      };

      // Update total_goals count in PostgreSQL
      await pgUserService.incrementStats(req.user.id, { 
        total_goals: 1
      });

      // Get user data from PostgreSQL
      const currentUser = await pgUserService.findById(req.user.id);
      await Activity.createOrUpdateGoalActivity(
        req.user.id,
        currentUser.name,
        currentUser.username,
        currentUser.avatar_url,
        'created',
        {
          goalId: goal.id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          subGoalsCount: processedSubGoals.length,
          completedSubGoalsCount: 0
        }
      );
    });
    session.endSession();

    res.status(201).json({
      success: true,
      data: { goal: createdGoal }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update goal
// @route   PUT /api/v1/goals/:id
// @access  Private
const updateGoal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const goal = await pgGoalService.getGoalById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check ownership
    if (goal.user_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // // Disallow editing if this goal is used by a community item (community-owned)
    // try {
    //   const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).select('communityInfo').lean();
    //   if (goalDetails?.communityInfo) {
    //     return res.status(400).json({ success: false, message: 'Community goals cannot be edited' });
    //   }
    // } catch { }

    // Don't allow updating completed goals
    if (goal.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed goals'
      });
    }

    const { title, description, category, targetDate, subGoals, habitLinks } = req.body;
    const isPublicFlag = (req.body.isPublic === true || req.body.isPublic === 'true') ? true : goal.is_public;
    const isDiscoverableFlag = (req.body.isDiscoverable === true || req.body.isDiscoverable === 'true') ? true : goal.is_discoverable;

    // Update PostgreSQL fields
    const pgUpdates = {};
    if (title) pgUpdates.title = title;
    if (category) pgUpdates.category = category;
    if (targetDate) pgUpdates.target_date = targetDate;
    pgUpdates.is_public = isPublicFlag;
    pgUpdates.is_discoverable = isDiscoverableFlag;

    const updatedGoal = await pgGoalService.updateGoal(req.params.id, req.user.id, pgUpdates);
    if (!updatedGoal) {
      return res.status(404).json({ success: false, message: 'Failed to update goal' });
    }

    // Update MongoDB extended fields
    const mongoUpdates = {};
    if (description !== undefined) mongoUpdates.description = description;

    // Update sub-goals if provided
    if (Array.isArray(subGoals)) {
      mongoUpdates.subGoals = subGoals.length > 0
        ? subGoals.map(sg => ({
            title: String(sg.title || '').trim(),
            linkedGoalId: sg.linkedGoalId || undefined,
            weight: Number(sg.weight || 0),
            completed: sg.completed || false,
            completedAt: sg.completedAt || undefined,
            description: sg.description || ''
          }))
        : [];
    }

    // Update habit links if provided
    if (Array.isArray(habitLinks)) {
      mongoUpdates.habitLinks = habitLinks.length > 0
        ? habitLinks.map(hl => ({
            habitId: hl.habitId,
            habitName: hl.habitName || 'Habit',
            weight: Number(hl.weight || 0),
            endDate: hl.endDate || undefined
          }))
        : [];
    }

    const updatedDetails = await GoalDetails.findOneAndUpdate(
      { goalId: goal.id },
      { $set: mongoUpdates },
      { new: true, upsert: true }
    ).lean();

    // Combine response
    const combinedGoal = {
      id: updatedGoal.id,
      userId: updatedGoal.user_id,
      title: updatedGoal.title,
      category: updatedGoal.category,
      targetDate: updatedGoal.target_date,
      isPublic: updatedGoal.is_public,
      isDiscoverable: updatedGoal.is_discoverable,
      description: updatedDetails.description,
      subGoals: updatedDetails.subGoals,
      habitLinks: updatedDetails.habitLinks,
      updatedAt: updatedGoal.updated_at
    };

    res.status(200).json({
      success: true,
      data: { goal: combinedGoal }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if goal is linked to other goals
// @route   GET /api/v1/goals/:id/dependencies
// @access  Private
const checkGoalDependencies = async (req, res, next) => {
  try {
    const goalId = req.params.id;
    const goal = await pgGoalService.getGoalById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    
    // Check ownership
    if (goal.user_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Find parent goals that have this goal as a subgoal in MongoDB
    const parentGoalDetails = await GoalDetails.find(
      { 'subGoals.linkedGoalId': parseInt(goalId), isActive: true },
      { goalId: 1 }
    ).lean();

    // Get parent goal info from PostgreSQL
    const parentGoalIds = parentGoalDetails.map(d => d.goalId);
    const parentGoals = parentGoalIds.length > 0
      ? await pgGoalService.getGoalsByIds(parentGoalIds)
      : [];

    return res.status(200).json({
      success: true,
      data: {
        hasParents: parentGoals.length > 0,
        parentGoals: parentGoals.map(g => ({ id: g.id, title: g.title }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete goal
// @route   DELETE /api/v1/goals/:id
// @access  Private
const deleteGoal = async (req, res, next) => {
  try {
    // 1. Find and validate goal
    const goal = await pgGoalService.getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Check ownership
    if (goal.user_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const goalId = goal.id;
    const userId = goal.user_id;
    const wasCompleted = goal.completed;

    // 2. Delete all activities related to this goal
    const deletedActivities = await Activity.find({ 'data.goalId': goalId })
      .select('_id')
      .lean();
    const activityIds = deletedActivities.map(a => a._id);

    if (activityIds.length > 0) {
      // Delete activities
      await Activity.deleteMany({ _id: { $in: activityIds } });
      
      // Delete comments on these activities
      await ActivityComment.deleteMany({ activityId: { $in: activityIds } });
      
      // Delete likes on these activities (MongoDB ObjectIds)
      for (const activityId of activityIds) {
        await pgLikeService.deleteLikesByTarget('activity', String(activityId));
      }
    }

    // 3. Delete likes on the goal itself (PostgreSQL goal ID)
    await pgLikeService.deleteLikesByTarget('goal', goalId);

    // 4. Delete notifications related to this goal (MongoDB)
    await Notification.deleteMany({ 
      'data.goalId': goalId 
    });

    // 5. Unlink habits from this goal (PostgreSQL)
    await pgHabitService.unlinkHabitsFromGoal(goalId);

    // 6. Remove this goal from other goals' subGoals and normalize weights
    const parentGoalDetails = await GoalDetails.find({ 'subGoals.linkedGoalId': goalId, isActive: true });
    for (const parentDetail of parentGoalDetails) {
      // Remove the subgoal
      parentDetail.subGoals = parentDetail.subGoals.filter(
        sg => sg.linkedGoalId !== goalId
      );
      
      // Normalize weights if there are remaining subgoals or habitLinks
      const totalItems = parentDetail.subGoals.length + (parentDetail.habitLinks?.length || 0);
      if (totalItems > 0) {
        const currentSubGoalWeight = parentDetail.subGoals.reduce((sum, sg) => sum + (sg.weight || 0), 0);
        const currentHabitWeight = (parentDetail.habitLinks || []).reduce((sum, hl) => sum + (hl.weight || 0), 0);
        const currentTotal = currentSubGoalWeight + currentHabitWeight;
        
        if (currentTotal > 0) {
          // Normalize all weights proportionally to sum to 100
          const scale = 100 / currentTotal;
          parentDetail.subGoals.forEach(sg => {
            sg.weight = Math.round((sg.weight || 0) * scale);
          });
          if (parentDetail.habitLinks) {
            parentDetail.habitLinks.forEach(hl => {
              hl.weight = Math.round((hl.weight || 0) * scale);
            });
          }
        }
      }
      
      await parentDetail.save();
    }

    // 7. Handle community-related cleanup
    const goalDetails = await GoalDetails.findOne({ goalId, isActive: true });
    // if (goal.is_community_source) {
    //   // This is a source goal - deactivate all mirrors in MongoDB
    //   await GoalDetails.updateMany(
    //     { 'communityInfo.sourceId': goalId },
    //     { $set: { isActive: false } }
    //   );
      
    //   // Deactivate community items that reference this goal
    //   await CommunityItem.updateMany(
    //     { type: 'goal', sourceId: goalId },
    //     { $set: { isActive: false } }
    //   );
    // }

    // // 8. Delete community activities related to this goal
    // await CommunityActivity.deleteMany({ 
    //   'data.goalId': goalId 
    // });

    // 9. Update user statistics in PostgreSQL
    const decrements = { 
      total_goals: -1
    };
    
    if (wasCompleted) {
      decrements.completed_goals = -1;
    }
    
    await pgUserService.incrementStats(userId, decrements);

    // dailyCompletions tracking is deprecated (was in MongoDB User model)

    // 10. Delete the goal itself from PostgreSQL (soft delete)
    await pgGoalService.deleteGoal(goalId, userId);

    // 11. Delete extended data from MongoDB (soft delete)
    await GoalDetails.updateOne({ goalId }, { $set: { isActive: false } });

    // 12. Invalidate caches
    try {
      const cacheService = require('../services/cacheService');
      // await cacheService.invalidateTrendingGoals();
      // await cacheService.invalidatePattern('goals:*');
      // await cacheService.invalidatePattern('user:*');
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    next(error);
  }
};

// @desc    Toggle goal completion
// @route   PATCH /api/v1/goals/:id/toggle
// @access  Private
const toggleGoalCompletion = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      })
    }
    const { completionNote, shareCompletionNote: shareCompletionNoteRaw, attachmentUrl } = req.body
    
    // Validate completion note: must have at least 10 words
    if (completionNote) {
      const wordCount = completionNote.trim().split(/\s+/).filter(word => word.length > 0).length
      if (wordCount < 10) {
        return res.status(400).json({
          success: false,
          message: 'Completion note must contain at least 10 words'
        })
      }
    }
    
    const session = await mongoose.startSession();
    let resultGoal = null;
    await session.withTransaction(async () => {
      const goal = await pgGoalService.getGoalById(req.params.id);
      if (!goal) {
        throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
      }
      console.log('Toggling completion for goal:', goal.user_id, 'Current completed status:', req.user.id, goal.completed);
      // Compare as numbers (PostgreSQL IDs are integers)
      if (Number(goal.user_id) !== Number(req.user.id)) {
        throw Object.assign(new Error('Access denied'), { statusCode: 403 });
      }

      const shareCompletionNote = String(shareCompletionNoteRaw) === 'true' || shareCompletionNoteRaw === true
      
      // Get user's timezone to calculate correct "today"
      const pgUser = await pgUserService.getUserById(req.user.id);
      const userTimezone = pgUser?.timezone || 'UTC';
      const todayKey = getCurrentDateInTimezone(userTimezone);

      // Daily completions tracking is deprecated (was in MongoDB User model)
      // TODO: Implement daily completions tracking in a separate collection or PostgreSQL

      if (goal.completed) {
        // UNCOMPLETE - BLOCKED
        // Prevent uncompleting goals - once completed, goals cannot be undone
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: 'Completed goals cannot be uncompleted' 
        });

        await Activity.deleteOne({ userId: req.user.id, type: 'goal_completed', 'data.goalId': goal.id }).session(session);

        resultGoal = await pgGoalService.getGoalById(goal.id);
      } else {
        // COMPLETE
        // Daily completions check is deprecated (was in MongoDB User model)
        // TODO: Implement daily completions tracking in separate collection if needed

        // Complete goal in PostgreSQL
        const updated = await pgGoalService.completeGoal(goal.id, req.user.id);
        if (!updated) {
          throw Object.assign(new Error('Goal state changed, please retry'), { statusCode: 409 });
        }

        // Update completion details in MongoDB
        await GoalDetails.findOneAndUpdate(
          { goalId: goal.id },
          {
            $set: {
              completionNote: completionNote || '',
              shareCompletionNote: !!shareCompletionNote,
              completionAttachmentUrl: attachmentUrl || ''
            }
          },
          { upsert: true, session }
        );

        // completedGoals count and dailyCompletions tracking deprecated (were in MongoDB User model)
        // TODO: Implement in separate MongoDB collection or PostgreSQL if needed

        // Get goal details for activity
        const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).session(session);

        await Activity.createOrUpdateGoalActivity(
          req.user.id,
          pgUser.name,
          pgUser.username,
          pgUser.avatar_url,
          'completed',
          {
            goalId: goal.id,
            goalTitle: goal.title,
            goalCategory: goal.category,
            completionNote: shareCompletionNote ? (completionNote || '') : '',
            completionAttachmentUrl: attachmentUrl || '',
            subGoalsCount: goalDetails?.subGoals?.length || 0,
            completedSubGoalsCount: (goalDetails?.subGoals || []).filter(sg => sg.completed).length
          },
          { isPublic: !!shareCompletionNote }
        );

        // Mention detection in completion note (if public)
        try {
          if (shareCompletionNote && completionNote) {
            const mentionMatches = (completionNote.match(/@([a-zA-Z0-9._-]{3,20})/g) || []).map(m => m.slice(1).toLowerCase());
            if (mentionMatches.length > 0) {
              const U = require('../models/User');
              const users = await U.find({ username: { $in: mentionMatches } }).select('_id').lean();
              const mentionedIds = Array.from(new Set(users.map(u => String(u._id))));
              
              // Get the activity for mention notifications
              const savedActivity = await Activity.findOne({
                userId: user._id,
                'data.goalId': goal.id,
                type: 'goal_activity'
              }).lean();
              
              if (savedActivity) {
                await Promise.all(mentionedIds
                  .filter(uid => uid !== String(user._id))
                  .map(uid => Notification.createMentionNotification(user._id, uid, { activityId: savedActivity._id }))
                );
              }
            }
          }
        } catch (_) { }

        // Combine PostgreSQL and MongoDB data for result
        resultGoal = {
          id: updated.id,
          userId: updated.user_id,
          title: updated.title,
          category: updated.category,
          completed: updated.completed,
          completedAt: updated.completed_at,
          completionNote: completionNote || '',
          shareCompletionNote: !!shareCompletionNote,
          completionAttachmentUrl: attachmentUrl || ''
        };
      }
    });
    session.endSession();

    return res.status(200).json({ success: true, data: { goal: resultGoal } });
  } catch (error) {
    if (error && error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error)
  }
}



// @desc    Like/unlike goal
// @route   PATCH /api/v1/goals/:id/like
// @access  Private
const toggleGoalLike = async (req, res, next) => {
  try {
    const goal = await pgGoalService.getGoalById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Don't allow liking own goals
    if (goal.user_id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot like your own goal'
      });
    }

    const result = await pgLikeService.toggleLike(req.user.id, 'goal', goal.id);

    res.status(200).json({
      success: true,
      data: {
        isLiked: result.isLiked,
        likeCount: result.likeCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's yearly goals summary
// @route   GET /api/v1/goals/yearly/:year
// @access  Private
const getYearlyGoalsSummary = async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.query.userId || req.user.id;

    // If viewing another user's goals, check if following
    if (userId !== req.user.id) {
      const user = await User.findById(req.user.id).select('following');
      if (!user.following.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const summary = await pgGoalService.getYearlyGoalsSummary(userId, year);
    
    // Get actual goals for this year
    const result = await pgGoalService.getUserGoals({
      userId,
      year,
      page: 1,
      limit: 1000 // Get all goals for the year
    });

    res.status(200).json({
      success: true,
      data: { summary, goals: result.goals }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get shareable goal data for social media
// @route   GET /api/v1/goals/:id/share
// @access  Public
const getShareableGoal = async (req, res, next) => {
  try {
    const goal = await pgGoalService.getGoalById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      })
    }

    // Get extended details
    const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();

    // Check if goal is shareable (public and completed)
    if (!goal.is_public) {
      return res.status(403).json({
        success: false,
        message: 'This goal is not shareable'
      })
    }

    // Only share completed goals
    if (!goal.completed) {
      return res.status(403).json({
        success: false,
        message: 'Only completed goals can be shared'
      })
    }

    // Prepare shareable data
    const shareableData = {
      goal: {
        id: goal.id,
        title: goal.title,
        description: goalDetails?.description || '',
        category: goal.category,
        completed: goal.completed,
        completedAt: goal.completed_at,
        completionNote: goalDetails?.shareCompletionNote ? goalDetails.completionNote : null
      },
      user: {
        id: goal.user_id,
        name: goal.user_name,
        avatar: goal.user_avatar
      },
      shareUrl: `${req.protocol}://${req.get('host')}/users/${goal.user_id}`,
      openGraph: {
        title: `${goal.user_name} achieved their goal: ${goal.title}`,
        description: goalDetails?.shareCompletionNote && goalDetails.completionNote
          ? `${goalDetails.completionNote.substring(0, 150)}...`
          : `${goal.category} goal completed successfully on ${new Date(goal.completed_at).toLocaleDateString()}`,
        image: `${req.protocol}://${req.get('host')}/api/v1/goals/${goal.id}/og-image`,
        url: `${req.protocol}://${req.get('host')}/users/${goal.user_id}`,
        type: 'article',
        site_name: 'WishTrail',
        locale: 'en_US'
      }
    }

    res.status(200).json({
      success: true,
      data: shareableData
    })
  } catch (error) {
    next(error)
  }
};


// @desc    Generate Open Graph image for goal sharing
// @route   GET /api/v1/goals/:id/og-image
// @access  Public
const generateOGImage = async (req, res, next) => {
  try {
    const goal = await pgGoalService.getGoalById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      })
    }

    // Check if goal is shareable
    if (!goal.is_public || !goal.completed) {
      return res.status(403).json({
        success: false,
        message: 'This goal is not shareable'
      })
    }

    // Create canvas
    const width = 1200
    const height = 630
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')


    // Custom roundRect function
    const roundRect = (x, y, width, height, radius) => {
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    }

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(0.5, '#764ba2')
    gradient.addColorStop(1, '#f093fb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (let i = 0; i < width; i += 40) {
      for (let j = 0; j < height; j += 40) {
        ctx.fillRect(i, j, 20, 20)
      }
    }

    // Main content background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    roundRect(60, 60, width - 120, height - 120, 20)
    ctx.fill()

    // Header section
    ctx.fillStyle = '#2d3748'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🎉 Goal Achieved!', width / 2, 150)

    // Goal title
    ctx.fillStyle = '#1a202c'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'

    // Word wrap for long titles
    const maxWidth = width - 200
    const words = goal.title.split(' ')
    let line = ''
    let y = 220

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const testWidth = ctx.measureText(testLine).width
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(`"${line}"`, width / 2, y)
        line = words[n] + ' '
        y += 45
      } else {
        line = testLine
      }
    }
    ctx.fillText(`"${line}"`, width / 2, y)

    // Category and completion info
    ctx.fillStyle = '#4a5568'
    ctx.font = '28px Arial'
    ctx.textAlign = 'center'

    const categoryText = `${goal.category} • Completed ${new Date(goal.completed_at).toLocaleDateString()}`
    ctx.fillText(categoryText, width / 2, y + 60)

    // User info
    ctx.fillStyle = '#2d3748'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`by ${goal.user_name}`, width / 2, y + 120)

    // Footer branding
    ctx.fillStyle = '#667eea'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('WishTrail - Transform your dreams into achievable goals', width / 2, height - 80)

    // Trophy icon (simple drawing)
    ctx.fillStyle = '#f6e05e'
    ctx.beginPath()
    ctx.arc(width / 2, y + 180, 30, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = '#d69e2e'
    ctx.fillRect(width / 2 - 15, y + 190, 30, 20)

    ctx.fillStyle = '#f6e05e'
    ctx.fillRect(width / 2 - 10, y + 200, 20, 10)

    // Set response headers
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day

    // Send image
    const buffer = canvas.toBuffer('image/png')
    res.send(buffer)
  } catch (error) {
    console.error('Error generating OG image:', error)
    next(error)
  }
};


module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  checkGoalDependencies,
  toggleGoalCompletion,
  toggleGoalLike,
  getYearlyGoalsSummary,
  getShareableGoal,
  generateOGImage,
  searchGoals,
  getGoalPost,
  // Goal Division: sub-goals and habit links
  async setSubGoals(req, res, next) {
    try {
      const goalId = req.params.id;
      const subGoals = Array.isArray(req.body?.subGoals) ? req.body.subGoals : [];
      const updated = await goalDivisionService.setSubGoals(goalId, req.user.id, subGoals);
      return res.status(200).json({ success: true, data: { goal: updated } });
    } catch (err) { next(err); }
  },
  async toggleSubGoal(req, res, next) {
    try {
      const goalId = req.params.id;
      const idx = req.params.index;
      const { completed, note } = req.body || {};
      const updated = await goalDivisionService.toggleSubGoal(goalId, req.user.id, idx, completed, note);
      return res.status(200).json({ success: true, data: { goal: updated } });
    } catch (err) { next(err); }
  },
  async setHabitLinks(req, res, next) {
    try {
      const goalId = req.params.id;
      const links = Array.isArray(req.body?.habitLinks) ? req.body.habitLinks : [];
      const updated = await goalDivisionService.setHabitLinks(goalId, req.user.id, links);
      return res.status(200).json({ success: true, data: { goal: updated } });
    } catch (err) { next(err); }
  },
  async getProgress(req, res, next) {
    try {
      const goalId = req.params.id;
      const result = await goalDivisionService.computeGoalProgress(goalId, req.user.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  // @desc    Get trending goals (supports strategy: global | category | personalized)
  // @route   GET /api/v1/goals/trending?strategy=&category=&page=&limit=
  // @access  Private
  async getTrendingGoals(req, res, next) {
    try {
      const cacheService = require('../services/cacheService');
      const goalService = require('../services/goalService');
      const { strategy = 'global', category, page = 1, limit = 20 } = req.query;
      if (strategy === 'category' && !category) {
        return res.status(400).json({ success: false, message: 'category is required for strategy=category' });
      }

      const safeLimit = Math.min(50, Math.max(1, parseInt(limit)));
      const cacheParams = { strategy, category, page: parseInt(page), limit: safeLimit };
      if (strategy === 'personalized') cacheParams.userId = req.user.id;

      const cached = await cacheService.getTrendingGoals(cacheParams);
      if (cached) return res.status(200).json({ success: true, data: cached });

      const result = await goalService.getTrendingGoalsPaged({
        page,
        limit: safeLimit,
        strategy,
        category,
        userId: req.user.username
      });

      const ttl = strategy === 'personalized' ? cacheService.CACHE_TTL.FIVE_MINUTES : cacheService.CACHE_TTL.TEN_MINUTES;
      await cacheService.setTrendingGoals(result, cacheParams, ttl);

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
  // @desc    Get goal analytics data (optimized for analytics page)
  // @route   GET /api/v1/goals/:id/analytics
  // @access  Private
  async getGoalAnalytics(req, res, next) {
    try {
      const goal = await pgGoalService.getGoalById(req.params.id);

      if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

      // Check ownership
      const isOwner = String(goal.user_id) === String(req.user.id);
      if (!isOwner) {
        // If not owner, check if goal is public
        if (!goal.is_public) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      // Get extended details from MongoDB
      const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();

      // Get engagement metrics
      // Note: Activities in MongoDB still have old ObjectId references for goalId
      // PostgreSQL goals won't have matching Activity documents until activities are migrated
      let commentCount = 0;
      let likeCount = goal.like_count || 0;
      
      // Skip Activity queries for now since data.goalId in Activity is ObjectId but goals are now BigInt in PostgreSQL
      // TODO: Migrate Activity.data.goalId to store PostgreSQL BigInt IDs

      // Enrich sub-goals with completion dates
      let enrichedSubGoals = [];
      if (goalDetails?.subGoals && goalDetails.subGoals.length > 0) {
        const linkedIds = goalDetails.subGoals.map(sg => sg.linkedGoalId).filter(Boolean);
        const linkedGoals = await pgGoalService.getGoalsByIds(linkedIds);

        const linkedMap = {};
        for (const lg of linkedGoals) {
          linkedMap[String(lg.id)] = lg;
        }

        enrichedSubGoals = goalDetails.subGoals.map(sg => {
          const linked = sg.linkedGoalId ? linkedMap[String(sg.linkedGoalId)] : null;
          return {
            id: sg.linkedGoalId || null,
            title: linked?.title || sg.title,
            description: sg.description,
            completed: sg.completed,
            completedAt: linked?.completed_at ? linked.completed_at : sg.completedAt || null,
            weight: sg.weight || 0
          };
        });
      }

      // Enrich habit links with habit data
      let enrichedHabits = [];
      if (goalDetails?.habitLinks && goalDetails.habitLinks.length > 0) {
        const habitIds = goalDetails.habitLinks.map(hl => hl.habitId).filter(Boolean);
        const habits = await pgHabitService.getHabitsByIds(habitIds);

        const habitMap = {};
        for (const h of habits) {
          habitMap[String(h.id)] = h;
        }

        enrichedHabits = goalDetails.habitLinks.map(hl => {
          const habit = hl.habitId ? habitMap[String(hl.habitId)] : null;
          return {
            id: hl.habitId,
            habitName: habit?.name || hl.habitName || 'Habit',
            name: habit?.name || hl.habitName || 'Habit',
            description: habit?.description || '',
            weight: hl.weight || 0
          };
        });
      }

      // Compute progress if not already present
      let progressData = goalDetails?.progress || { percent: 0 };
      if (!goalDetails?.progress || !goalDetails.progress.percent) {
        try {
          progressData = await goalDivisionService.computeGoalProgress(goal.id, req.user.id);
        } catch (err) {
          console.error('Error computing progress:', err);
          progressData = { percent: 0 };
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          goal: {
            id: goal.id,
            title: goal.title,
            description: goalDetails?.description || '',
            category: goal.category,
            completed: goal.completed,
            completedAt: goal.completed_at,
            completionNote: goalDetails?.completionNote || '',
            createdAt: goal.created_at,
            targetDate: goal.target_date,
            year: goal.year,
            likeCount: likeCount,
            commentCount: commentCount,
            subGoals: enrichedSubGoals,
            habitLinks: enrichedHabits,
            progress: progressData
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}; 