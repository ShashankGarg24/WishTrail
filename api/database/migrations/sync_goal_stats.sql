

-- 1. One-time re-sync: recalculate total_goals and completed_goals from actual rows
--    This corrects any drift that existed before this migration.
UPDATE users u
SET
  total_goals     = sub.total_goals,
  completed_goals = sub.completed_goals,
  updated_at      = CURRENT_TIMESTAMP
FROM (
  SELECT
    user_id,
    COUNT(*)                                         AS total_goals,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed_goals
  FROM goals
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

-- Zero out counters for users who have no goals at all (not covered by the JOIN above)
UPDATE users
SET total_goals     = 0,
    completed_goals = 0,
    updated_at      = CURRENT_TIMESTAMP
WHERE id NOT IN (SELECT DISTINCT user_id FROM goals);
