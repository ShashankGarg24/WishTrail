const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // User who performed the activity
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  name: {
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
      'level_up',
      'streak_milestone',
      'achievement_earned',
      'goal_liked'
    ],
    index: true
  },
  
  // Flexible data storage for different activity types
  data: {
    // For goal-related activities
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal'
    },
    goalTitle: String,
    goalCategory: String,
    pointsEarned: Number,
    completionNote: String,
    completionAttachmentUrl: String,
    isCompleted: Boolean,
    completedAt: Date,
    subGoalsCount: Number,
    completedSubGoalsCount: Number,
    lastUpdateType: String, // 'created', 'completed', 'subgoal_added', 'subgoal_completed'
    updates: [{
      type: { type: String },
      timestamp: { type: Date, default: Date.now },
      data: { type: mongoose.Schema.Types.Mixed }
    }],
    
    // For user-related activities
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetUserName: String,
    
    // For level up activities
    newLevel: String,
    oldLevel: String,
    
    // For streak activities
    streakCount: Number,
    
    // For achievement activities
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    achievementName: String,
    
    // Additional context data
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Activity visibility
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // For potential future features
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Community scope (optional)
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true
  },

  // Reactions: emoji -> { count, userIds }
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: mongoose.Schema.Types.ObjectId }] }, { _id: false }),
    default: {}
  },

  // Optional expiration support (set on write if you want TTL for updates)
  expiresAt: { type: Date, index: true }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
activitySchema.index({ createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ isPublic: 1, createdAt: -1 });
activitySchema.index({ isActive: 1, isPublic: 1, createdAt: -1 });
activitySchema.index({ communityId: 1, createdAt: -1 });
activitySchema.index({ expiresAt: 1 });
activitySchema.index({ 'data.goalId': 1, createdAt: -1 });
activitySchema.index({ 'data.metadata.habitId': 1, createdAt: -1 });

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
    'user_followed': `started following ${this.data.targetUserName}`,
    'level_up': `leveled up to ${this.data.newLevel}`,
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
activitySchema.statics.createActivity = async function(userId, name, avatar, type, data, options = {}) {
  try {
    const activity = new this({
      userId,
      name,
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
activitySchema.statics.createOrUpdateGoalActivity = async function(userId, name, avatar, updateType, goalData, options = {}) {
  try {
    const { goalId, goalTitle, goalCategory, pointsEarned, completionNote, completionAttachmentUrl, 
            subGoalsCount, completedSubGoalsCount, subGoalTitle, subGoalIndex } = goalData;

    // Find existing goal activity
    let activity = await this.findOne({
      userId,
      'data.goalId': goalId,
      type: { $in: ['goal_activity', 'goal_created'] }
    });

    const updateData = {
      type: updateType,
      timestamp: new Date(),
      data: {}
    };

    if (updateType === 'completed') {
      updateData.data = { pointsEarned, completionNote, completionAttachmentUrl };
    } else if (updateType === 'subgoal_added') {
      updateData.data = { subGoalTitle, index: subGoalIndex };
    } else if (updateType === 'subgoal_completed') {
      updateData.data = { subGoalTitle, index: subGoalIndex };
    }

    if (activity) {
      // Update existing activity
      activity.type = 'goal_activity';
      activity.name = name; // Update in case name changed
      activity.avatar = avatar; // Update in case avatar changed
      activity.data.goalTitle = goalTitle;
      activity.data.goalCategory = goalCategory;
      activity.data.lastUpdateType = updateType;
      activity.data.subGoalsCount = subGoalsCount;
      activity.data.completedSubGoalsCount = completedSubGoalsCount;
      
      if (updateType === 'completed') {
        activity.data.isCompleted = true;
        activity.data.completedAt = new Date();
        activity.data.pointsEarned = pointsEarned;
        activity.data.completionNote = completionNote || '';
        activity.data.completionAttachmentUrl = completionAttachmentUrl || '';
        activity.isPublic = options.isPublic !== undefined ? options.isPublic : true;
      }

      if (!activity.data.updates) {
        activity.data.updates = [];
      }
      activity.data.updates.push(updateData);

      // Update timestamps to bring to top
      activity.updatedAt = new Date();
      activity.createdAt = new Date(); // Move to top by updating createdAt

      await activity.save();
      return activity;
    } else {
      // Create new activity
      const newActivity = new this({
        userId,
        name,
        avatar,
        type: 'goal_activity',
        data: {
          goalId,
          goalTitle,
          goalCategory,
          isCompleted: updateType === 'completed',
          completedAt: updateType === 'completed' ? new Date() : null,
          pointsEarned: updateType === 'completed' ? pointsEarned : 0,
          completionNote: updateType === 'completed' ? (completionNote || '') : '',
          completionAttachmentUrl: updateType === 'completed' ? (completionAttachmentUrl || '') : '',
          subGoalsCount: subGoalsCount || 0,
          completedSubGoalsCount: completedSubGoalsCount || 0,
          lastUpdateType: updateType,
          updates: [updateData]
        },
        isPublic: options.isPublic !== undefined ? options.isPublic : true,
        ...(options && options.communityId ? { communityId: options.communityId } : {})
      });

      return await newActivity.save();
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
activitySchema.statics.getUserActivities = function(userId, limit = 20) {
  return this.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('data.goalId', 'title category')
    .populate('data.targetUserId', 'name avatar');
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

      const sourceGoalId = doc?.data?.goalId || null;
      const sourceHabitId = doc?.data?.metadata?.habitId || null;
      const match = [];
      if (sourceGoalId) match.push({ type: 'goal', sourceId: sourceGoalId });
      if (sourceHabitId) match.push({ type: 'habit', sourceId: sourceHabitId });
      if (match.length > 0) {
        const items = await CommunityItem.find({ $or: match, isActive: true, status: 'approved' }).select('communityId').lean();
        for (const it of items) communityIds.add(String(it.communityId));
      }

      // Fallback: if no direct community linkage via item or explicit communityId,
      // mirror to all communities where the actor is an active member
      if (communityIds.size === 0) {
        try {
          const memberships = await CommunityMember.find({ userId: doc.userId, status: 'active' }).select('communityId').lean();
          for (const m of memberships) communityIds.add(String(m.communityId));
        } catch (_) {}
      }
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