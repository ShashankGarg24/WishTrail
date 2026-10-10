const { query } = require('../config/supabase');
const { getCurrentDateInTimezone, getDateKeyInTimezone } = require('../utility/timezone');

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyToDayNumber(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) return null;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

function daysBetweenDateKeys(earlierKey, laterKey) {
  const earlier = dateKeyToDayNumber(earlierKey);
  const later = dateKeyToDayNumber(laterKey);
  if (earlier === null || later === null) return 0;
  return Math.max(0, later - earlier);
}

function classify(days, hasProgress) {
  if (days <= 7) return hasProgress ? 'STRONG' : 'GETTING_STARTED';
  if (days <= 14) return 'STABLE';
  if (days <= 30) return 'SLIPPING';
  return 'STALLED';
}

function reasonFor(state, days) {
  const age = days === 1 ? '1 day' : `${days} days`;
  if (state === 'GETTING_STARTED') return `Created ${age} ago`;
  if (state === 'STRONG') return `Progressed ${age} ago`;
  if (state === 'STABLE') return `Last progress ${age} ago`;
  return `No progress for ${age}`;
}

function deriveGoalHealth({ createdAt, completedAt, lastProgressAt, lastProgressDateKey, timezone = 'UTC', todayKey }) {
  if (completedAt) {
    return { lifecycleStatus: 'COMPLETED', goalHealth: null, healthLabel: 'Completed', healthReason: 'Goal completed' };
  }
  const currentKey = todayKey || getCurrentDateInTimezone(timezone);
  const progressKey = lastProgressDateKey || (lastProgressAt ? getDateKeyInTimezone(lastProgressAt, timezone) : null);
  const createdKey = createdAt ? getDateKeyInTimezone(createdAt, timezone) : currentKey;
  const hasProgress = Boolean(progressKey);
  const days = daysBetweenDateKeys(progressKey || createdKey, currentKey);
  const state = classify(days, hasProgress);
  return {
    lifecycleStatus: 'ACTIVE', goalHealth: state,
    healthLabel: state.split('_').map(word => word[0] + word.slice(1).toLowerCase()).join(' '),
    healthReason: reasonFor(state, days),
    daysSinceProgress: hasProgress ? days : null,
    daysSinceCreation: hasProgress ? null : days,
    lastProgressAt: lastProgressAt || null
  };
}

async function getLatestMeaningfulProgress(goalIds, userId) {
  if (!goalIds.length) return new Map();
  const result = await query(
    `SELECT DISTINCT ON (goal_id) goal_id, date_key, created_at
       FROM goal_updates
      WHERE goal_id = ANY($1::bigint[]) AND user_id = $2
        AND NULLIF(BTRIM(text), '') IS NOT NULL
      ORDER BY goal_id, date_key DESC, created_at DESC`,
    [goalIds, userId]
  );
  return new Map((result.rows || []).map(row => [String(row.goal_id), row]));
}

async function addGoalHealth(goals, { userId, timezone = 'UTC', todayKey } = {}) {
  const list = Array.isArray(goals) ? goals : [goals];
  const progressByGoal = await getLatestMeaningfulProgress(list.map(goal => goal?.id).filter(Boolean), userId);
  const enriched = list.map(goal => {
    const progress = progressByGoal.get(String(goal.id));
    return { ...goal, ...deriveGoalHealth({
      createdAt: goal.createdAt, completedAt: goal.completedAt,
      lastProgressAt: progress?.created_at,
      lastProgressDateKey: progress?.date_key instanceof Date ? progress.date_key.toISOString().slice(0, 10) : progress?.date_key,
      timezone, todayKey
    }) };
  });
  return Array.isArray(goals) ? enriched : enriched[0];
}

module.exports = { addGoalHealth, deriveGoalHealth, daysBetweenDateKeys };
