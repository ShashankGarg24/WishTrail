-- Migration: Add Premium Support
-- Created: 2026-01-13
-- Description: Adds premium subscription tracking with timestamp-based expiration

-- Add premium_expires_at column to users table
ALTER TABLE users 
ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.premium_expires_at IS 'Premium subscription expiration timestamp. NULL = free user, future timestamp = active premium, past timestamp = expired premium';

-- Create index for efficient premium user queries
CREATE INDEX idx_users_premium_active ON users(premium_expires_at) 
WHERE premium_expires_at IS NOT NULL AND premium_expires_at > CURRENT_TIMESTAMP;

-- Create index for expired premium users (for re-engagement campaigns)
CREATE INDEX idx_users_premium_expired ON users(premium_expires_at) 
WHERE premium_expires_at IS NOT NULL AND premium_expires_at <= CURRENT_TIMESTAMP;

-- Add function to check if user is premium
CREATE OR REPLACE FUNCTION is_user_premium(user_premium_expires_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_premium_expires_at IS NOT NULL AND user_premium_expires_at > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example queries for reference:
-- Check if user is premium: SELECT is_user_premium(premium_expires_at) FROM users WHERE id = 123;
-- Get all active premium users: SELECT * FROM users WHERE premium_expires_at > CURRENT_TIMESTAMP;
-- Get users with premium expiring in 7 days: SELECT * FROM users WHERE premium_expires_at BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days';
