const { getDateKeyInTimezone, shiftDateKey } = require('../utility/timezone');
const { deriveGoalHealth } = require('./goalHealthService');
const FORMULA_VERSION = 3;
const keyOf = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
const meaningfulGoalUpdate = item => Boolean(String(item.text || '').trim());

function periodForDate(date, timezone = 'UTC') {
  const local = getDateKeyInTimezone(date, timezone);
  const dow = new Date(`${local}T12:00:00Z`).getUTCDay();
  const startLocalDate = shiftDateKey(local, -((dow + 6) % 7));
  const thursday = new Date(`${shiftDateKey(startLocalDate, 3)}T12:00:00Z`);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil((((thursday - new Date(Date.UTC(year, 0, 1, 12))) / 86400000) + 1) / 7);
  return { periodKey: `${year}-W${String(week).padStart(2, '0')}`, startLocalDate, endLocalDate: shiftDateKey(startLocalDate, 6), timezone };
}
function periodFromKey(key, timezone = 'UTC') {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(key));
  if (!match || +match[1] < 1970 || +match[2] < 1 || +match[2] > 53) throw Object.assign(new Error('Invalid week'), { statusCode: 400 });
  const first = periodForDate(new Date(`${match[1]}-01-04T12:00:00Z`), 'UTC');
  const date = shiftDateKey(first.startLocalDate, (+match[2] - 1) * 7);
  const result = periodForDate(new Date(`${date}T12:00:00Z`), 'UTC');
  if (result.periodKey !== key) throw Object.assign(new Error('Invalid week'), { statusCode: 400 });
  return { ...result, timezone };
}

