/**
 * MongoDB to PostgreSQL Data Migration Script
 * 
 * This script migrates data from MongoDB to PostgreSQL for the hybrid database architecture.
 * It handles: Users, Goals, Habits, Follows, Likes, Blocks, HabitLogs
 * 
 * IMPORTANT: 
 * - Run this script with a database backup
 * - Test on a subset of data first
 * - Monitor progress and errors carefully
 * - Keep this script for rollback reference
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { query, getClient } = require('../src/config/supabase');
const connectDB = require('../src/config/database');

// MongoDB Models
const User = require('../src/models/User');
const Goal = require('../src/models/Goal');
const Habit = require('../src/models/Habit');
const Follow = require('../src/models/Follow');
const Like = require('../src/models/Like');
const Block = require('../src/models/Block');
const HabitLog = require('../src/models/HabitLog');

// Extended MongoDB Models (for new structure)
const GoalDetails = require('../src/models/extended/GoalDetails');
const UserPreferences = require('../src/models/extended/UserPreferences');

// PostgreSQL Services
const {
  pgUserService,
  pgGoalService,
  pgHabitService,
  pgHabitLogService,
  pgFollowService,
  pgLikeService,
  pgBlockService
} = require('../src/services');

// Migration state tracking
const migrationState = {
  users: { total: 0, migrated: 0, failed: 0, mapping: new Map() },
  goals: { total: 0, migrated: 0, failed: 0, mapping: new Map() },
  habits: { total: 0, migrated: 0, failed: 0, mapping: new Map() },
  follows: { total: 0, migrated: 0, failed: 0 },
  likes: { total: 0, migrated: 0, failed: 0 },
  blocks: { total: 0, migrated: 0, failed: 0 },
  habitLogs: { total: 0, migrated: 0, failed: 0 },
  errors: []
};

/**
 * Log progress
 */
function logProgress(entity, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${entity}] ${message}`);
}

/**
 * Log error
 */
function logError(entity, message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${entity}] ERROR: ${message}`, error.message);
  migrationState.errors.push({ entity, message, error: error.message, timestamp });
}

/**
 * Migrate Users
 */
async function migrateUsers(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('USERS', 'Starting user migration...');
  
  try {
    let query = User.find({}).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const users = await query.lean();
    migrationState.users.total = users.length;
    
    logProgress('USERS', `Found ${users.length} users to migrate`);
    
    for (let i = 0; i < users.length; i++) {
      const mongoUser = users[i];
      
      try {
        // Create user in PostgreSQL with pre-hashed password
        // For Google SSO users without password, use a secure dummy hash
        const password = mongoUser.password || '$2b$10$GOOGLE_SSO_NO_PASSWORD_DUMMY_HASH_PLACEHOLDER';
        
        const pgUser = await pgUserService.createUserWithHashedPassword({
          name: mongoUser.name,
          username: mongoUser.username,
          email: mongoUser.email,
          password: password, // Already hashed in MongoDB, or dummy for SSO users
          bio: mongoUser.bio || '',
          avatarUrl: mongoUser.avatarUrl || null,
          coverImageUrl: mongoUser.coverImageUrl || null,
          location: mongoUser.location || null,
          website: mongoUser.website || null,
          dateOfBirth: mongoUser.dateOfBirth || null,
          gender: mongoUser.gender || null,
          totalGoals: mongoUser.totalGoals || 0,
          completedGoals: mongoUser.completedGoals || 0,
          followersCount: mongoUser.followersCount || 0,
          followingCount: mongoUser.followingCount || 0,
          isVerified: mongoUser.isVerified || false,
          isActive: mongoUser.isActive !== false
        });
        
        // Store ID mapping
        migrationState.users.mapping.set(mongoUser._id.toString(), pgUser.id);
        
        // Create user preferences in MongoDB (extended model)
        await UserPreferences.create({
          userId: pgUser.id,
          interests: mongoUser.interests || [],
          privacy: mongoUser.privacy || {},
          notifications: mongoUser.notifications || {},
          preferences: mongoUser.preferences || {},
          socialLinks: mongoUser.socialLinks || {},
          blockedUsers: [] // Will be populated during block migration
        });
        
        migrationState.users.migrated++;
        
        if ((i + 1) % 100 === 0) {
          logProgress('USERS', `Migrated ${i + 1}/${users.length} users`);
        }
      } catch (error) {
        migrationState.users.failed++;
        logError('USERS', `Failed to migrate user ${mongoUser.username}`, error);
      }
    }
    
    logProgress('USERS', `Completed: ${migrationState.users.migrated} migrated, ${migrationState.users.failed} failed`);
  } catch (error) {
    logError('USERS', 'User migration failed', error);
    throw error;
  }
}

