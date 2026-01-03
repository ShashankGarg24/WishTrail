-- Add timezone and locale fields to users table
-- This allows us to store all times in UTC and parse according to user's timezone

ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';

-- Add comments for documentation
COMMENT ON COLUMN users.timezone IS 'User timezone in IANA format (e.g., America/New_York, Asia/Kolkata)';
COMMENT ON COLUMN users.locale IS 'User locale for formatting dates, numbers, etc. (e.g., en-US, es-ES)';

-- Create index for timezone queries (optional, but useful for analytics)
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
