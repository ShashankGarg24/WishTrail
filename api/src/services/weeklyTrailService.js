const { getWeeklyTrailConfig } = require('../config/weeklyTrail');
const { query } = require('../config/supabase');
const { logger } = require('../config/observability');
const { isValidTimezone, getStartOfDayInTimezone, getDateKeyInTimezone, shiftDateKey } = require('../utility/timezone');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const { periodForDate, calculateWeek } = require('./weeklyTrailCalculator');

const timezoneOf = user => isValidTimezone(user.timezone || '') ? user.timezone : 'UTC';

function previousPeriod(now, timezone) {
  const current = periodForDate(now, timezone);
  return periodForDate(getStartOfDayInTimezone(shiftDateKey(current.startLocalDate, -1), timezone), timezone);
}

function availability(now, timezone) {
  const localDate = getDateKeyInTimezone(now, timezone);
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  return {
    localDate,
    inWindow: day >= 1 && day <= 3,
    expiresAt: getStartOfDayInTimezone(shiftDateKey(localDate, 1), timezone).toISOString()
  };
}

function qualifies(recap) {
  const limits = getWeeklyTrailConfig().qualification;
  return recap.activeDays >= limits.activeDays
    || recap.goalsCompleted >= limits.goalsCompleted
    || recap.goalProgressEvents >= limits.goalProgressEvents
    || recap.habitCompletions >= limits.habitCompletions;
}

async function aggregate(user, period, now = new Date()) {
  const start = getStartOfDayInTimezone(period.startLocalDate, period.timezone);
  const end = getStartOfDayInTimezone(shiftDateKey(period.endLocalDate, 1), period.timezone);
  const results = await Promise.all([
    query(`SELECT g.id,g.title,g.created_at,g.completed_at,
      COALESCE((to_jsonb(g)->>'is_active')::boolean, true) AS is_active,
      (SELECT max(u.date_key)::text FROM goal_updates u WHERE u.goal_id=g.id AND u.user_id=$1 AND u.date_key <= $3 AND NULLIF(btrim(u.text),'') IS NOT NULL) last_progress_date
      FROM goals g WHERE g.user_id=$1 AND g.created_at < $2`, [user.id, end, period.endLocalDate]),
    query('SELECT id,goal_id,date_key::text,text,emotion FROM goal_updates WHERE user_id=$1 AND date_key >= $2 AND date_key <= $3', [user.id, period.startLocalDate, period.endLocalDate]),
    query(`SELECT h.id,h.name,h.created_at,h.frequency,h.days_of_week,h.daily_target_count,
      COALESCE((to_jsonb(h)->>'is_archived')::boolean, false) AS is_archived,
      COALESCE((to_jsonb(h)->>'is_active')::boolean, true) AS is_active
      FROM habits h WHERE h.user_id=$1 AND h.created_at < $2`, [user.id, end]),
    query(`SELECT habit_id,date_key::text,occurred_at,status,completion_count,completion_times_mood FROM habit_logs
      WHERE user_id=$1 AND date_key >= $2::date - 1 AND date_key <= $3::date + 1`, [user.id, period.startLocalDate, period.endLocalDate]),
    DailyLogsEntry.find({ userId:Number(user.id),createdAt:{$gte:start,$lt:end},mood:{$exists:true,$ne:null} }).select('mood createdAt -_id').lean()
  ]);
  return calculateWeek({ period, goals:results[0].rows, updates:results[1].rows, habits:results[2].rows, logs:results[3].rows, checkIns:results[4], now });
}

async function current(user, { includeSeen = false } = {}, now = new Date()) {
  const timezone = timezoneOf(user);
  const window = availability(now, timezone);
  if (!window.inWindow) return { available:false, reason:'NOT_IN_WINDOW' };
  const period = previousPeriod(now, timezone);
  if (!includeSeen) {
    const seen = await query('SELECT last_seen_weekly_trail_period_key FROM users WHERE id=$1', [user.id]);
    if (seen.rows[0]?.last_seen_weekly_trail_period_key === period.periodKey) {
      return { available:false, reason:'ALREADY_SEEN', periodKey:period.periodKey, displayDate:window.localDate, expiresAt:window.expiresAt };
    }
  }
  const recap = await aggregate(user, period, now);
  if (!qualifies(recap)) return { available:false, reason:'NOT_ENOUGH_ACTIVITY', periodKey:period.periodKey };
  logger.info('weekly_trail_qualified', { userId:user.id, periodKey:period.periodKey, activeDays:recap.activeDays, goalsProgressed:recap.goalsProgressed, habitCompletions:recap.habitCompletions });
  return { available:true, periodKey:period.periodKey, startDate:period.startLocalDate, endDate:period.endLocalDate, displayDate:window.localDate, expiresAt:window.expiresAt, recap };
}

async function markSeen(user, key, now = new Date()) {
  const timezone = timezoneOf(user);
  const window = availability(now, timezone);
  const period = previousPeriod(now, timezone);
  if (!window.inWindow || key !== period.periodKey) throw Object.assign(new Error('Weekly Trail is no longer available'), { statusCode:404 });
  await query('UPDATE users SET last_seen_weekly_trail_period_key=$2 WHERE id=$1', [user.id,key]);
  return { seen:true, periodKey:key };
}

module.exports = { current, markSeen, aggregate, availability, previousPeriod, qualifies };
