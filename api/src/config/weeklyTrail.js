// Runtime-only V1 qualification thresholds.
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
function getWeeklyTrailConfig() {
  return {
    qualification: {
      activeDays: positiveInteger(process.env.WEEKLY_TRAIL_MIN_ACTIVE_DAYS, 2),
      goalsCompleted: positiveInteger(process.env.WEEKLY_TRAIL_MIN_GOALS_COMPLETED, 1),
      goalProgressEvents: positiveInteger(process.env.WEEKLY_TRAIL_MIN_GOAL_PROGRESS_EVENTS, 2),
      habitCompletions: positiveInteger(process.env.WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS, 3)
    }
  };
}
module.exports = { getWeeklyTrailConfig };
