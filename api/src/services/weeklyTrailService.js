const { getWeeklyTrailConfig } = require('../config/weeklyTrail');
const { retentionCutoff, shouldCreateWeeklyTrail, narrativeFor } = require('./weeklyTrailPolicy');
const { query } = require('../config/supabase');
const { logger } = require('../config/observability');
const { isValidTimezone, getStartOfDayInTimezone, getDateKeyInTimezone, shiftDateKey } = require('../utility/timezone');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const { periodForDate, periodFromKey, calculateWeek } = require('./weeklyTrailCalculator');
const timezoneOf = user => isValidTimezone(user.timezone || '') ? user.timezone : 'UTC';
const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const stored = row => row ? { ...row.recap, id: String(row.id), finalizedAt: row.finalized_at, timezoneAtFinalization: row.timezone_at_finalization, weekInProgress: false } : null;

const cutoffFor = (user, now) => retentionCutoff(now, timezoneOf(user));

async function cleanupExpired(user, now = new Date()) {
  const cutoff = cutoffFor(user, now);
  // Both the selection and deletion are owner-scoped. No source data is touched.
  await query(`DELETE FROM weekly_trail_snapshots WHERE user_id=$1 AND id IN (
    SELECT id FROM weekly_trail_snapshots WHERE user_id=$1 AND end_local_date<$2
    ORDER BY end_local_date,id LIMIT $3
  )`, [user.id, cutoff, getWeeklyTrailConfig().cleanupBatchSize]);
  return cutoff;
}
async function findSnapshot(user, periodKey, now) {
  const result = await query(`SELECT * FROM weekly_trail_snapshots
    WHERE user_id=$1 AND period_key=$2 AND end_local_date >= $3`, [user.id, periodKey, cutoffFor(user, now)]);
  return stored(result.rows[0]);
}
async function aggregate(user, period, now = new Date(), weekInProgress = false) {
  const start = getStartOfDayInTimezone(period.startLocalDate, period.timezone);
  const end = getStartOfDayInTimezone(shiftDateKey(period.endLocalDate, 1), period.timezone);
  const results = await Promise.all([
    query(`SELECT g.id,g.title,g.created_at,g.completed_at,
      COALESCE((to_jsonb(g)->>'is_active')::boolean, true) AS is_active,
      (SELECT max(u.date_key)::text FROM goal_updates u WHERE u.goal_id=g.id AND u.user_id=$1 AND u.date_key <= $3 AND NULLIF(btrim(u.text),'') IS NOT NULL) last_progress_date
      FROM goals g WHERE g.user_id=$1 AND g.created_at < $2`, [user.id, end, weekInProgress ? getDateKeyInTimezone(now, period.timezone) : period.endLocalDate]),
    query('SELECT goal_id,date_key::text,text,emotion FROM goal_updates WHERE user_id=$1 AND date_key >= $2 AND date_key <= $3', [user.id, period.startLocalDate, period.endLocalDate]),
    // Older deployed schemas omit lifecycle flags. JSON field access preserves
    // real values where present without requiring new source-table columns.
    query(`SELECT h.id,h.name,h.created_at,h.frequency,h.days_of_week,h.daily_target_count,
      COALESCE((to_jsonb(h)->>'is_archived')::boolean, false) AS is_archived,
      COALESCE((to_jsonb(h)->>'is_active')::boolean, true) AS is_active
      FROM habits h WHERE h.user_id=$1 AND h.created_at < $2`, [user.id,end]),
    // date_key is indexed; one extra day on either side covers changes in local timezone.
    query(`SELECT habit_id,date_key::text,occurred_at,status,completion_count,completion_times_mood FROM habit_logs
      WHERE user_id=$1 AND date_key >= $2::date - 1 AND date_key <= $3::date + 1`, [user.id,period.startLocalDate,period.endLocalDate]),
    DailyLogsEntry.find({ userId:Number(user.id),createdAt:{$gte:start,$lt:weekInProgress?now:end},mood:{$exists:true,$ne:null} }).select('mood createdAt -_id').lean()
  ]);
  return calculateWeek({ period, goals: results[0].rows, updates: results[1].rows, habits: results[2].rows, logs: results[3].rows, checkIns: results[4], now, weekInProgress });
}
async function finalizeWeek(user, periodKey, now = new Date()) {
  const timezone = timezoneOf(user);
  const period = periodFromKey(periodKey, timezone);
  // Validate retention before even reading a stored row: cleanup may leave a backlog.
  if (period.endLocalDate < cutoffFor(user, now)) throw error('Weekly Trail is outside the retention window',404);
  const existing = await findSnapshot(user, periodKey, now);
  if (existing) return existing;
  if (period.startLocalDate >= periodForDate(now,timezone).startLocalDate) throw error('Week is not complete',400);
  const recap = await aggregate(user,period,now);
  if (!shouldCreateWeeklyTrail(recap)) return null;
  const prior = await query(`SELECT recap FROM weekly_trail_snapshots
    WHERE user_id=$1 AND period_key<$2 AND end_local_date >= $3
    ORDER BY period_key DESC LIMIT 1`, [user.id, periodKey, cutoffFor(user, now)]);
  recap.narrative = narrativeFor(recap, prior.rows[0]?.recap);
  // Do not invent growth against a quiet week or a gap. Momentum remains unsupported.
  const result = await query(`INSERT INTO weekly_trail_snapshots(user_id,period_key,start_local_date,end_local_date,timezone_at_finalization,formula_version,recap)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(user_id,period_key) DO NOTHING RETURNING *`,
  [user.id,periodKey,period.startLocalDate,period.endLocalDate,timezone,recap.formulaVersion,JSON.stringify(recap)]);
  if (result.rows[0]) logger.info('weekly_trail_finalized', { userId: user.id, periodKey, formulaVersion: recap.formulaVersion });
  return stored(result.rows[0]) || findSnapshot(user,periodKey,now);
}
async function finalizePrevious(user, now = new Date()) {
  const current = periodForDate(now,timezoneOf(user));
  const previous = periodForDate(getStartOfDayInTimezone(shiftDateKey(current.startLocalDate,-1),timezoneOf(user)),timezoneOf(user));
  if (previous.endLocalDate < cutoffFor(user,now)) return null;
  return finalizeWeek(user,previous.periodKey,now);
}
async function current(user, now = new Date()) {
  await cleanupExpired(user,now);
  // Current-week calculations never persist an active-week snapshot.
  return aggregate(user,periodForDate(now,timezoneOf(user)),now,true);
}
async function getWeek(user, key, now = new Date()) {
  if (key === 'current') return current(user,now);
  const period = periodFromKey(key,timezoneOf(user));
  await cleanupExpired(user,now);
  if (period.endLocalDate < cutoffFor(user,now)) throw error('Weekly Trail is outside the retention window',404);
  const existing = await findSnapshot(user,key,now);
  if (existing) return existing;
  if (key === periodForDate(now,timezoneOf(user)).periodKey) return aggregate(user,period,now,true);
  const recap = await finalizeWeek(user,key,now);
  if (!recap) throw error('This week does not have enough meaningful activity for a recap',404);
  return recap;
}
function summary(recap) {
  return Object.fromEntries(['id','periodKey','startLocalDate','endLocalDate','timezone','goalsProgressed','habitCompletions','habitConsistency','activeDays','weekInProgress','narrative'].map(key => [key,recap[key]]));
}
async function history(user, { cursor, limit = 20 } = {}, now = new Date()) {
  if (cursor) periodFromKey(cursor);
  const size = Math.max(1,Math.min(50,Math.floor(Number(limit)||20)));
  const cutoff = await cleanupExpired(user,now);
  // Explicit product instruction: no backfill. Inspect only the previous week on
  // the initial history request; pagination reads existing snapshots exclusively.
  if (!cursor) await finalizePrevious(user,now);
  const result = await query(`SELECT * FROM weekly_trail_snapshots WHERE user_id=$1
    AND ($2::text IS NULL OR period_key<$2) AND end_local_date >= $4
    ORDER BY period_key DESC LIMIT $3`,[user.id,cursor||null,size+1,cutoff]);
  const rows = result.rows.slice(0,size);
  return { items: rows.map(row => summary(stored(row))), nextCursor: result.rows.length>size ? rows.at(-1).period_key : null,
    retention: { months:getWeeklyTrailConfig().retentionMonths, cutoffLocalDate:cutoff } };
}
async function teaser(user, now = new Date()) {
  const cutoff = await cleanupExpired(user,now);
  await finalizePrevious(user,now);
  const result = await query(`SELECT * FROM weekly_trail_snapshots WHERE user_id=$1 AND end_local_date >= $2
    ORDER BY period_key DESC LIMIT 1`,[user.id,cutoff]);
  const latest = stored(result.rows[0]);
  const seen = await query('SELECT last_seen_weekly_trail_period_key FROM users WHERE id=$1',[user.id]);
  if (latest && latest.periodKey > (seen.rows[0]?.last_seen_weekly_trail_period_key || '')) return { state:'NEW_RECAP',isUnread:true,recap:latest };
  const recap = await aggregate(user,periodForDate(now,timezoneOf(user)),now,true);
  return { state:recap.activeDays ? 'CURRENT':'NO_DATA',isUnread:false,recap,latestRecap:latest ? { ...summary(latest), state:'SEEN_RECAP' } : null };
}
async function markSeen(user,key,now = new Date()) {
  const period = periodFromKey(key,timezoneOf(user));
  await cleanupExpired(user,now);
  if (period.endLocalDate < cutoffFor(user,now) || !await findSnapshot(user,key,now)) throw error('Recap not found',404);
  await query("UPDATE users SET last_seen_weekly_trail_period_key=GREATEST(COALESCE(last_seen_weekly_trail_period_key,''),$2) WHERE id=$1",[user.id,key]);
}
module.exports = { current, getWeek, history, teaser, markSeen, finalizeWeek, finalizePrevious, cleanupExpired, summary };