/**
 * Migrate Goals
 */
async function migrateGoals(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('GOALS', 'Starting goal migration...');
  
  try {
    let query = Goal.find({}).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const goals = await query.lean();
    migrationState.goals.total = goals.length;
    
    logProgress('GOALS', `Found ${goals.length} goals to migrate`);
    
    for (let i = 0; i < goals.length; i++) {
      const mongoGoal = goals[i];
      
      try {
        const pgUserId = migrationState.users.mapping.get(mongoGoal.userId?.toString());
        if (!pgUserId) {
          throw new Error(`User mapping not found for goal ${mongoGoal._id}`);
        }
        
        // Create core goal in PostgreSQL
        const pgGoal = await pgGoalService.createGoal({
          userId: pgUserId,
          title: mongoGoal.title,
          category: mongoGoal.category,
          year: mongoGoal.year || new Date(mongoGoal.createdAt).getFullYear(),
          targetDate: mongoGoal.targetDate || null,
          isPublic: mongoGoal.isPublic !== false,
          isDiscoverable: mongoGoal.isDiscoverable !== false,
          completed: mongoGoal.completed || false,
          completedAt: mongoGoal.completedAt || null,
          likesCount: mongoGoal.likesCount || 0
        });
        
        // Store ID mapping
        migrationState.goals.mapping.set(mongoGoal._id.toString(), pgGoal.id);
        
        // Transform subGoals to map linkedGoalId from MongoDB ObjectId to PostgreSQL BigInt
        const transformedSubGoals = (mongoGoal.subGoals || []).map(subGoal => {
          const transformed = { ...subGoal };
          
          // Convert linkedGoalId from MongoDB ObjectId to PostgreSQL ID
          if (transformed.linkedGoalId) {
            const linkedPgId = migrationState.goals.mapping.get(transformed.linkedGoalId.toString());
            transformed.linkedGoalId = linkedPgId || null;
          }
          
          // Ensure title exists
          if (!transformed.title) {
            transformed.title = 'Untitled Sub-Goal';
          }
          
          return transformed;
        });
        
        // Create goal details in MongoDB (extended model) - skip if exists
        const existingDetails = await GoalDetails.findOne({ goalId: pgGoal.id });
        if (!existingDetails) {
          await GoalDetails.create({
            goalId: pgGoal.id,
            description: mongoGoal.description || '',
            subGoals: transformedSubGoals,
            habitLinks: [], // Will be updated after habit migration
            progress: mongoGoal.progress || { percentage: 0, completed: 0, total: 0 },
            completionNote: mongoGoal.completionNote || '',
            completionAttachmentUrl: mongoGoal.completionAttachmentUrl || null,
            metadata: {
              tags: mongoGoal.tags || [],
              visibility: mongoGoal.visibility || 'public',
              originalMongoId: mongoGoal._id.toString()
            }
          });
        }
        
        migrationState.goals.migrated++;
        
        if ((i + 1) % 100 === 0) {
          logProgress('GOALS', `Migrated ${i + 1}/${goals.length} goals`);
        }
      } catch (error) {
        migrationState.goals.failed++;
        logError('GOALS', `Failed to migrate goal ${mongoGoal._id}`, error);
      }
    }
    
    logProgress('GOALS', `Completed: ${migrationState.goals.migrated} migrated, ${migrationState.goals.failed} failed`);
  } catch (error) {
    logError('GOALS', 'Goal migration failed', error);
    throw error;
  }
}

/**
 * Migrate Habits
 */
