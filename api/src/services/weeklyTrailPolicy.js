const { getDateKeyInTimezone } = require('../utility/timezone');
const { getWeeklyTrailConfig } = require('../config/weeklyTrail');

function retentionCutoff(now, timezone, months = getWeeklyTrailConfig().retentionMonths) {
  const [year, month, day] = getDateKeyInTimezone(now, timezone).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
function shouldCreateWeeklyTrail(recap, thresholds = getWeeklyTrailConfig().qualification) {
  return Object.entries(thresholds).some(([metric, minimum]) => Number(recap[metric] || 0) >= minimum);
}
function narrativeFor(recap, prior, gapWeeks = getWeeklyTrailConfig().comebackGapWeeks) {
  if (!prior) return 'FIRST_TRAIL';
  const gapDays = (new Date(`${recap.startLocalDate}T12:00:00Z`) - new Date(`${prior.startLocalDate}T12:00:00Z`)) / 86400000;
  return gapDays >= gapWeeks * 7 ? 'COMEBACK' : 'WEEKLY_RECAP';
}
module.exports = { retentionCutoff, shouldCreateWeeklyTrail, narrativeFor };
