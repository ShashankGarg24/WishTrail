const { validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Like = require('../models/Like');

// @desc    Get user's goals
// @route   GET /api/v1/goals
// @access  Private
const getGoals = async (req, res, next) => {
  try {
    const { year, category, status, page = 1, limit = 10 } = req.query;
    
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

    //add virtual fields to the goals (isLocked)
    const goals = rawGoals.map(goal => goal.toJSON()); 
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
    
    res.status(200).json({
      success: true,
      data: { goal }
    });
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
    
    const goal = await Goal.create({
      userId: req.user.id,
      title,
      description,
      category,
      priority,
      duration,
      targetDate,
      year: currentYear
    });
    
    const currentUser = (await User.findById(req.user.id).select('name avatar').lean());

    // Create activity
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
    
    res.status(201).json({
      success: true,
      data: { goal }
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
    
    const updatedGoal = await Goal.findByIdAndUpdate(
      req.params.id,
      { title, description, category, priority, duration, targetDate },
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
    
    // Don't allow deleting completed goals
    if (goal.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed goals'
      });
    }
    
    await Goal.findByIdAndDelete(req.params.id);
    
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

    const { completionNote } = req.body
    const goal = await Goal.findById(req.params.id)
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      })
    }

    if (goal.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    const user = await User.findById(req.user.id)
    const today = new Date().toISOString().split('T')[0]

    let updatedGoal = null

    if (goal.completed) {
      // UNCOMPLETE GOAL

      // Subtract earned points from user's total
      if (goal.pointsEarned) {
        user.totalPoints = Math.max(0, user.totalPoints - goal.pointsEarned)
      }

      // Remove from user's daily completions
      const todayCompletions = user.dailyCompletions.get(today) || []
      const updatedCompletions = todayCompletions.filter(
        comp => comp.goalId.toString() !== goal._id.toString()
      )
      user.dailyCompletions.set(today, updatedCompletions)

      await user.save()

      // Delete activity log for this goal (if exists)
      await Activity.deleteOne({
        userId: user._id,
        type: 'goal_completed',
        'data.goalId': goal._id
      })

      // Reset goal
      goal.completed = false
      goal.completedAt = null
      goal.completionNote = null
      goal.pointsEarned = 0
      await goal.save()

      updatedGoal = goal
    } else {
      // COMPLETE GOAL

      if (user.getTodayCompletionCount() >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Daily completion limit reached (3 goals per day)',
        })
      }

      if (goal.isLocked) {
        return res.status(400).json({
          success: false,
          message:
            'Goal is currently locked and cannot be completed yet. Please wait for the minimum duration period.',
        })
      }

      updatedGoal = await goal.completeGoal(completionNote)

      user.addToTotalPoints(updatedGoal.pointsEarned)
      user.addDailyCompletion(goal._id)
      await user.save()

      await Activity.createActivity(
        user._id,
        user.name,
        user.avatar,
        'goal_completed',
        {
          goalId: goal._id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          pointsEarned: updatedGoal.pointsEarned,
        }
      )
    }

    return res.status(200).json({
      success: true,
      data: { goal: updatedGoal },
    })
  } catch (error) {
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

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  toggleGoalCompletion,
  toggleGoalLike,
  getYearlyGoalsSummary
}; 