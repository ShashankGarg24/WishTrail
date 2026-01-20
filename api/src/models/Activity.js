const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // User who performed the activity (PostgreSQL user ID)
  userId: {
    type: Number,
    required: [true, 'User ID is required']
  },

  name: {
    type: String,
  },

  username: {
    type: String,
  },

  avatar: {
    type: String,
  },
  
  // Type of activity
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'goal_activity',
      'goal_completed',
      'goal_created',
      'user_followed',
      'streak_milestone',
      'achievement_earned',
      'goal_liked',
      'subgoal_added',
      'subgoal_removed',
      'subgoal_completed',
      'subgoal_uncompleted',
      'habit_added',
      'habit_removed',
      'habit_target_achieved'
    ]
  },
  
  // Flexible data storage for different activity types (minimal storage)
  data: {
    // For goal-related activities (PostgreSQL goal ID)
    goalId: {
      type: Number
    },
    lastUpdateType: String, // 'created', 'completed', 'subgoal_added', 'subgoal_completed', etc.
    
    // Timeline updates for goal_activity type
    updates: [{
      // Subgoal updates
      subGoalId: Number,
      subGoalAddedAt: Date,
      subGoalCompletedAt: Date,
      
      // Habit updates
      habitId: Number,
      habitAddedAt: Date,
      habitTargetCompletedAt: Date
    }],
    
    // For user-related activities (PostgreSQL user ID)
    targetUserId: {
      type: Number
    },
    
    // For streak activities
    streakCount: Number,
    
    // For achievement activities
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }
  },
  
  // Activity visibility
  isPublic: {
    type: Boolean,
    default: true
  },

  // Community scope (optional)
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },

  // Reactions: emoji -> { count, userIds }
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: Number }] }, { _id: false }), // PostgreSQL user IDs
    default: {}
  },

  // Optional expiration support (set on write if you want TTL for updates)
  expiresAt: { type: Date }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for activity message
activitySchema.virtual('message').get(function() {
  const messages = {
    'goal_activity': (() => {
      if (this.data?.isCompleted) {
        return `completed "${this.data.goalTitle}"`;
      } else if (this.data?.lastUpdateType === 'subgoal_completed') {
        return `completed a subgoal for "${this.data.goalTitle}"`;
      } else if (this.data?.lastUpdateType === 'subgoal_added') {
        return `added subgoals to "${this.data.goalTitle}"`;
      } else {
        return `created a new goal "${this.data.goalTitle}"`;
      }
    })(),
    'goal_completed': `completed "${this.data.goalTitle}"`,
    'goal_created': `created a new goal "${this.data.goalTitle}"`,
    'subgoal_added': (() => {
      const title = this.data?.subGoalTitle || 'a sub-goal';
      return `added sub-goal "${title}" to "${this.data.goalTitle}"`;
    })(),
    'subgoal_removed': (() => {
      const title = this.data?.subGoalTitle || 'a sub-goal';
      return `removed sub-goal "${title}" from "${this.data.goalTitle}"`;
    })(),
    'subgoal_completed': (() => {
      const title = this.data?.subGoalTitle || 'a sub-goal';
      return `completed sub-goal "${title}" for "${this.data.goalTitle}"`;
    })(),
    'subgoal_uncompleted': (() => {
      const title = this.data?.subGoalTitle || 'a sub-goal';
      return `uncompleted sub-goal "${title}" for "${this.data.goalTitle}"`;
    })(),
    'habit_added': (() => {
      const habitName = this.data?.habitName || 'a habit';
      return `linked habit "${habitName}" to "${this.data.goalTitle}"`;
    })(),
    'habit_removed': (() => {
      const habitName = this.data?.habitName || 'a habit';
      return `unlinked habit "${habitName}" from "${this.data.goalTitle}"`;
    })(),
    'habit_target_achieved': (() => {
      const habitName = this.data?.habitName || 'a habit';
      const targetType = this.data?.targetType === 'completions' ? 'completion target' : 'day target';
      return `achieved ${targetType} for habit "${habitName}" (linked to "${this.data.goalTitle}")`;
    })(),
    'user_followed': `started following ${this.data.targetUserName}`,
    'streak_milestone': (() => {
      const name = this?.data?.metadata?.habitName;
      return name ? `achieved a ${this.data.streakCount}-day streak on "${name}"` : `achieved a ${this.data.streakCount}-day streak`;
    })(),
    'achievement_earned': `earned the "${this.data.achievementName}" achievement`,
    'goal_liked': `liked "${this.data.goalTitle}"`,
    'profile_updated': `updated their profile`
  };
  
  return messages[this.type] || 'performed an activity';
});


