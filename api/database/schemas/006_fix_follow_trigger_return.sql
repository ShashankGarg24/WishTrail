-- Fix the follow counts trigger to return the correct value for DELETE operations
-- The trigger was returning NEW for all operations, but NEW is NULL for DELETE

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') THEN
    -- Increment counts
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle status changes
    IF (OLD.status != 'accepted') AND (NEW.status = 'accepted') THEN
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (OLD.status = 'accepted') AND (NEW.status != 'accepted') THEN
      UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = NEW.following_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'accepted') THEN
    -- Decrement counts
    UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  
  -- Default return for other cases
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
