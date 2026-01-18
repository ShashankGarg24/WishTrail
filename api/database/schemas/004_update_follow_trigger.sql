-- Update the follow counts trigger to remove is_active references
-- Run this to fix the trigger error

-- Drop columns if they still exist
ALTER TABLE follows DROP COLUMN IF EXISTS is_active;
ALTER TABLE follows DROP COLUMN IF EXISTS notifications_enabled;
ALTER TABLE follows DROP COLUMN IF EXISTS updated_at;

-- Drop old indexes
DROP INDEX IF EXISTS idx_follows_active;

-- Recreate indexes without is_active
DROP INDEX IF EXISTS idx_follows_follower;
DROP INDEX IF EXISTS idx_follows_following;
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Update the trigger function
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') THEN
    -- Increment counts
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle status changes
    IF (OLD.status != 'accepted') AND (NEW.status = 'accepted') THEN
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (OLD.status = 'accepted') AND (NEW.status != 'accepted') THEN
      UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = NEW.following_id;
    END IF;
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'accepted') THEN
    -- Decrement counts
    UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
