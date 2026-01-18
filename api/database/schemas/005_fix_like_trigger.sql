-- Fix like trigger to work with DELETE operations instead of is_active toggle
-- Migration: 005_fix_like_trigger.sql
-- Created: 2026-01-19

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_update_goal_like_count ON likes;
DROP FUNCTION IF EXISTS update_goal_like_count();

-- Create updated function that doesn't reference is_active
CREATE OR REPLACE FUNCTION update_goal_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.target_type = 'goal') THEN
    -- Increment like count when like is inserted
    UPDATE goals SET like_count = like_count + 1 WHERE id = NEW.target_id::BIGINT;
  ELSIF (TG_OP = 'DELETE' AND OLD.target_type = 'goal') THEN
    -- Decrement like count when like is deleted
    UPDATE goals SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id::BIGINT;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_goal_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_goal_like_count();

-- Optional: Remove is_active column if no longer needed
-- Uncomment the following lines to drop the is_active column:
-- ALTER TABLE likes DROP COLUMN IF EXISTS is_active;
-- DROP INDEX IF EXISTS idx_likes_target_active;
