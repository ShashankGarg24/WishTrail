-- WishTrail PostgreSQL Schema
-- Database: Supabase PostgreSQL
-- Created: 2025-12-30

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  google_id VARCHAR(255),
  avatar_url TEXT DEFAULT '',
  bio VARCHAR(500) DEFAULT '',
  location VARCHAR(100) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  date_of_birth DATE,
  gender VARCHAR(20),
  
  -- Stats
  total_goals INTEGER DEFAULT 0 CHECK (total_goals >= 0),
  completed_goals INTEGER DEFAULT 0 CHECK (completed_goals >= 0),
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  
  -- Counts
  followers_count INTEGER DEFAULT 0 CHECK (followers_count >= 0),
  following_count INTEGER DEFAULT 0 CHECK (following_count >= 0),
  
  -- Status
  is_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  
  -- Auth tracking
  login_count INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  refresh_token_app TEXT,
  refresh_token_web TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9._-]{3,20}$')
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_completed_goals ON users(completed_goals DESC);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', name || ' ' || username || ' ' || COALESCE(bio, '')));
CREATE INDEX idx_users_gender ON users(gender) WHERE gender IS NOT NULL;

-- Updated at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  
  -- Status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  target_date TIMESTAMP WITH TIME ZONE,
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  is_discoverable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Community flags
  is_community_source BOOLEAN DEFAULT false,
  
  -- Metrics (denormalized for performance)
  like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN (
    'Health & Fitness', 'Education & Learning', 'Career & Business',
    'Personal Development', 'Financial Goals', 'Creative Projects',
    'Travel & Adventure', 'Relationships', 'Family & Friends', 'Other'
  )),
  CONSTRAINT valid_year CHECK (year BETWEEN 2020 AND 2100),
  CONSTRAINT completed_requires_date CHECK (
    (completed = false) OR (completed = true AND completed_at IS NOT NULL)
  )
);

-- Indexes for goals
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_created_at ON goals(created_at DESC);
CREATE INDEX idx_goals_completed ON goals(completed);
CREATE INDEX idx_goals_year ON goals(year);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_user_year ON goals(user_id, year);
CREATE INDEX idx_goals_user_completed ON goals(user_id, completed);
CREATE INDEX idx_goals_discoverable ON goals(is_discoverable, is_active) WHERE is_discoverable = true AND is_active = true;
CREATE INDEX idx_goals_public ON goals(is_public, completed) WHERE is_public = true;
CREATE INDEX idx_goals_search ON goals USING gin(to_tsvector('english', title));

-- Updated at trigger for goals
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) DEFAULT '',
  
  -- Scheduling
  frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  days_of_week INTEGER[] DEFAULT NULL, -- Array of 0-6 (Sun-Sat)
  timezone VARCHAR(50) DEFAULT 'UTC',
  reminders JSONB DEFAULT '[]'::jsonb,
  
  -- Target tracking
  target_type VARCHAR(20) DEFAULT 'count' CHECK (target_type IN ('count', 'duration', 'boolean')),
  target_value NUMERIC DEFAULT 1,
  target_unit VARCHAR(20) DEFAULT '',
  target_completions INTEGER DEFAULT NULL CHECK (target_completions IS NULL OR target_completions >= 0),
  target_days INTEGER DEFAULT NULL CHECK (target_days IS NULL OR target_days >= 0),
  
  -- Streaks and stats
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  max_streak INTEGER DEFAULT 0 CHECK (max_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  last_completed_date DATE,
  last_logged_date_key VARCHAR(10) DEFAULT '',
  total_completions INTEGER DEFAULT 0 CHECK (total_completions >= 0),
  total_days INTEGER DEFAULT 0 CHECK (total_days >= 0),
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  
  -- Community integration (VARCHAR(50) to support both MongoDB ObjectIds and PostgreSQL BigInts as strings)
  community_id VARCHAR(50),
  community_item_id VARCHAR(50),
  community_source_id VARCHAR(50),
  is_community_source BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for habits
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_goal_id ON habits(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_habits_active ON habits(is_active) WHERE is_active = true;
CREATE INDEX idx_habits_frequency ON habits(frequency);
CREATE INDEX idx_habits_user_active ON habits(user_id, is_active);

-- Updated at trigger for habits
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABIT_LOGS TABLE (Time-series data)
-- ============================================
CREATE TABLE IF NOT EXISTS habit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date_key DATE NOT NULL, -- YYYY-MM-DD for daily tracking
  status VARCHAR(20) DEFAULT 'done' CHECK (status IN ('done', 'missed', 'skipped')),
  value NUMERIC DEFAULT 1, -- Actual value (reps, minutes, etc.)
  note VARCHAR(400) DEFAULT '',
  mood VARCHAR(20) CHECK (mood IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
  journal_entry_id VARCHAR(24), -- MongoDB ObjectId reference
  completion_count INTEGER DEFAULT 0 CHECK (completion_count >= 0),
  completion_times TIMESTAMP WITH TIME ZONE[] DEFAULT ARRAY[]::TIMESTAMP WITH TIME ZONE[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one log per habit per day
  CONSTRAINT unique_habit_log_per_day UNIQUE (habit_id, date_key)
);

-- Indexes for habit_logs
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date_key ON habit_logs(date_key DESC);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, date_key DESC);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, date_key DESC);
CREATE INDEX idx_habit_logs_status ON habit_logs(status);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  is_active BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Indexes for follows
CREATE INDEX idx_follows_follower ON follows(follower_id, is_active);
CREATE INDEX idx_follows_following ON follows(following_id, is_active);
CREATE INDEX idx_follows_status ON follows(status);
CREATE INDEX idx_follows_active ON follows(is_active) WHERE is_active = true;

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('goal', 'activity', 'activity_comment')),
  target_id VARCHAR(50) NOT NULL, -- Can be BigInt (goal) or MongoDB ObjectId string
  reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'inspire')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one like per user per target
  CONSTRAINT unique_like UNIQUE (user_id, target_type, target_id)
);

