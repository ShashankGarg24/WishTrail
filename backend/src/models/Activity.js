const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // User who performed the activity
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Type of activity
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'goal_completed',
      'goal_created',
      'user_followed',
      'level_up',
      'streak_milestone',
      'achievement_earned',
      'goal_liked',
      'profile_updated'
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
  }
  
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

// Virtual for activity message
activitySchema.virtual('message').get(function() {
  const messages = {
    'goal_completed': `completed "${this.data.goalTitle}"`,
    'goal_created': `created a new goal "${this.data.goalTitle}"`,
    'user_followed': `started following ${this.data.targetUserName}`,
    'level_up': `leveled up to ${this.data.newLevel}`,
    'streak_milestone': `achieved a ${this.data.streakCount}-day streak`,
    'achievement_earned': `earned the "${this.data.achievementName}" achievement`,
    'goal_liked': `liked "${this.data.goalTitle}"`,
    'profile_updated': `updated their profile`
  };
  
  return messages[this.type] || 'performed an activity';
});

// Static method to create activity
activitySchema.statics.createActivity = async function(userId, type, data) {
  try {
    const activity = new this({
      userId,
      type,
      data
    });
    
    return await activity.save();
  } catch (error) {
    console.error('Error creating activity:', error);
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
    .limit(limit)
    .populate('userId', 'name avatar level')
    .populate('data.goalId', 'title category')
    .populate('data.targetUserId', 'name avatar');
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
  .limit(limit)
  .populate('userId', 'name avatar level')
  .populate('data.goalId', 'title category')
  .populate('data.targetUserId', 'name avatar');
};

module.exports = mongoose.model('Activity', activitySchema); 