async function migrateHabits(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('HABITS', 'Starting habit migration...');
  
  try {
    let query = Habit.find({}).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const habits = await query.lean();
    migrationState.habits.total = habits.length;
    
    logProgress('HABITS', `Found ${habits.length} habits to migrate`);
    
    for (let i = 0; i < habits.length; i++) {
      const mongoHabit = habits[i];
      
      try {
        const pgUserId = migrationState.users.mapping.get(mongoHabit.userId?.toString());
        if (!pgUserId) {
          throw new Error(`User mapping not found for habit ${mongoHabit._id}`);
        }
        
        const pgGoalId = mongoHabit.goalId 
          ? migrationState.goals.mapping.get(mongoHabit.goalId.toString())
          : null;
        
        // Create habit in PostgreSQL
        const pgHabit = await pgHabitService.createHabit({
          userId: pgUserId,
          name: mongoHabit.name,
          description: mongoHabit.description || '',
          frequency: mongoHabit.frequency || 'daily',
          daysOfWeek: mongoHabit.daysOfWeek || null,
          timezone: mongoHabit.timezone || 'UTC',
          reminders: mongoHabit.reminders || [],
          goalId: pgGoalId,
          targetCompletions: mongoHabit.targetCompletions || null,
          targetDays: mongoHabit.targetDays || null,
          isPublic: mongoHabit.isPublic !== false,
          communityId: mongoHabit.communityInfo?.communityId || null,
          communityItemId: mongoHabit.communityInfo?.itemId || null,
          communitySourceId: mongoHabit.communityInfo?.sourceId || null,
          isCommunitySource: mongoHabit.isCommunitySource || false
        });
        
        // Update stats
        await pgHabitService.updateHabitStats(pgHabit.id, {
          currentStreak: mongoHabit.currentStreak || 0,
          longestStreak: mongoHabit.longestStreak || 0,
          lastLoggedDateKey: mongoHabit.lastLoggedDateKey || '',
          totalCompletions: mongoHabit.totalCompletions || 0,
          totalDays: mongoHabit.totalDays || 0
        });
        
        // Store ID mapping
        migrationState.habits.mapping.set(mongoHabit._id.toString(), pgHabit.id);
        
        migrationState.habits.migrated++;
        
        if ((i + 1) % 100 === 0) {
          logProgress('HABITS', `Migrated ${i + 1}/${habits.length} habits`);
        }
      } catch (error) {
        migrationState.habits.failed++;
        logError('HABITS', `Failed to migrate habit ${mongoHabit._id}`, error);
      }
    }
    
    logProgress('HABITS', `Completed: ${migrationState.habits.migrated} migrated, ${migrationState.habits.failed} failed`);
  } catch (error) {
    logError('HABITS', 'Habit migration failed', error);
    throw error;
  }
}

/**
 * Migrate Habit Logs
 */