function calculateWeek({ period, goals = [], updates = [], habits = [], logs = [], checkIns = [], now = new Date(), weekInProgress = false }) {
  const { startLocalDate, endLocalDate, timezone } = period;
  const through = weekInProgress ? getDateKeyInTimezone(now, timezone) : endLocalDate;
  const inRange = key => key >= startLocalDate && key <= through;
  const local = value => value && !Number.isNaN(new Date(value).getTime()) ? getDateKeyInTimezone(new Date(value), timezone) : null;
  const progressed = new Set(); const completed = new Set(); const active = new Set(); const emotions = {};
  let progressEvents = 0;
  const addEmotion = emotion => { if (['great','good','okay','challenging','neutral','happy','sad','amazing','motivated','stressed','angry'].includes(emotion)) emotions[emotion] = (emotions[emotion] || 0) + 1; };
  checkIns.forEach(entry => { if (inRange(local(entry.createdAt))) addEmotion(entry.mood); });
  const wins = [];
  updates.forEach(update => {
    const date = keyOf(update.date_key);
    if (!inRange(date)) return;
    addEmotion(update.emotion);
    if (meaningfulGoalUpdate(update)) {
      progressed.add(String(update.goal_id)); active.add(date);
      progressEvents += 1;
    }
  });
  goals.forEach(goal => {
    if (!inRange(local(goal.completed_at))) return;
    completed.add(String(goal.id)); progressed.add(String(goal.id)); active.add(local(goal.completed_at));
    wins.push({ type: 'goal', entityId: String(goal.id), titleSnapshot: goal.title, eventType: 'GOAL_COMPLETED', at: new Date(goal.completed_at).getTime() });
  });
  wins.sort((a,b) => b.at-a.at || a.entityId.localeCompare(b.entityId));
  const counts = new Map();
  let habitCompletions = 0;
  for (const log of logs) {
    if (log.status !== 'done') continue;
    const entries = Array.isArray(log.completion_times_mood) ? log.completion_times_mood : [];
    const occurrences = entries.length ? entries.map(entry => ({ date: local(entry?.timestamp || entry), emotion: entry?.mood, count: 1 })) : [{ date: local(log.occurred_at) || keyOf(log.date_key), count: Number(log.completion_count) || 0 }];
    for (const entry of occurrences) {
      if (!inRange(entry.date)) continue;
      // Habit logs default to neutral without user input; that value is not an explicit feeling.
      if (entry.emotion !== 'neutral') addEmotion(entry.emotion);
      const key = `${log.habit_id}:${entry.date}`;
      counts.set(key, (counts.get(key) || 0) + entry.count);
      habitCompletions += entry.count;
      if (entry.count > 0) active.add(entry.date);
    }
  }
  let eligible = 0; let scheduledCompletions = 0; let unknownSchedule = false;
  const rhythms = []; const habitAttention = [];
  for (const habit of habits) {
    // V1 uses the current Habit domain fields. Past schedule/status changes are
    // intentionally not reconstructed; finalized recap values remain frozen.
    if (habit.is_active === false || habit.is_archived) continue;
    const knownSchedule = ['daily','weekly','custom'].includes(habit.frequency);
    let hEligible = 0; let hCompleted = 0; let hUnknown = false;
    for (let i = 0; i < 7; i++) {
      const date = shiftDateKey(startLocalDate, i);
      if (date > through || date < local(habit.created_at)) continue;
      const count = counts.get(`${habit.id}:${date}`) || 0;
      if (!knownSchedule) {
        unknownSchedule = true; hUnknown = true;
        // Retained successes are facts; adherence cannot be reconstructed before schedule history.
        continue;
      }
      const scheduled = habit.frequency === 'daily' || (habit.days_of_week || []).includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      if (!scheduled) continue;
      const target = Math.max(1, Number(habit.daily_target_count) || 1);
      const successes = Math.min(target, count);
      hEligible += target; hCompleted += successes;
      if (successes) active.add(date);
    }
    eligible += hEligible; scheduledCompletions += hCompleted;
    const summary = { habitId: String(habit.id), titleSnapshot: habit.name, completed: hCompleted, eligible: hEligible, adherencePercent: hEligible ? Math.round(100*hCompleted/hEligible) : null };
    if (!hUnknown && hEligible >= 2 && hCompleted > 0) rhythms.push(summary);
    if (!hUnknown && habit.is_active !== false && !habit.is_archived && hEligible >= 2 && hCompleted/hEligible < .5) habitAttention.push({ type: 'habit', entityId: String(habit.id), titleSnapshot: habit.name, reason: 'LOW_HABIT_ADHERENCE', adherencePercent: summary.adherencePercent });
  }
  rhythms.sort((a,b) => b.completed/b.eligible-a.completed/a.eligible || b.completed-a.completed || a.habitId.localeCompare(b.habitId));
  const attention = goals.filter(g => g.is_active !== false && !g.completed_at && !g.completed).map(g => {
    const health = deriveGoalHealth({ createdAt: g.created_at, lastProgressDateKey: keyOf(g.last_progress_date) || null, timezone, todayKey: through });
    return { type: 'goal', entityId: String(g.id), titleSnapshot: g.title, reason: health.goalHealth === 'STALLED' ? 'GOAL_STALLED' : 'NO_GOAL_PROGRESS', days: health.daysSinceProgress ?? health.daysSinceCreation, state: health.goalHealth };
  }).filter(g => ['SLIPPING','STALLED'].includes(g.state)).sort((a,b) => b.days-a.days || a.entityId.localeCompare(b.entityId)).map(({state,...item}) => item);
  return {
    ...period, formulaVersion: FORMULA_VERSION, weekInProgress,
    goalsProgressed: progressed.size, goalsCompleted: completed.size, goalProgressEvents: progressEvents, habitCompletions,
    eligibleScheduledOccurrences: unknownSchedule ? null : eligible,
    habitConsistency: unknownSchedule || !eligible ? null : Math.round(100*scheduledCompletions/eligible),
    activeDays: active.size, activeDateKeys: [...active].sort(),
    biggestWin: wins.length ? (({at,...win}) => win)(wins[0]) : null,
    strongestRhythm: rhythms[0] || null,
    attention: active.size ? [...attention, ...habitAttention.sort((a,b) => a.entityId.localeCompare(b.entityId))].slice(0,2) : [],
    emotionCounts: Object.values(emotions).reduce((a,b) => a+b,0) >= 3 ? emotions : null,
    dataQuality: unknownSchedule ? ['HABIT_SCHEDULE_UNAVAILABLE'] : [],
    momentumScore: null, momentumDelta: null
  };
}
module.exports = { FORMULA_VERSION, meaningfulGoalUpdate, periodForDate, periodFromKey, calculateWeek };
