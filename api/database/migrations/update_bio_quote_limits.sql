-- Migration: Update bio and quote character limits
-- Date: 2026-02-12
-- Description: Change bio limit from 500 to 200 characters

-- Update bio column limit to 200 characters
ALTER TABLE users 
ALTER COLUMN bio TYPE VARCHAR(200);

-- Note: Quote is stored in MongoDB UserPreferences.preferences.quote
-- and has been updated from 200 to 100 characters in the schema