async function migrateHabitLogs(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('HABIT_LOGS', 'Starting habit log migration...');
  
  try {
    let query = HabitLog.find({}).sort({ dateKey: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const habitLogs = await query.lean();
    migrationState.habitLogs.total = habitLogs.length;
    
    logProgress('HABIT_LOGS', `Found ${habitLogs.length} habit logs to migrate`);
    
    for (let i = 0; i < habitLogs.length; i++) {
      const mongoLog = habitLogs[i];
      
      try {
        const pgUserId = migrationState.users.mapping.get(mongoLog.userId?.toString());
        const pgHabitId = migrationState.habits.mapping.get(mongoLog.habitId?.toString());
        
        if (!pgUserId || !pgHabitId) {
          throw new Error(`Mapping not found for habit log ${mongoLog._id}`);
        }
        
        // Format dateKey properly (ensure it's YYYY-MM-DD string)
        let dateKey = mongoLog.dateKey;
        if (dateKey instanceof Date) {
          dateKey = dateKey.toISOString().split('T')[0];
        } else if (typeof dateKey === 'string' && dateKey.includes('T')) {
          dateKey = dateKey.split('T')[0];
        }
        // Ensure it's a clean string (trim any whitespace)
        dateKey = String(dateKey).trim();
        console.log('Migrating habit log dateKey:', dateKey);
        console.log(typeof dateKey);
        // Create habit log in PostgreSQL
        await pgHabitLogService.logHabit({
          userId: pgUserId,
          habitId: pgHabitId,
          dateKey: dateKey,
          status: mongoLog.status || 'done',
          note: mongoLog.note || '',
          mood: mongoLog.mood || 'neutral',
          journalEntryId: null, // Journal entries stay in MongoDB
          completionCount: mongoLog.completionCount || 1
        });
        
        migrationState.habitLogs.migrated++;
        
        if ((i + 1) % 500 === 0) {
          logProgress('HABIT_LOGS', `Migrated ${i + 1}/${habitLogs.length} habit logs`);
        }
      } catch (error) {
        migrationState.habitLogs.failed++;
        logError('HABIT_LOGS', `Failed to migrate habit log ${mongoLog._id}`, error);
      }
    }
    
    logProgress('HABIT_LOGS', `Completed: ${migrationState.habitLogs.migrated} migrated, ${migrationState.habitLogs.failed} failed`);
  } catch (error) {
    logError('HABIT_LOGS', 'Habit log migration failed', error);
    throw error;
  }
}

/**
 * Migrate Follows
 */
async function migrateFollows(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('FOLLOWS', 'Starting follow migration...');
  
  try {
    let query = Follow.find({ isActive: true }).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const follows = await query.lean();
    migrationState.follows.total = follows.length;
    
    logProgress('FOLLOWS', `Found ${follows.length} follows to migrate`);
    
    for (let i = 0; i < follows.length; i++) {
      const mongoFollow = follows[i];
      
      try {
        const pgFollowerId = migrationState.users.mapping.get(mongoFollow.followerId?.toString());
        const pgFollowingId = migrationState.users.mapping.get(mongoFollow.followingId?.toString());
        
        if (!pgFollowerId || !pgFollowingId) {
          throw new Error(`User mapping not found for follow ${mongoFollow._id}`);
        }
        
        // Create follow in PostgreSQL
        await pgFollowService.followUser(pgFollowerId, pgFollowingId, {
          status: mongoFollow.status || 'accepted',
          notificationsEnabled: mongoFollow.notificationsEnabled !== false
        });
        
        migrationState.follows.migrated++;
        
        if ((i + 1) % 100 === 0) {
          logProgress('FOLLOWS', `Migrated ${i + 1}/${follows.length} follows`);
        }
      } catch (error) {
        migrationState.follows.failed++;
        logError('FOLLOWS', `Failed to migrate follow ${mongoFollow._id}`, error);
      }
    }
    
    logProgress('FOLLOWS', `Completed: ${migrationState.follows.migrated} migrated, ${migrationState.follows.failed} failed`);
  } catch (error) {
    logError('FOLLOWS', 'Follow migration failed', error);
    throw error;
  }
}

/**
 * Migrate Likes
 */
async function migrateLikes(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('LIKES', 'Starting like migration...');
  
  try {
    let query = Like.find({ isActive: true }).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const likes = await query.lean();
    migrationState.likes.total = likes.length;
    
    logProgress('LIKES', `Found ${likes.length} likes to migrate`);
    
    for (let i = 0; i < likes.length; i++) {
      const mongoLike = likes[i];
      
      try {
        const pgUserId = migrationState.users.mapping.get(mongoLike.userId?.toString());
        if (!pgUserId) {
          throw new Error(`User mapping not found for like ${mongoLike._id}`);
        }
        
        // For goal likes, map the target ID
        let pgTargetId = mongoLike.targetId;
        if (mongoLike.targetType === 'goal') {
          pgTargetId = migrationState.goals.mapping.get(mongoLike.targetId?.toString());
          if (!pgTargetId) {
            throw new Error(`Goal mapping not found for like ${mongoLike._id}`);
          }
        } else {
          // For activities, comments, and other MongoDB entities, keep ObjectId as string
          pgTargetId = mongoLike.targetId?.toString();
        }
        
        // Create like in PostgreSQL for all types
        await pgLikeService.likeTarget({
          userId: pgUserId,
          targetType: mongoLike.targetType,
          targetId: pgTargetId,
          reactionType: mongoLike.reactionType || 'like'
        });
        
        migrationState.likes.migrated++;
        
        if ((i + 1) % 500 === 0) {
          logProgress('LIKES', `Processed ${i + 1}/${likes.length} likes`);
        }
      } catch (error) {
        migrationState.likes.failed++;
        logError('LIKES', `Failed to migrate like ${mongoLike._id}`, error);
      }
    }
    
    logProgress('LIKES', `Completed: ${migrationState.likes.migrated} migrated, ${migrationState.likes.failed} failed`);
  } catch (error) {
    logError('LIKES', 'Like migration failed', error);
    throw error;
  }
}

/**
 * Migrate Blocks
 */
async function migrateBlocks(options = {}) {
  const { limit = null, skip = 0 } = options;
  
  logProgress('BLOCKS', 'Starting block migration...');
  
  try {
    let query = Block.find({ isActive: true }).sort({ createdAt: 1 });
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    const blocks = await query.lean();
    migrationState.blocks.total = blocks.length;
    
    logProgress('BLOCKS', `Found ${blocks.length} blocks to migrate`);
    
    for (let i = 0; i < blocks.length; i++) {
      const mongoBlock = blocks[i];
      
      try {
        const pgBlockerId = migrationState.users.mapping.get(mongoBlock.blockerId?.toString());
        const pgBlockedId = migrationState.users.mapping.get(mongoBlock.blockedId?.toString());
        
        if (!pgBlockerId || !pgBlockedId) {
          throw new Error(`User mapping not found for block ${mongoBlock._id}`);
        }
        
        // Create block in PostgreSQL
        await pgBlockService.blockUser(pgBlockerId, pgBlockedId);
        
        // Update UserPreferences with blocked user
        await UserPreferences.updateOne(
          { userId: pgBlockerId },
          { $addToSet: { blockedUsers: pgBlockedId } }
        );
        
        migrationState.blocks.migrated++;
        
        if ((i + 1) % 100 === 0) {
          logProgress('BLOCKS', `Migrated ${i + 1}/${blocks.length} blocks`);
        }
      } catch (error) {
        migrationState.blocks.failed++;
        logError('BLOCKS', `Failed to migrate block ${mongoBlock._id}`, error);
      }
    }
    
    logProgress('BLOCKS', `Completed: ${migrationState.blocks.migrated} migrated, ${migrationState.blocks.failed} failed`);
  } catch (error) {
    logError('BLOCKS', 'Block migration failed', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration(options = {}) {
  const startTime = Date.now();
  
  console.log('='.repeat(80));
  console.log('MongoDB to PostgreSQL Migration');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // Connect to MongoDB
    logProgress('INIT', 'Connecting to MongoDB...');
    await connectDB();
    
    // Test PostgreSQL connection
    logProgress('INIT', 'Testing PostgreSQL connection...');
    await query('SELECT NOW()');
    logProgress('INIT', 'PostgreSQL connection successful');
    
    console.log('');
    
    // Run migrations in order (due to foreign key dependencies)
    await migrateUsers(options);
    console.log('');
    
    await migrateGoals(options);
    console.log('');
    
    await migrateHabits(options);
    console.log('');
    
    await migrateHabitLogs(options);
    console.log('');
    
    await migrateFollows(options);
    console.log('');
    
    await migrateLikes(options);
    console.log('');
    
    await migrateBlocks(options);
    console.log('');
    
    // Print summary
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log(`Total Duration: ${duration} minutes`);
    console.log('');
    console.log('Results:');
    console.log(`  Users:      ${migrationState.users.migrated}/${migrationState.users.total} (${migrationState.users.failed} failed)`);
    console.log(`  Goals:      ${migrationState.goals.migrated}/${migrationState.goals.total} (${migrationState.goals.failed} failed)`);
    console.log(`  Habits:     ${migrationState.habits.migrated}/${migrationState.habits.total} (${migrationState.habits.failed} failed)`);
    console.log(`  Habit Logs: ${migrationState.habitLogs.migrated}/${migrationState.habitLogs.total} (${migrationState.habitLogs.failed} failed)`);
    console.log(`  Follows:    ${migrationState.follows.migrated}/${migrationState.follows.total} (${migrationState.follows.failed} failed)`);
    console.log(`  Likes:      ${migrationState.likes.migrated}/${migrationState.likes.total} (${migrationState.likes.failed} failed)`);
    console.log(`  Blocks:     ${migrationState.blocks.migrated}/${migrationState.blocks.total} (${migrationState.blocks.failed} failed)`);
    console.log('');
    
    if (migrationState.errors.length > 0) {
      console.log(`Total Errors: ${migrationState.errors.length}`);
      console.log('Check migration-errors.json for details');
      
      // Write errors to file
      const fs = require('fs');
      fs.writeFileSync(
        'migration-errors.json',
        JSON.stringify(migrationState.errors, null, 2)
      );
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: null,
  skip: 0
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--skip=')) {
    options.skip = parseInt(arg.split('=')[1]);
  }
});

// Run migration
runMigration(options);
