// Product policy is centralized; changing it does not rewrite finalized recaps.
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
function getWeeklyTrailConfig() {
  return {
    retentionMonths: positiveInteger(process.env.WEEKLY_TRAIL_RETENTION_MONTHS, 6),
    cleanupBatchSize: Math.min(100, positiveInteger(process.env.WEEKLY_TRAIL_CLEANUP_BATCH_SIZE, 25)),
    comebackGapWeeks: positiveInteger(process.env.WEEKLY_TRAIL_COMEBACK_GAP_WEEKS, 4),
    qualification: {
      activeDays: positiveInteger(process.env.WEEKLY_TRAIL_MIN_ACTIVE_DAYS, 2),
      goalsCompleted: positiveInteger(process.env.WEEKLY_TRAIL_MIN_GOALS_COMPLETED, 1),
      goalProgressEvents: positiveInteger(process.env.WEEKLY_TRAIL_MIN_GOAL_PROGRESS_EVENTS, 2),
      habitCompletions: positiveInteger(process.env.WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS, 3)
    }
  };
}
module.exports = { getWeeklyTrailConfig };
