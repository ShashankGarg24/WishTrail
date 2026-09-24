/** Shared, bounded metric helpers. Date keys use the user's local calendar. */
function percentage(numerator, denominator) {
  const top = Number(numerator) || 0;
  const bottom = Number(denominator) || 0;
  if (bottom <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.max(0, top) / bottom) * 100)));
}

function dateKeyToUtcDate(dateKey) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function isScheduledOccurrence(habit, dateKey) {
  if (!habit || habit.frequency === 'daily') return true;
  const days = Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : [];
  return days.includes(dateKeyToUtcDate(dateKey).getUTCDay());
}

function scheduledOccurrences(habit, startDateKey, endDateKey) {
  if (!habit || !startDateKey || !endDateKey || startDateKey > endDateKey) return 0;
  const createdKey = habit.createdAt ? new Date(habit.createdAt).toISOString().slice(0, 10) : startDateKey;
  const start = startDateKey > createdKey ? startDateKey : createdKey;
  let count = 0;
  for (let date = dateKeyToUtcDate(start); date <= dateKeyToUtcDate(endDateKey); date.setUTCDate(date.getUTCDate() + 1)) {
    if (isScheduledOccurrence(habit, date.toISOString().slice(0, 10))) count += 1;
  }
  return count;
}

function habitCompletion({ expected = 0, done = 0, skipped = 0, missed } = {}) {
  const safeExpected = Math.max(0, Number(expected) || 0);
  const safeDone = Math.min(safeExpected, Math.max(0, Number(done) || 0));
  const safeSkipped = Math.min(safeExpected - safeDone, Math.max(0, Number(skipped) || 0));
  const safeMissed = missed === undefined ? Math.max(0, safeExpected - safeDone - safeSkipped) : Math.min(safeExpected - safeDone - safeSkipped, Math.max(0, Number(missed) || 0));
  return { expected: safeExpected, done: safeDone, skipped: safeSkipped, missed: safeMissed, percentage: percentage(safeDone, safeExpected) };
}

function activeDays(dateKeys = [], endDateKey) {
  const unique = new Set((dateKeys || []).filter(dateKey =>
    typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && (!endDateKey || dateKey <= endDateKey)
  ));
  return unique.size;
}

function percentagePointTrend(current, previous, hasPrevious = true) {
  if (!hasPrevious || previous === null || previous === undefined) return null;
  return Math.max(-100, Math.min(100, (Number(current) || 0) - (Number(previous) || 0)));
}

function quantitativeProgress(currentValue, targetValue) {
  return percentage(currentValue, targetValue);
}

function milestoneProgress(milestones = []) {
  if (!Array.isArray(milestones) || milestones.length === 0) return 0;
  const weighted = milestones.some(item => Number(item.weight) > 0);
  const total = weighted ? milestones.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0) : milestones.length;
  const complete = weighted
    ? milestones.reduce((sum, item) => sum + (item.completed ? Math.max(0, Number(item.weight) || 0) : 0), 0)
    : milestones.filter(item => item.completed).length;
  return percentage(complete, total);
}

module.exports = { percentage, isScheduledOccurrence, scheduledOccurrences, habitCompletion, activeDays, percentagePointTrend, quantitativeProgress, milestoneProgress };