-- Indexes for likes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_target_active ON likes(target_type, target_id, is_active) WHERE is_active = true;
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

-- ============================================
-- BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Indexes for blocks
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id, is_active);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id, is_active);
CREATE INDEX idx_blocks_active ON blocks(is_active) WHERE is_active = true;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted' AND NEW.is_active = true) THEN
    -- Increment counts
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle status or active changes
    IF (OLD.status != 'accepted' OR OLD.is_active = false) AND (NEW.status = 'accepted' AND NEW.is_active = true) THEN
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (OLD.status = 'accepted' AND OLD.is_active = true) AND (NEW.status != 'accepted' OR NEW.is_active = false) THEN
      UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = NEW.following_id;
    END IF;
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'accepted' AND OLD.is_active = true) THEN
    -- Decrement counts
    UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update goal counts in users table
CREATE OR REPLACE FUNCTION update_user_goal_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE users SET total_goals = total_goals + 1 WHERE id = NEW.user_id;
    IF NEW.completed THEN
      UPDATE users SET completed_goals = completed_goals + 1 WHERE id = NEW.user_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle completion status change
    IF OLD.completed = false AND NEW.completed = true THEN
      UPDATE users SET completed_goals = completed_goals + 1 WHERE id = NEW.user_id;
    ELSIF OLD.completed = true AND NEW.completed = false THEN
      UPDATE users SET completed_goals = GREATEST(0, completed_goals - 1) WHERE id = NEW.user_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE users SET total_goals = GREATEST(0, total_goals - 1) WHERE id = OLD.user_id;
    IF OLD.completed THEN
      UPDATE users SET completed_goals = GREATEST(0, completed_goals - 1) WHERE id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_goal_counts
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_user_goal_counts();

-- Function to update like counts on goals
CREATE OR REPLACE FUNCTION update_goal_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.target_type = 'goal' AND NEW.is_active = true) THEN
    UPDATE goals SET like_count = like_count + 1 WHERE id = NEW.target_id::BIGINT;
  ELSIF (TG_OP = 'UPDATE' AND NEW.target_type = 'goal') THEN
    IF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE goals SET like_count = like_count + 1 WHERE id = NEW.target_id::BIGINT;
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE goals SET like_count = GREATEST(0, like_count - 1) WHERE id = NEW.target_id::BIGINT;
    END IF;
  ELSIF (TG_OP = 'DELETE' AND OLD.target_type = 'goal' AND OLD.is_active = true) THEN
    UPDATE goals SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id::BIGINT;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_like_count
  AFTER INSERT OR UPDATE OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_goal_like_count();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active users with stats
CREATE OR REPLACE VIEW active_users_with_stats AS
SELECT 
  id,
  name,
  username,
  email,
  avatar_url,
  bio,
  location,
  date_of_birth,
  gender,
  total_goals,
  completed_goals,
  CASE WHEN total_goals > 0 
    THEN ROUND((completed_goals::NUMERIC / total_goals::NUMERIC) * 100, 2)
    ELSE 0 
  END as completion_rate,
  current_streak,
  longest_streak,
  followers_count,
  following_count,
  is_private,
  created_at,
  last_active_at
FROM users
WHERE is_active = true;

-- User goal summary by year
CREATE OR REPLACE VIEW user_goal_summary AS
SELECT 
  user_id,
  year,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE completed = true) as completed,
  COUNT(*) FILTER (WHERE completed = false) as pending,
  category,
  COUNT(*) FILTER (WHERE completed = true AND category IS NOT NULL) as completed_in_category
FROM goals
WHERE is_active = true
GROUP BY user_id, year, category;

-- ============================================
-- INITIAL DATA / SEED
-- ============================================
-- Add any seed data here if needed

-- ============================================
-- GRANTS (adjust based on your Supabase setup)
-- ============================================
-- Supabase handles this automatically, but you can add custom grants if needed
