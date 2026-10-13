const { getDateKeyInTimezone } = require('../utility/timezone');

function recordedMilestones(goal, details, timezone = 'UTC') {
  const start = goal.created_at && getDateKeyInTimezone(goal.created_at, timezone);
  const end = goal.completed_at && getDateKeyInTimezone(goal.completed_at, timezone);
  return (details?.progress?.breakdown?.subGoals || []).map((item, index) => {
    if (!item.completed || !item.completedAt || Number.isNaN(new Date(item.completedAt).getTime())) return null;
    const date = getDateKeyInTimezone(item.completedAt, timezone);
    if ((start && date < start) || (end && date > end)) return null;
    return { id: `subgoal-${index}`, type: 'milestone', label: 'Sub-goal completed', date };
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

module.exports = { recordedMilestones };
