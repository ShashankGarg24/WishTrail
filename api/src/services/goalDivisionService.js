const mongoose = require('mongoose');
const GoalDetails = require('../models/extended/GoalDetails');
const pgGoalService = require('./pgGoalService');
const pgHabitService = require('./pgHabitService');
const pgHabitLogService = require('./pgHabitLogService');

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
  const habit = await pgHabitService.getHabit(link.habitId, userId);
  if (!habit) return { ratio: 0, targetCount: 0, doneCount: 0 };

  // Priority 1: Use habit's target_completions if available
  if (habit.target_completions && habit.target_completions > 0) {
    const currentCompletions = habit.total_completions || 0;
    const ratio = clamp01(currentCompletions / habit.target_completions);
    return { 
      ratio, 
      targetCount: habit.target_completions, 
      doneCount: currentCompletions,
      targetType: 'completions'
    };
  }

  // Priority 2: Use habit's target_days if available
  if (habit.target_days && habit.target_days > 0) {
    const currentDays = habit.total_days || 0;
    const ratio = clamp01(currentDays / habit.target_days);
    return { 
      ratio, 
      targetCount: habit.target_days, 
      doneCount: currentDays,
      targetType: 'days'
    };
  }

  // Priority 3: Fallback to scheduled days calculation within goal timeframe
  const startDate = goal.start_date || goal.created_at;
  const endDate = link.endDate || goal.target_date || new Date();
  
  // Note: computeTargetCount expects habit doc with frequency and daysOfWeek
  // For now, if no targets are set, return 0 (habits should have targets to be linked)
  const targetCount = 0; // PostgreSQL habits don't store frequency/daysOfWeek in same way
  if (targetCount === 0) return { ratio: 0, targetCount: 0, doneCount: 0, targetType: 'scheduled' };

  const fromKey = toDateKeyUTC(startDate);
  const toKey = toDateKeyUTC(endDate);
  const logs = await pgHabitLogService.getHabitLogs({
    userId,
    habitId: link.habitId,
    startDate: fromKey,
    endDate: toKey
  });
  const doneCount = logs.filter(log => log.status === 'done').length;
  const ratio = clamp01(doneCount / targetCount);
  return { ratio, targetCount, doneCount, targetType: 'scheduled' };
}

/**
 * Compute weighted progress for a goal.
 * Returns percentage in 0..100 with breakdown.
 */
