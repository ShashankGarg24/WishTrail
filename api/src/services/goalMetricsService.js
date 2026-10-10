const { query } = require('../config/supabase');
const { getCurrentDateInTimezone, getDateKeyInTimezone } = require('../utility/timezone');

const DAY_MS = 86400000;
const dateNumber = (key) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return match ? Math.floor(Date.UTC(+match[1], +match[2] - 1, +match[3]) / DAY_MS) : null;
};
const mondayOf = (key) => {
  const day = dateNumber(key);
  if (day === null) return null;
  const dow = new Date(day * DAY_MS).getUTCDay();
  return day - ((dow + 6) % 7);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function calculateGoalMetrics({ goal, updates = [], timezone = 'UTC', todayKey, days = 30 }) {
  const today = todayKey || getCurrentDateInTimezone(timezone);
  const rangeDays = [7, 15, 30].includes(Number(days)) ? Number(days) : 30;
  const todayNumber = dateNumber(today);
  const rangeStartNumber = todayNumber - rangeDays + 1;
  const rangeStart = new Date(rangeStartNumber * DAY_MS).toISOString().slice(0, 10);
  const createdKey = getDateKeyInTimezone(goal.created_at || goal.createdAt, timezone);
  const targetValue = goal.target_date || goal.targetDate;
  const targetKey = targetValue ? getDateKeyInTimezone(targetValue, timezone) : null;
  const completedAt = goal.completed_at || goal.completedAt;
  const progress = clamp(Math.round(Number(completedAt ? 100 : goal.progress?.percent || goal.progressPercent || 0) || 0), 0, 100);
  const rangedUpdates = updates.filter((item) => {
    const key = String(item.dateKey || item.date_key || '').slice(0, 10);
    return key >= rangeStart && key <= today;
  });
  const meaningful = rangedUpdates.filter((item) => String(item.text || '').trim());
  const activeDateKeys = [...new Set(meaningful.map((item) => String(item.dateKey || item.date_key || '').slice(0, 10)).filter(Boolean))].sort();
  const completionKey = completedAt ? getDateKeyInTimezone(completedAt, timezone) : null;
  const completionInRange = completionKey && completionKey >= rangeStart && completionKey <= today;
  if (completionInRange && !activeDateKeys.includes(completionKey)) activeDateKeys.push(completionKey);

  const firstWeek = mondayOf(createdKey);
  const currentWeek = mondayOf(today);
  const elapsedWeeks = firstWeek === null || currentWeek === null ? 0 : Math.floor((currentWeek - firstWeek) / 7) + 1;
  const weeksInRange = Math.ceil(rangeDays / 7);
  const eligibleWeeks = clamp(elapsedWeeks, 0, Math.min(4, weeksInRange));
  const earliestWeek = currentWeek - Math.max(0, eligibleWeeks - 1) * 7;
  const activeWeeks = new Set(activeDateKeys.map(mondayOf).filter((week) => week >= earliestWeek && week <= currentWeek)).size;
  const consistency = eligibleWeeks ? Math.round((activeWeeks / eligibleWeeks) * 100) : 0;

  const emotionCounts = rangedUpdates.reduce((counts, item) => {
    const emotion = String(item.emotion || '').toLowerCase();
    if (emotion) counts[emotion] = (counts[emotion] || 0) + 1;
    return counts;
  }, {});
  const moodSamples = Object.values(emotionCounts).reduce((sum, count) => sum + count, 0);
  const moodDistribution = Object.entries(emotionCounts).map(([emotion, count]) => ({
    emotion, count, percent: Math.round((count / moodSamples) * 100)
  })).sort((a, b) => b.count - a.count);

  const targetDay = dateNumber(targetKey);
  const todayDay = dateNumber(today);
  const daysDelta = targetDay === null || todayDay === null ? null : targetDay - todayDay;
  return {
    progress,
    rangeDays,
    rangeStart,
    rangeEnd: today,
    progressUpdates: meaningful.length + (completionInRange && !meaningful.some((item) => String(item.dateKey || item.date_key).slice(0, 10) === completionKey) ? 1 : 0),
    activeDays: activeDateKeys.length,
    consistency,
    activeWeeks,
    eligibleWeeks,
    daysLeft: daysDelta === null ? null : Math.max(0, daysDelta),
    overdueDays: daysDelta !== null && daysDelta < 0 ? Math.abs(daysDelta) : 0,
    moodSamples,
    moodDistribution,
    progressSeries: [
      ...(createdKey >= rangeStart ? [{ date: createdKey, progress: 0 }] : []),
      ...(completionInRange ? [{ date: completionKey, progress: 100 }] : progress > 0 ? [{ date: today, progress }] : [])
    ]
  };
}

async function getGoalMetrics(goal, { userId, timezone = 'UTC', days = 30 }) {
  const result = await query(
    `SELECT text, emotion, date_key, created_at FROM goal_updates
      WHERE goal_id = $1 AND user_id = $2 ORDER BY date_key ASC, created_at ASC`,
    [goal.id, userId]
  );
  return calculateGoalMetrics({ goal, updates: result.rows || [], timezone, days });
}

module.exports = { calculateGoalMetrics, getGoalMetrics };
