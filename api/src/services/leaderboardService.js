const { query } = require('../config/supabase');

// Rank before searching or paginating so positions remain global. Activity is
// distinct local days with a completed goal or a target-qualified habit log.
async function getDashboard({ type = 'goals', timeframe = 'all', page = 1, limit = 20, search = '', userId = null }) {
  const metric = type === 'activeDays' ? 'activeDays' : 'completedGoals';
  const eligibilityMinimum = type === 'goals' && timeframe === 'all' ? 5 : 1;
  const result = await query(`
    WITH goal_counts AS (
      SELECT g.user_id, COUNT(*)::int AS completed
      FROM goals g JOIN users u ON u.id = g.user_id
      WHERE g.completed_at IS NOT NULL AND g.completed_at <= NOW()
        AND ($1 = 'all' OR (g.completed_at AT TIME ZONE COALESCE(NULLIF(u.timezone, ''), 'UTC'))::date >=
          CASE $1 WHEN 'week' THEN CURRENT_DATE - 6 WHEN 'month' THEN CURRENT_DATE - 29 ELSE DATE_TRUNC('year', CURRENT_DATE)::date END)
      GROUP BY g.user_id
    ), activity_dates AS (
      SELECT g.user_id, (g.completed_at AT TIME ZONE COALESCE(NULLIF(u.timezone, ''), 'UTC'))::date AS day
      FROM goals g JOIN users u ON u.id = g.user_id
      WHERE g.completed_at IS NOT NULL AND g.completed_at <= NOW()
      UNION
      SELECT hl.user_id, hl.date_key AS day FROM habit_logs hl
      JOIN habits h ON h.id = hl.habit_id
      WHERE hl.status = 'done' AND hl.completion_count >= GREATEST(1, COALESCE(h.daily_target_count, 1))
    ), activity_counts AS (
      SELECT user_id, COUNT(DISTINCT day)::int AS days FROM activity_dates
      WHERE day <= CURRENT_DATE AND ($1 = 'all' OR day >=
        CASE $1 WHEN 'week' THEN CURRENT_DATE - 6 WHEN 'month' THEN CURRENT_DATE - 29 ELSE DATE_TRUNC('year', CURRENT_DATE)::date END)
      GROUP BY user_id
    ), scores AS (
      SELECT u.id, u.name, u.username, u.avatar_url AS avatar,
        CASE WHEN $1 = 'all' THEN COALESCE(u.completed_goals, 0) ELSE COALESCE(g.completed, 0) END AS "completedGoals", COALESCE(a.days, 0) AS "activeDays"
      FROM users u LEFT JOIN goal_counts g ON g.user_id = u.id
      LEFT JOIN activity_counts a ON a.user_id = u.id
      WHERE u.is_active = true
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY "${metric}" DESC, id ASC)::int AS rank
      FROM scores WHERE "${metric}" >= ${eligibilityMinimum}
    ), filtered AS (
      SELECT * FROM ranked WHERE $2 = '' OR POSITION(LOWER($2) IN LOWER(COALESCE(name, '') || ' ' || COALESCE(username, ''))) > 0
    )
    SELECT
      COALESCE((SELECT JSON_AGG(t ORDER BY rank) FROM (SELECT * FROM filtered ORDER BY rank LIMIT $3 OFFSET $4) t), '[]') AS leaderboard,
      COALESCE((SELECT JSON_AGG(t ORDER BY rank) FROM (SELECT * FROM ranked ORDER BY rank LIMIT 3) t), '[]') AS "topThree",
      (SELECT ROW_TO_JSON(t) FROM (
        SELECT s.*, r.rank
        FROM scores s LEFT JOIN ranked r ON r.id = s.id
        WHERE s.id = $5
      ) t) AS "yourRank",
      (SELECT COUNT(*)::int FROM filtered) AS total,
      (SELECT JSON_BUILD_OBJECT('participants', COUNT(*), 'completedGoals', COALESCE(SUM("completedGoals"), 0),
        'averageGoals', COALESCE(ROUND(AVG("completedGoals"), 1), 0)) FROM ranked) AS stats
  `, [timeframe, search, limit, (page - 1) * limit, userId]);
  const { total, ...data } = result.rows[0];
  return {
    ...data,
    eligibilityMinimum,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
  };
}

module.exports = { getDashboard };