async function computeGoalProgress(goalId, requestingUserId) {
  const goal = await pgGoalService.getGoalById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (Number(goal.user_id) !== Number(requestingUserId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Get extended data from MongoDB
  const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();
  const subGoals = Array.isArray(goalDetails?.progress?.breakdown?.subGoals) ? goalDetails.progress.breakdown.subGoals : [];
  const habitLinks = Array.isArray(goalDetails?.progress?.breakdown?.habits) ? goalDetails.progress.breakdown.habits : [];

  // If goal is completed and has no sub-goals or habit links, return 100%
  if (goal.completed && subGoals.length === 0 && habitLinks.length === 0) {
    return { 
      percent: 100, 
      breakdown: { subGoals: [], habits: [] }, 
      normalized: false, 
      totalWeightBeforeNormalize: 0 
    };
  }

  const totalWeight = subGoals.reduce((s,g) => s + (g.weight || 0), 0) + habitLinks.reduce((s,h) => s + (h.weight || 0), 0);

  // Auto-normalize if weights do not sum to 100 (soft normalization for computation only)
  const norm = totalWeight > 0 ? (100 / totalWeight) : 0;

  let percent = 0;
  const breakdown = { subGoals: [], habits: [] };

  // Preload any linked goals from PostgreSQL
  const linkIds = subGoals.map(sg => sg.linkedGoalId).filter(Boolean);
  const linkedById = new Map();
  if (linkIds.length > 0) {
    const rows = await pgGoalService.getGoalsByIds(linkIds);
    for (const r of rows) {
      if (r.user_id === goal.user_id) {
        linkedById.set(Number(r.id), r);
      }
    }
  }
  
  for (const sg of subGoals) {
    const w = (sg.weight || 0) * norm;
    let ratio = sg.completed ? 1 : 0;
    if (!sg.completed && sg.linkedGoalId) {
      const lg = linkedById.get(Number(sg.linkedGoalId));
      if (lg && lg.completed) ratio = 1; // binary linkage maps to completion
    }
    const sgProgress = ratio * w;
    percent += sgProgress;
    breakdown.subGoals.push({ title: sg.title || null, completed: ratio >= 1, weight: w, contribution: sgProgress, linkedGoalId: sg.linkedGoalId || null });
  }

  for (const link of habitLinks) {
    const w = (link.weight || 0) * norm;
    const { ratio, targetCount, doneCount } = await computeHabitLinkProgress(goal.user_id, link, goal);
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
  const goal = await pgGoalService.getGoalById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (Number(goal.user_id) !== Number(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });

  // Get existing GoalDetails from MongoDB
  const existingDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true });
  
  // Track previous subgoals for comparison
  const previousSubGoals = existingDetails?.progress?.breakdown?.subGoals ? existingDetails.progress.breakdown.subGoals.map(sg => ({
    title: sg.title,
    linkedGoalId: sg.linkedGoalId ? Number(sg.linkedGoalId) : null,
    completed: sg.completed
  })) : [];

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
        const linkedId = Number(sg.linkedGoalId);
        if (linkedId === goal.id) {
          throw Object.assign(new Error('Cannot link a goal to itself'), { statusCode: 400 });
        }
        const exists = await pgGoalService.getGoalById(linkedId);
        if (!exists || exists.user_id !== goal.user_id) {
          throw Object.assign(new Error('Linked goal not found'), { statusCode: 404 });
        }
        // Check if linked goal has children in MongoDB
        const linkedDetails = await GoalDetails.findOne({ goalId: linkedId, isActive: true });
        const hasChildren = (linkedDetails?.progress?.breakdown?.subGoals && linkedDetails.progress.breakdown.subGoals.length > 0) || (linkedDetails?.progress?.breakdown?.habits && linkedDetails.progress.breakdown.habits.length > 0);
        if (hasChildren) {
          // Restrict nesting: a goal with its own subgoals/habits cannot be linked
          throw Object.assign(new Error('This goal already has sub-goals or habits and cannot be linked as a sub-goal.'), { statusCode: 400 });
        }
        entry.linkedGoalId = linkedId;
      } catch (err) {
        if (err && err.statusCode) throw err;
        throw Object.assign(new Error('Invalid linked goal'), { statusCode: 400 });
      }
    }
    clean.push(entry);
  }

  // Update MongoDB GoalDetails
  await GoalDetails.findOneAndUpdate(
    { goalId: goal.id },
    { $set: { 'progress.breakdown.subGoals': clean, 'progress.lastCalculated': new Date() } },
    { upsert: true }
  );
  
  const updatedDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();

  // Track subgoal changes (additions and removals)
  try {
    const Activity = require('../models/Activity');
    const pgUserService = require('./pgUserService');
    const user = await pgUserService.getUserById(userId);
    
    if (user) {
      const currentSubGoals = clean.map(sg => ({
        title: sg.title,
        linkedGoalId: sg.linkedGoalId ? Number(sg.linkedGoalId) : null,
        completed: sg.completed
      }));

      // Detect additions (new subgoals not in previous list)
      const additions = currentSubGoals.filter(curr => 
        !previousSubGoals.some(prev => 
          prev.title === curr.title && prev.linkedGoalId === curr.linkedGoalId
        )
      );

      // Detect removals (previous subgoals not in current list)
      const removals = previousSubGoals.filter(prev => 
        !currentSubGoals.some(curr => 
          curr.title === prev.title && curr.linkedGoalId === curr.linkedGoalId
        )
      );

      // Track subgoal changes in activity updates array
      if (additions.length > 0 || removals.length > 0) {
        const goalActivity = await Activity.findOne({
          type: 'goal_activity',
          'data.goalId': goal.id,
          userId: userId
        });

        if (goalActivity) {
          if (!goalActivity.data.updates) {
            goalActivity.data.updates = [];
          }

          // Remove subgoals that were unlinked
          if (removals.length > 0) {
            const removalIds = new Set(removals.map(r => r.linkedGoalId?.toString()).filter(Boolean));
            goalActivity.data.updates = goalActivity.data.updates.filter(u => 
              !u.subGoalId || !removalIds.has(u.subGoalId.toString())
            );
          }

          // Add new subgoal entries
          for (const added of additions) {
            if (added.linkedGoalId) {
              const newUpdate = {
                subGoalId: added.linkedGoalId.toString(),
                subGoalAddedAt: new Date(),
                subGoalCompletedAt: null,
                habitId: null,
                habitAddedAt: null,
                habitTargetCompletedAt: null
              };
              goalActivity.data.updates.push(newUpdate);
            }
          }

          goalActivity.data.lastUpdateType = removals.length > 0 ? 'subgoal_removed' : 'subgoal_added';
          goalActivity.markModified('data');
          await goalActivity.save();
        } else if (additions.length > 0) {
          // Create new goal_activity if it doesn't exist and we have additions
          await Activity.createOrUpdateGoalActivity(
            userId,
            user.name,
            user.username,
            user.avatar_url,
            'goal_activity',
            {
              goalId: goal.id,
              lastUpdateType: 'subgoal_added',
              updates: additions.filter(a => a.linkedGoalId).map(added => ({
                subGoalId: added.linkedGoalId.toString(),
                subGoalAddedAt: new Date(),
                subGoalCompletedAt: null,
                habitId: null,
                habitAddedAt: null,
                habitTargetCompletedAt: null
              }))
            }
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to update activity for subgoal changes:', err);
  }

  // Return combined goal with details
  return {
    ...goal,
    subGoals: updatedDetails.progress?.breakdown?.subGoals || [],
    habitLinks: updatedDetails.progress?.breakdown?.habits || []
  };
}

/**
 * Toggle/mark sub-goal completion.
 */
async function toggleSubGoal(goalId, userId, index, completed, note) {
  const goal = await pgGoalService.getGoalById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (Number(goal.user_id) !== Number(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  
  const goalDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true });
  if (!goalDetails || !goalDetails.progress?.breakdown?.subGoals) throw Object.assign(new Error('No sub-goals found'), { statusCode: 404 });
  
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= (goalDetails.progress.breakdown.subGoals?.length || 0)) {
    throw Object.assign(new Error('Invalid sub-goal index'), { statusCode: 400 });
  }
  
  const previouslyCompleted = goalDetails.progress.breakdown.subGoals[i].completed;
  goalDetails.progress.breakdown.subGoals[i].completed = !!completed;
  goalDetails.progress.breakdown.subGoals[i].completedAt = completed ? new Date() : undefined;
  if (typeof note === 'string') goalDetails.progress.breakdown.subGoals[i].note = note;
  goalDetails.progress.lastCalculated = new Date();
  await goalDetails.save();

  // Update activity feed if subgoal completion status changed
  if (previouslyCompleted !== !!completed) {
    try {
      const Activity = require('../models/Activity');
      const pgUserService = require('./pgUserService');
      const user = await pgUserService.getUserById(userId);
      
      if (user) {
        // Find the goal_activity and update the subgoal completion date
        const goalActivity = await Activity.findOne({
          type: 'goal_activity',
          'data.goalId': goal.id,
          userId: userId
        });

        console.log('[toggleSubGoal] Found activity:', !!goalActivity);
        console.log('[toggleSubGoal] Updates array:', goalActivity?.data?.updates?.length);

        if (goalActivity && goalActivity.data.updates) {
          // Find the update entry for this subgoal and update completion date
          const subGoalId = goalDetails.progress.breakdown.subGoals[i].linkedGoalId;
          console.log('[toggleSubGoal] Looking for subGoalId:', subGoalId, 'completed:', completed);
          
          if (subGoalId) {
            const updateEntry = goalActivity.data.updates.find(u => 
              u.subGoalId && u.subGoalId.toString() === subGoalId.toString()
            );
            
            console.log('[toggleSubGoal] Found update entry:', !!updateEntry);
            
            if (updateEntry) {
              if (completed) {
                updateEntry.subGoalCompletedAt = new Date();
                goalActivity.data.lastUpdateType = 'subgoal_completed';
              } else {
                // Uncompleting - set back to null
                updateEntry.subGoalCompletedAt = null;
                goalActivity.data.lastUpdateType = 'subgoal_uncompleted';
              }
              goalActivity.markModified('data');
              await goalActivity.save();
              console.log('[toggleSubGoal] Updated and saved activity');
            } else {
              console.log('[toggleSubGoal] No matching update entry found for subGoalId:', subGoalId);
            }
          }
        } else {
          console.log('[toggleSubGoal] No activity or updates array found');
        }
      }
    } catch (err) {
      console.error('Failed to update activity for subgoal toggle:', err);
    }
  }

  return {
    ...goal,
    subGoals: goalDetails.progress.breakdown.subGoals,
    habitLinks: goalDetails.progress.breakdown.habits || []
  };
}

/**
 * Set habit links with weights.
 */
async function setHabitLinks(goalId, userId, links) {
  const goal = await pgGoalService.getGoalById(goalId);
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
  if (Number(goal.user_id) !== Number(userId)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });

  // Get existing GoalDetails from MongoDB
  const existingDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true });
  
  // Track previous habit links for comparison
  const previousHabitLinks = existingDetails?.progress?.breakdown?.habits ? existingDetails.progress.breakdown.habits.map(hl => Number(hl.habitId)) : [];

  const clean = [];
  for (const l of (Array.isArray(links) ? links : [])) {
    const id = l.habitId ? Number(l.habitId) : null;
    if (!id) continue;
    const exists = await pgHabitService.getHabit(id, goal.user_id);
    if (!exists) continue;
    
    // Validate that habit has at least one target set
    if (!exists.target_days && !exists.target_completions) {
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

  // Update MongoDB GoalDetails
  await GoalDetails.findOneAndUpdate(
    { goalId: goal.id },
    { $set: { 'progress.breakdown.habits': clean, 'progress.lastCalculated': new Date() } },
    { upsert: true }
  );
  
  const updatedDetails = await GoalDetails.findOne({ goalId: goal.id, isActive: true }).lean();

  // Track habit link changes (additions and removals)
  try {
    const Activity = require('../models/Activity');
    const pgUserService = require('./pgUserService');
    const user = await pgUserService.getUserById(userId);
    
    if (user) {
      const currentHabitLinks = clean.map(hl => Number(hl.habitId));

      // Detect additions
      const additions = currentHabitLinks.filter(curr => !previousHabitLinks.includes(curr));
      
      // Detect removals
      const removals = previousHabitLinks.filter(prev => !currentHabitLinks.includes(prev));

      // Track habit link changes in activity updates array
      if (additions.length > 0 || removals.length > 0) {
        const goalActivity = await Activity.findOne({
          type: 'goal_activity',
          'data.goalId': goal.id,
          userId: userId
        });

        if (goalActivity) {
          if (!goalActivity.data.updates) {
            goalActivity.data.updates = [];
          }

          // Remove habits that were unlinked
          if (removals.length > 0) {
            const removalIds = new Set(removals.map(r => r.toString()));
            goalActivity.data.updates = goalActivity.data.updates.filter(u => 
              !u.habitId || !removalIds.has(u.habitId.toString())
            );
          }

          // Add new habit entries
          for (const habitId of additions) {
            const newUpdate = {
              subGoalId: null,
              subGoalAddedAt: null,
              subGoalCompletedAt: null,
              habitId: habitId.toString(),
              habitAddedAt: new Date(),
              habitTargetCompletedAt: null
            };
            goalActivity.data.updates.push(newUpdate);
          }

          goalActivity.data.lastUpdateType = removals.length > 0 ? 'habit_removed' : 'habit_added';
          goalActivity.markModified('data');
          await goalActivity.save();
        } else if (additions.length > 0) {
          // Create new goal_activity if it doesn't exist and we have additions
          await Activity.createOrUpdateGoalActivity(
            userId,
            user.name,
            user.username,
            user.avatar_url,
            'goal_activity',
            {
              goalId: goal.id,
              lastUpdateType: 'habit_added',
              updates: additions.map(habitId => ({
                subGoalId: null,
                subGoalAddedAt: null,
                subGoalCompletedAt: null,
                habitId: habitId.toString(),
                habitAddedAt: new Date(),
                habitTargetCompletedAt: null
              }))
            }
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to update activity for habit link changes:', err);
  }

  // Return combined goal with details
  return {
    ...goal,
    subGoals: updatedDetails.progress?.breakdown?.subGoals || [],
    habitLinks: updatedDetails.progress?.breakdown?.habits || []
  };
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