// Static method to create activity
activitySchema.statics.createActivity = async function(userId, name, username, avatar, type, data, options = {}) {
  try {
    const activity = new this({
      userId,
      name,
      username,
      avatar,
      type,
      data,
      isPublic: options.isPublic !== undefined ? options.isPublic : true,
      ...(options && options.communityId ? { communityId: options.communityId } : {})
    });
    
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

// Static method to create or update goal activity (consolidated)
activitySchema.statics.createOrUpdateGoalActivity = async function(userId, name, username, avatar, updateType, goalData, options = {}) {
  try {
    const { goalId, updates } = goalData;

    // If createNew option is set, always create a new standalone activity
    if (options.createNew) {
      const activityData = {
        goalId,
        lastUpdateType: updateType
      };
      
      // Add updates array if provided
      if (updates) {
        activityData.updates = updates;
      }
      
      const newActivity = new this({
        userId,
        name,
        username,
        avatar,
        type: updateType,
        data: activityData,
        isPublic: options.isPublic !== undefined ? options.isPublic : true,
        ...(options.communityId ? { communityId: options.communityId } : {})
      });

      await newActivity.save();

      // Invalidate caches
      try {
        const cacheService = require('../services/cacheService');
        await cacheService.invalidateAllActivities();
        await cacheService.invalidateUserActivities(userId);
      } catch (_) {}

      return newActivity;
    }

    // Find existing goal activity
    let activity = await this.findOne({
      userId,
      'data.goalId': goalId,
      type: { $in: ['goal_activity', 'goal_created'] }
    });

    if (activity) {
      // Update existing activity
      activity.type = 'goal_activity';
      activity.name = name; // Update in case name changed
      activity.username = username; // Update in case username changed
      activity.avatar = avatar; // Update in case avatar changed
      activity.data.lastUpdateType = updateType;
      
      // Update updates array if provided
      if (updates) {
        activity.data.updates = updates;
      }
      
      if (updateType === 'completed') {
        activity.isPublic = options.isPublic !== undefined ? options.isPublic : true;
      }

      // Mark data as modified so Mongoose saves it
      activity.markModified('data');
      
      // Update timestamps to bring to top
      activity.updatedAt = new Date();
      activity.createdAt = new Date(); // Move to top by updating createdAt

      await activity.save();
      
      // Invalidate caches
      try {
        const cacheService = require('../services/cacheService');
        await cacheService.invalidateAllActivities();
        await cacheService.invalidateUserActivities(userId);
      } catch (_) {}
      
      return activity;
    } else {
      // Create new activity
      const activityData = {
        goalId,
        lastUpdateType: updateType
      };
      
      // Add updates array if provided
      if (updates) {
        activityData.updates = updates;
      }
      
      const newActivity = new this({
        userId,
        name,
        username,
        avatar,
        type: 'goal_activity',
        data: activityData,
        isPublic: options.isPublic !== undefined ? options.isPublic : true,
        ...(options && options.communityId ? { communityId: options.communityId } : {})
      });

      const saved = await newActivity.save();
      
      // Invalidate caches
      try {
        const cacheService = require('../services/cacheService');
        await cacheService.invalidateAllActivities();
        await cacheService.invalidateUserActivities(userId);
      } catch (_) {}
      
      return saved;
    }
  } catch (error) {
    console.error('Error creating/updating goal activity:', error);
    throw error;
  }
};


// Static method to get recent activities
activitySchema.statics.getRecentActivities = function(limit = 15, userId = null) {
  const query = { isActive: true, isPublic: true };
  
  // If userId provided, get activities from users they follow
  if (userId) {
    // This would require the Follow model to get following list
    // For now, we'll get all public activities
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user's activity feed
activitySchema.statics.getUserActivities = function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  return this.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get activity feed for following users
activitySchema.statics.getFollowingActivities = function(followingIds, limit = 20) {
  return this.find({
    userId: { $in: followingIds },
    isActive: true,
    isPublic: true
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Mirror activities into per-community feed collection and let that model emit real-time events
try {
  activitySchema.post('save', async function(doc) {
    try {
      const CommunityItem = require('./CommunityItem');
      const CommunityActivity = require('./CommunityActivity');
      const CommunityMember = require('./CommunityMember');

      // Determine affected communities
      const communityIds = new Set();
      if (doc.communityId) {
        communityIds.add(String(doc.communityId));
      }

      // Check if the goal/habit in this activity is a community-linked personal copy
      const activityGoalId = doc?.data?.goalId || null;
      const activityHabitId = doc?.data?.metadata?.habitId || null;
      
      if (activityGoalId) {
        const Goal = require('./Goal');
        const goal = await Goal.findById(activityGoalId).select('communityInfo').lean();
        if (goal?.communityInfo?.communityId) {
          communityIds.add(String(goal.communityInfo.communityId));
        }
      }
      
      if (activityHabitId) {
        const Habit = require('./Habit');
        const habit = await Habit.findById(activityHabitId).select('communityInfo').lean();
        if (habit?.communityInfo?.communityId) {
          communityIds.add(String(habit.communityInfo.communityId));
        }
      }

      // Only show activities for goals/habits that are explicitly part of a community
      if (communityIds.size === 0) return;

      // Create per-community activity documents if not already present
      for (const cid of communityIds) {
        const existing = await CommunityActivity.findOne({ communityId: cid, sourceActivityId: doc._id }).select('_id');
        if (existing) {
          // Optional: keep basic fields in sync without re-emitting
          try {
            await CommunityActivity.updateOne(
              { _id: existing._id },
              { $set: { name: doc.name, avatar: doc.avatar, type: doc.type, data: doc.data } }
            );
          } catch (_) {}
          continue;
        }
        try {
          await CommunityActivity.create({
            communityId: cid,
            sourceActivityId: doc._id,
            userId: doc.userId,
            name: doc.name,
            avatar: doc.avatar,
            type: doc.type,
            data: doc.data,
            reactions: doc.reactions || {},
            createdAt: doc.createdAt
          });
        } catch (_) {}
      }
    } catch (_) {}
  });
} catch (_) {}

// Bind model to the PRIMARY connection for global app feed
module.exports = mongoose.model('Activity', activitySchema);