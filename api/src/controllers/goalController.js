const { validationResult } = require('express-validator');
const goalService = require('../services/goalService');
const mongoose = require('mongoose');
// @desc    Search goals (completed, discoverable, public users)
// @route   GET /api/v1/goals/search?q=&category=&interest=&page=&limit=
// @access  Private
const searchGoals = async (req, res, next) => {
  try {
    const { q = '', category, interest, page = 1, limit = 20 } = req.query;

    // Cache only interest-based searches (with or without q)
    const cacheService = require('../services/cacheService');
    const cacheParams = { q, interest, category, page: parseInt(page), limit: parseInt(limit) };
    let cached = null;
    if (interest || category) {
      cached = await cacheService.getGoalSearch(cacheParams);
    }

    let payload = cached;
    if (!payload) {
      payload = await goalService.searchGoals(q, { category, interest, page, limit });
      if (interest || category) {
        await cacheService.setGoalSearch(payload, cacheParams);
      }
    }

    return res.status(200).json({ success: true, data: payload, fromCache: !!cached });
  } catch (err) {
    next(err);
  }
};
const Goal = require('../models/Goal');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Like = require('../models/Like');
const { createCanvas, loadImage, registerFont } = require('canvas');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const goalDivisionService = require('../services/goalDivisionService');
// @desc    Get goal post details for modal (Instagram-like)
// @route   GET /api/v1/goals/:id/post
// @access  Private (visible per visibility rules)
const getGoalPost = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('userId', 'name avatar username isPrivate isActive')
      .select('title description category completed completedAt shareCompletionNote completionNote completionAttachmentUrl likeCount pointsEarned userId');

    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    // Visibility: owner or public share or follower-only if you add such logic later
    const isOwner = String(goal.userId._id) === String(req.user.id);
    if (!isOwner) {
      // If user is private or goal not shareable, still allow core details
      if (!goal.userId.isActive) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Determine shareable content
    const shareNote = goal.shareCompletionNote ? (goal.completionNote || '') : '';
    const shareImage = goal.shareCompletionNote ? (goal.completionAttachmentUrl || '') : '';

    // Latest comments count
    const Activity = require('../models/Activity');
    const Like = require('../models/Like');
    const ActivityComment = require('../models/ActivityComment');

    // Try to find corresponding activity for this goal
    // Prefer a completion activity; if not present yet, fall back to creation activity
    const activity = await Activity.findOne({
      'data.goalId': goal._id,
      userId: goal.userId._id,
      type: { $in: ['goal_completed', 'goal_created'] }
    }).sort({ createdAt: -1 }).lean();
    let likeCount = goal.likeCount || 0;
    let isLiked = false;
    let commentCount = 0;
    if (activity) {
      likeCount = await Like.getLikeCount('activity', activity._id);
      isLiked = await Like.hasUserLiked(req.user.id, 'activity', activity._id);
      commentCount = await ActivityComment.countDocuments({ activityId: activity._id, isActive: true });
    }

    return res.status(200).json({
      success: true,
      data: {
        goal: {
          _id: goal._id,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          completedAt: goal.completedAt,
          pointsEarned: goal.pointsEarned,
        },
        user: {
          _id: goal.userId._id,
          name: goal.userId.name,
          avatar: goal.userId.avatar,
          username: goal.userId.username,
        },
        share: {
          note: shareNote,
          image: shareImage,
        },
        social: {
          likeCount,
          isLiked,
          commentCount,
          activityId: activity ? activity._id : null
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
    const { year, category, status, page = 1, limit = 10, includeProgress } = req.query;
    
    const query = { userId: req.user.id };
    
    // Add filters
    if (year) query.year = parseInt(year);
    if (category) query.category = category;
    if (status === 'completed') query.completed = true;
    if (status === 'pending') query.completed = false;
    
    const rawGoals = await Goal.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // add virtual fields and optional computed progress
    const goals = [];
    const wantProgress = String(includeProgress) === 'true';
    if (wantProgress) {
      // Compute in sequence to avoid overwhelming DB; can optimize later with batching
      for (const g of rawGoals) {
        const obj = g.toJSON();
        try {
          const progress = await goalDivisionService.computeGoalProgress(g._id, req.user.id);
          obj.progress = progress;
        } catch (_) { obj.progress = { percent: 0, breakdown: { subGoals: [], habits: [] } }; }
        goals.push(obj);
      }
    } else {
      for (const g of rawGoals) goals.push(g.toJSON());
    }
    const total = await Goal.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        goals,
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
    const goal = await Goal.findById(req.params.id).populate('name');
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Check if user owns goal or if goal is from followed user
    if (goal.userId.toString() !== req.user.id.toString()) {
      // Check if user follows the goal owner
      const isFollowing = await User.findById(req.user.id).select('following');
      if (!isFollowing.following.includes(goal.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const wantProgress = String(req.query.includeProgress) === 'true';
    let progress = undefined;
    if (wantProgress) {
      try { progress = await goalDivisionService.computeGoalProgress(goal._id, req.user.id); } catch (_) { /* ignore */ }
    }
    res.status(200).json({ success: true, data: { goal, progress } });
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
    
    const { title, description, category, priority, duration, targetDate, year } = req.body;
    const isPublicFlag = (req.body.isPublic === true || req.body.isPublic === 'true') ? true : false;
    const isDiscoverableFlag = (req.body.isDiscoverable === true || req.body.isDiscoverable === 'true') ? true : false;
    
    // Check daily goal creation limit (max 5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayGoalCount = await Goal.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    if (todayGoalCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Daily goal creation limit reached (5 goals per day)'
      });
    }
    
    // Check year limit (max 50 goals per year)
    const currentYear = year || new Date().getFullYear();
    const yearGoalCount = await Goal.countDocuments({
      userId: req.user.id,
      year: currentYear
    });
    
    if (yearGoalCount >= 50) {
      return res.status(400).json({
        success: false,
        message: 'Year goal limit reached (50 goals per year)'
      });
    }
    
    const session = await mongoose.startSession();
    let createdGoal = null;
    await session.withTransaction(async () => {
      const [goal] = await Goal.create([
        {
          userId: req.user.id,
          title,
          description,
          category,
          priority,
          duration,
          targetDate,
          year: currentYear,
          isPublic: isPublicFlag,
          isDiscoverable: isDiscoverableFlag
        }
      ], { session });
      createdGoal = goal;
      await User.updateOne({ _id: req.user.id }, { $inc: { totalGoals: 1 } }, { session });

      const currentUser = await User.findById(req.user.id).session(session).select('name avatar');
      await Activity.createActivity(
        req.user.id,
        currentUser.name,
        currentUser.avatar,
        'goal_created',
        {
          goalId: goal._id,
          goalTitle: goal.title,
          goalCategory: goal.category
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
    
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Check ownership
    if (goal.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Don't allow updating completed goals
    if (goal.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed goals'
      });
    }
    
    const { title, description, category, priority, duration, targetDate } = req.body;
    const isPublicFlag = (req.body.isPublic === true || req.body.isPublic === 'true') ? true : goal.isPublic;
    const isDiscoverableFlag = (req.body.isDiscoverable === true || req.body.isDiscoverable === 'true') ? true : goal.isDiscoverable;
    
    const updatedGoal = await Goal.findByIdAndUpdate(
      req.params.id,
      { title, description, category, priority, duration, targetDate, isPublic: isPublicFlag, isDiscoverable: isDiscoverableFlag },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: { goal: updatedGoal }
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
    const session = await mongoose.startSession();
    let goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    // Check ownership
    if (goal.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    // Don't allow deleting completed goals
    if (goal.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed goals'
      });
    }
    await session.withTransaction(async () => {
      await Goal.deleteOne({ _id: req.params.id }, { session });
      await User.updateOne({ _id: req.user.id }, { $inc: { totalGoals: -1 } }, { session });
    });
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
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
    const session = await mongoose.startSession();
    let resultGoal = null;
    await session.withTransaction(async () => {
      const goal = await Goal.findById(req.params.id).session(session);
      if (!goal) {
        throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
      }
      if (goal.userId.toString() !== req.user.id.toString()) {
        throw Object.assign(new Error('Access denied'), { statusCode: 403 });
      }

      const user = await User.findById(req.user.id).session(session).select('name avatar dailyCompletions totalPoints completedGoals');

      const shareCompletionNote = String(shareCompletionNoteRaw) === 'true' || shareCompletionNoteRaw === true
      const now = new Date();
      const todayKey = now.toISOString().split('T')[0];

      // Helper to compute points mirroring Goal.calculatePoints
      const computePoints = (g, note) => {
        let points = 0;
        const durationPoints = { 'short-term': 10, 'medium-term': 25, 'long-term': 50 };
        points += durationPoints[g.duration] || 10;
        const priorityMultiplier = { 'high': 1.5, 'medium': 1.0, 'low': 0.7 };
        points *= (priorityMultiplier[g.priority] || 1.0);
        const categoryBonus = {
          'Education & Learning': 8,
          'Career & Business': 7,
          'Financial Goals': 7,
          'Personal Development': 6,
          'Health & Fitness': 5,
          'Creative Projects': 5,
          'Relationships': 5,
          'Family & Friends': 4,
          'Travel & Adventure': 4,
          'Other': 3
        };
        points += (categoryBonus[g.category] || 3);
        if (g.targetDate && now < new Date(g.targetDate)) {
          points += Math.floor(points * 0.2);
        }
        if (note) {
          const wc = String(note).trim().split(/\s+/).filter(Boolean).length;
          if (wc >= 50) points += 10; else if (wc >= 25) points += 5;
        }
        return Math.floor(points);
      };

      // prune dailyCompletions to last 7 days
      try {
        const dc = user.dailyCompletions;
        if (dc && typeof dc.keys === 'function') {
          const nowMid = new Date(); nowMid.setHours(0,0,0,0);
          const keepDays = 7;
          const minKeep = new Date(nowMid.getTime() - (keepDays - 1) * 24 * 60 * 60 * 1000);
          const unsetPaths = {};
          for (const key of dc.keys()) {
            const keyDate = new Date(key);
            if (String(key) && !isNaN(keyDate) && keyDate < minKeep) {
              unsetPaths[`dailyCompletions.${key}`] = "";
            }
          }
          if (Object.keys(unsetPaths).length > 0) {
            await User.updateOne({ _id: user._id }, { $unset: unsetPaths }, { session, strict: false });
          }
        }
      } catch (_) {}

      if (goal.completed) {
        // UNCOMPLETE
        const prevCompletedAt = goal.completedAt ? new Date(goal.completedAt) : null;
        const prevDayKey = prevCompletedAt ? prevCompletedAt.toISOString().split('T')[0] : todayKey;
        const prevPoints = goal.pointsEarned || 0;

        await Goal.updateOne({ _id: goal._id, completed: true }, {
          $set: {
            completed: false,
            completedAt: null,
            completionNote: '',
            pointsEarned: 0,
            shareCompletionNote: true,
            completionAttachmentUrl: ''
          }
        }, { session });

        await User.updateOne({ _id: user._id }, { $inc: { completedGoals: -1, totalPoints: -prevPoints } }, { session });
        const pullKey = `dailyCompletions.${prevDayKey}`;
        await User.updateOne({ _id: user._id }, { $pull: { [pullKey]: { goalId: goal._id } } }, { session });

        await Activity.deleteOne({ userId: user._id, type: 'goal_completed', 'data.goalId': goal._id }).session(session);

        resultGoal = await Goal.findById(goal._id).session(session);
      } else {
        // COMPLETE
        const todayArr = (user.dailyCompletions && user.dailyCompletions.get(todayKey)) || [];
        if ((todayArr?.length || 0) >= 3) {
          throw Object.assign(new Error('Daily completion limit reached (3 goals per day)'), { statusCode: 400 });
        }
        if (goal.isLocked) {
          throw Object.assign(new Error('Goal is currently locked and cannot be completed yet. Please wait for the minimum duration period.'), { statusCode: 400 });
        }

        const points = computePoints(goal, completionNote);
        const setUpdate = {
          completed: true,
          completedAt: now,
          completionNote: completionNote || '',
          shareCompletionNote: !!shareCompletionNote,
          pointsEarned: points
        };
        if (attachmentUrl) setUpdate.completionAttachmentUrl = attachmentUrl;

        const updated = await Goal.findOneAndUpdate(
          { _id: goal._id, userId: user._id, completed: false },
          { $set: setUpdate },
          { new: true, session }
        );
        if (!updated) {
          throw Object.assign(new Error('Goal state changed, please retry'), { statusCode: 409 });
        }

        await User.updateOne({ _id: user._id }, { $inc: { completedGoals: 1, totalPoints: points } }, { session });
        const key = `dailyCompletions.${todayKey}`;
        // Ensure single entry per goal per day: pull then push
        await User.updateOne({ _id: user._id }, { $pull: { [key]: { goalId: goal._id } } }, { session, strict: false });
        await User.updateOne({ _id: user._id }, { $push: { [key]: { goalId: goal._id, completedAt: now } } }, { session, strict: false });

        const metadata = {};
        if (shareCompletionNote && completionNote) metadata.completionNote = completionNote;
        if (attachmentUrl) metadata.completionAttachmentUrl = attachmentUrl;

        const activity = new Activity({
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          type: 'goal_completed',
          isPublic: !!shareCompletionNote,
          data: {
            goalId: goal._id,
            goalTitle: goal.title,
            goalCategory: goal.category,
            pointsEarned: points,
            completionNote: shareCompletionNote ? (completionNote || '') : '',
            completionAttachmentUrl: attachmentUrl || '',
            metadata
          }
        });
        await activity.save({ session });

        // Mention detection in completion note (if public)
        try {
          if (shareCompletionNote && completionNote) {
            const mentionMatches = (completionNote.match(/@([a-zA-Z0-9._-]{3,20})/g) || []).map(m => m.slice(1).toLowerCase());
            if (mentionMatches.length > 0) {
              const U = require('../models/User');
              const users = await U.find({ username: { $in: mentionMatches } }).select('_id').lean();
              const mentionedIds = Array.from(new Set(users.map(u => String(u._id))));
              await Promise.all(mentionedIds
                .filter(uid => uid !== String(user._id))
                .map(uid => Notification.createMentionNotification(user._id, uid, { activityId: activity._id }))
              );
            }
          }
        } catch (_) {}

        resultGoal = updated;
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
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Don't allow liking own goals
    if (goal.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot like your own goal'
      });
    }
    
    const result = await Like.toggleLike(req.user.id, 'goal', goal._id);
    
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
    
    const goals = await Goal.find({ userId, year });
    const completed = goals.filter(g => g.completed);
    const pending = goals.filter(g => !g.completed);
    
    const summary = {
      year,
      total: goals.length,
      completed: completed.length,
      pending: pending.length,
      completionRate: goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0,
      totalPoints: completed.reduce((sum, goal) => sum + goal.pointsEarned, 0),
      categorySummary: {}
    };
    
    // Category breakdown
    goals.forEach(goal => {
      if (!summary.categorySummary[goal.category]) {
        summary.categorySummary[goal.category] = {
          total: 0,
          completed: 0,
          points: 0
        };
      }
      summary.categorySummary[goal.category].total++;
      if (goal.completed) {
        summary.categorySummary[goal.category].completed++;
        summary.categorySummary[goal.category].points += goal.pointsEarned;
      }
    });
    
    res.status(200).json({
      success: true,
      data: { summary, goals }
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
    const goal = await Goal.findById(req.params.id)
      .populate('userId', 'name avatar')
      .select('title description category priority duration completed completedAt completionNote shareCompletionNote isShareable pointsEarned userId')

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      })
    }

    // Check if goal is shareable
    if (!goal.isShareable) {
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
        _id: goal._id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        duration: goal.duration,
        completed: goal.completed,
        completedAt: goal.completedAt,
        completionNote: goal.shareCompletionNote ? goal.completionNote : null,
        pointsEarned: goal.pointsEarned
      },
      user: {
        _id: goal.userId._id,
        name: goal.userId.name,
        avatar: goal.userId.avatar
      },
      shareUrl: `${req.protocol}://${req.get('host')}/users/${goal.userId._id}`,
      openGraph: {
        title: `${goal.userId.name} achieved their goal: ${goal.title}`,
        description: goal.shareCompletionNote && goal.completionNote 
          ? `${goal.completionNote.substring(0, 150)}...`
          : `${goal.category} goal completed successfully on ${new Date(goal.completedAt).toLocaleDateString()}`,
        image: `${req.protocol}://${req.get('host')}/api/v1/goals/${goal._id}/og-image`,
        url: `${req.protocol}://${req.get('host')}/users/${goal.userId._id}`,
        type: 'article',
        site_name: 'WishTrail',
        locale: 'en_US'
      }
    }

    // Update goal with share URL if not already set
    if (!goal.shareUrl) {
      goal.shareUrl = shareableData.shareUrl
      await goal.save()
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
    const goal = await Goal.findById(req.params.id)
      .populate('userId', 'name avatar')
      .select('title category completed completedAt isShareable userId')

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      })
    }

    // Check if goal is shareable
    if (!goal.isShareable || !goal.completed) {
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
    
    const categoryText = `${goal.category} • Completed ${new Date(goal.completedAt).toLocaleDateString()}`
    ctx.fillText(categoryText, width / 2, y + 60)

    // User info
    ctx.fillStyle = '#2d3748'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`by ${goal.userId.name}`, width / 2, y + 120)

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
        userId: req.user.id
      });

      const ttl = strategy === 'personalized' ? cacheService.CACHE_TTL.FIVE_MINUTES : cacheService.CACHE_TTL.TEN_MINUTES;
      await cacheService.setTrendingGoals(result, cacheParams, ttl);

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}; 