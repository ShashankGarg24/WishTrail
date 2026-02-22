-- Migration: 008_remove_goal_count_trigger.sql
-- Purpose:
--   Remove the DB trigger that managed total_goals / completed_goals on the users table.
--   All counter maintenance is now handled exclusively in application code (goalService /
--   goalController) to prevent double-counting and to keep the behaviour predictable.
--
-- IMPORTANT: Run the re-sync block at the bottom AFTER deploying the updated application
--            code so counts reflect real data from the start.
-- ================================================================================

-- 1. Drop the trigger from the goals table
DROP TRIGGER IF EXISTS trigger_update_user_goal_counts ON goals;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS update_user_goal_counts();

-- 3. One-time re-sync: recalculate total_goals and completed_goals from actual rows
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
