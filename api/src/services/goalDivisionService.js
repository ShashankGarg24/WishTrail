const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

function toDateKeyUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  return d.toISOString().split('T')[0];
}

function isScheduledForDay(habitDoc, jsDate) {
  if (!habitDoc) return false;
  if (habitDoc.frequency === 'daily') return true;
  const day = new Date(jsDate).getUTCDay();
  const days = habitDoc.daysOfWeek || [];
  return days.includes(day);
}

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Compute the number of scheduled days between start (inclusive) and end (inclusive)
 * given a habit's schedule (daily, weekly + daysOfWeek).
 */
function computeTargetCount(habitDoc, startDate, endDate) {
  if (!habitDoc || !startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0,0,0,0);
  end.setUTCHours(0,0,0,0);
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (isScheduledForDay(habitDoc, cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Compute habit progress ratio for a given linked habit and goal window.
 * Uses habit's own targets (targetCompletions or targetDays) if available,
 * otherwise falls back to scheduled days calculation.
 */
async function computeHabitLinkProgress(userId, link, goal) {
  const habit = await Habit.findById(link.habitId).lean();
  if (!habit) return { ratio: 0, targetCount: 0, doneCount: 0 };

  // Priority 1: Use habit's targetCompletions if available
  if (habit.targetCompletions && habit.targetCompletions > 0) {
    const currentCompletions = habit.totalCompletions || 0;
    const ratio = clamp01(currentCompletions / habit.targetCompletions);
    return { 
      ratio, 
      targetCount: habit.targetCompletions, 
      doneCount: currentCompletions,
      targetType: 'completions'
    };
  }

  // Priority 2: Use habit's targetDays if available
  if (habit.targetDays && habit.targetDays > 0) {
    const currentDays = habit.totalDays || 0;
    const ratio = clamp01(currentDays / habit.targetDays);
    return { 
      ratio, 
      targetCount: habit.targetDays, 
      doneCount: currentDays,
      targetType: 'days'
    };
  }

  // Priority 3: Fallback to scheduled days calculation within goal timeframe
  const startDate = goal.startDate || goal.createdAt;
  const endDate = link.endDate || goal.targetDate || new Date();
  const targetCount = computeTargetCount(habit, startDate, endDate);
  if (targetCount === 0) return { ratio: 0, targetCount: 0, doneCount: 0, targetType: 'scheduled' };

  const fromKey = toDateKeyUTC(startDate);
  const toKey = toDateKeyUTC(endDate);
  const doneCount = await HabitLog.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    habitId: new mongoose.Types.ObjectId(link.habitId),
    status: 'done',
    dateKey: { $gte: fromKey, $lte: toKey }
  });
  const ratio = clamp01(doneCount / targetCount);
  return { ratio, targetCount, doneCount, targetType: 'scheduled' };
}

/**
 * Compute weighted progress for a goal.
 * Returns percentage in 0..100 with breakdown.
 */
async function computeGoalProgress(goalId, requestingUserId) {
  const goal = await Goal.findById(goalId).lean();
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (String(goal.userId) !== String(requestingUserId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const subGoals = Array.isArray(goal.subGoals) ? goal.subGoals : [];
  const habitLinks = Array.isArray(goal.habitLinks) ? goal.habitLinks : [];

  const totalWeight = subGoals.reduce((s,g) => s + (g.weight || 0), 0) + habitLinks.reduce((s,h) => s + (h.weight || 0), 0);

  // Auto-normalize if weights do not sum to 100 (soft normalization for computation only)
  const norm = totalWeight > 0 ? (100 / totalWeight) : 0;

  let percent = 0;
  const breakdown = { subGoals: [], habits: [] };

  // Preload any linked goals
  const linkIds = subGoals.map(sg => sg.linkedGoalId).filter(Boolean);
  const linkedById = new Map();
  if (linkIds.length > 0) {
    const rows = await Goal.find({ _id: { $in: linkIds }, userId: goal.userId }).select('_id completed').lean();
    for (const r of rows) linkedById.set(String(r._id), r);
  }
  for (const sg of subGoals) {
    const w = (sg.weight || 0) * norm;
    let ratio = sg.completed ? 1 : 0;
    if (!sg.completed && sg.linkedGoalId) {
      const lg = linkedById.get(String(sg.linkedGoalId));
      if (lg && lg.completed) ratio = 1; // binary linkage maps to completion
    }
    const sgProgress = ratio * w;
    percent += sgProgress;
    breakdown.subGoals.push({ title: sg.title || null, completed: ratio >= 1, weight: w, contribution: sgProgress, linkedGoalId: sg.linkedGoalId || null });
  }

  for (const link of habitLinks) {
    const w = (link.weight || 0) * norm;
    const { ratio, targetCount, doneCount } = await computeHabitLinkProgress(goal.userId, link, goal);
    const contrib = ratio * w;
    percent += contrib;
    breakdown.habits.push({ habitId: link.habitId, weight: w, ratio, targetCount, doneCount, contribution: contrib, endDate: link.endDate || null });
  }

  // Clamp rounding
  percent = Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
  return { percent, breakdown, normalized: norm !== 1, totalWeightBeforeNormalize: totalWeight };
}

/**
 * Ensure weights roughly equal split across provided items.
 */
function suggestEqualWeights(count) {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  const arr = Array(count).fill(base);
  for (let i = 0; i < remainder; i++) arr[i] += 1;
  return arr;
}

/**
 * Set subGoals with weights (validates sum==100 when no habits; else 0..100 allowed as combined sum).
 */
async function setSubGoals(goalId, userId, subGoals) {
  const goal = await Goal.findById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (String(goal.userId) !== String(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });

  const clean = [];
  const arr = Array.isArray(subGoals) ? subGoals : [];
  for (const sg of arr) {
    const title = String(sg.title || '').trim();
    const weight = Number(sg.weight || 0);
    const hasLink = !!sg.linkedGoalId;
    if (!((weight >= 0 && weight <= 100) && (title.length > 0 || hasLink))) continue;
    const entry = {
      title,
      weight,
      completed: !!sg.completed,
      completedAt: sg.completed ? (sg.completedAt ? new Date(sg.completedAt) : new Date()) : undefined,
      note: typeof sg.note === 'string' ? sg.note : ''
    };
    if (sg.linkedGoalId) {
      try {
        const id = new mongoose.Types.ObjectId(sg.linkedGoalId);
        if (String(id) === String(goal._id)) {
          throw Object.assign(new Error('Cannot link a goal to itself'), { statusCode: 400 });
        }
        const exists = await Goal.findOne({ _id: id, userId: goal.userId })
          .select('_id subGoals habitLinks')
          .lean();
        if (!exists) {
          throw Object.assign(new Error('Linked goal not found'), { statusCode: 404 });
        }
        const hasChildren = (Array.isArray(exists.subGoals) && exists.subGoals.length > 0) || (Array.isArray(exists.habitLinks) && exists.habitLinks.length > 0);
        if (hasChildren) {
          // Restrict nesting: a goal with its own subgoals/habits cannot be linked
          throw Object.assign(new Error('This goal already has sub-goals or habits and cannot be linked as a sub-goal.'), { statusCode: 400 });
        }
        entry.linkedGoalId = id;
      } catch (err) {
        if (err && err.statusCode) throw err;
        throw Object.assign(new Error('Invalid linked goal'), { statusCode: 400 });
      }
    }
    clean.push(entry);
  }

  await Goal.updateOne({ _id: goal._id }, { $set: { subGoals: clean } });
  const updatedGoal = await Goal.findById(goal._id).lean();

  // Update activity feed if subgoals were added
  try {
    const Activity = require('../models/Activity');
    const User = require('../models/User');
    const user = await User.findById(userId).select('name avatar').lean();
    
    if (user && clean.length > 0) {
      const completedCount = clean.filter(sg => sg.completed).length;
      await Activity.createOrUpdateGoalActivity(
        userId,
        user.name,
        user.avatar,
        'subgoal_added',
        {
          goalId: goal._id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          subGoalsCount: clean.length,
          completedSubGoalsCount: completedCount
        }
      );
    }
  } catch (err) {
    console.error('Failed to update activity for subgoal addition:', err);
  }

  return updatedGoal;
}

/**
 * Toggle/mark sub-goal completion.
 */
async function toggleSubGoal(goalId, userId, index, completed, note) {
  const goal = await Goal.findById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (String(goal.userId) !== String(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= (goal.subGoals?.length || 0)) {
    throw Object.assign(new Error('Invalid sub-goal index'), { statusCode: 400 });
  }
  
  const previouslyCompleted = goal.subGoals[i].completed;
  goal.subGoals[i].completed = !!completed;
  goal.subGoals[i].completedAt = completed ? new Date() : undefined;
  if (typeof note === 'string') goal.subGoals[i].note = note;
  await goal.save();

  // Update activity feed if subgoal completion status changed
  if (previouslyCompleted !== !!completed) {
    try {
      const Activity = require('../models/Activity');
      const User = require('../models/User');
      const user = await User.findById(userId).select('name avatar').lean();
      
      if (user) {
        const completedCount = (goal.subGoals || []).filter(sg => sg.completed).length;
        await Activity.createOrUpdateGoalActivity(
          userId,
          user.name,
          user.avatar,
          completed ? 'subgoal_completed' : 'subgoal_uncompleted',
          {
            goalId: goal._id,
            goalTitle: goal.title,
            goalCategory: goal.category,
            subGoalsCount: goal.subGoals?.length || 0,
            completedSubGoalsCount: completedCount,
            subGoalTitle: goal.subGoals[i].title,
            subGoalIndex: i
          }
        );
      }
    } catch (err) {
      console.error('Failed to update activity for subgoal toggle:', err);
    }
  }

  return goal.toObject();
}

/**
 * Set habit links with weights.
 */
async function setHabitLinks(goalId, userId, links) {
  const goal = await Goal.findById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (String(goal.userId) !== String(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });

  const clean = [];
  for (const l of (Array.isArray(links) ? links : [])) {
    const id = l.habitId ? new mongoose.Types.ObjectId(l.habitId) : null;
    if (!id) continue;
    const exists = await Habit.findOne({ _id: id, userId: goal.userId }).select('_id targetDays targetCompletions name').lean();
    if (!exists) continue;
    
    // Validate that habit has at least one target set
    if (!exists.targetDays && !exists.targetCompletions) {
      throw Object.assign(
        new Error(`Habit "${exists.name || 'Unknown'}" must have either target days or target completions set before being linked to a goal.`), 
        { statusCode: 400 }
      );
    }
    
    const entry = {
      habitId: id,
      weight: Number(l.weight || 0),
      endDate: l.endDate ? new Date(l.endDate) : undefined,
    };
    if (entry.weight < 0 || entry.weight > 100) continue;
    clean.push(entry);
  }

  await Goal.updateOne({ _id: goal._id }, { $set: { habitLinks: clean } });
  return await Goal.findById(goal._id).lean();
}

module.exports = {
  computeGoalProgress,
  setSubGoals,
  toggleSubGoal,
  setHabitLinks,
  suggestEqualWeights,
  // internal helpers for potential reuse/testing
  _internal: { computeTargetCount, isScheduledForDay, toDateKeyUTC }
};


