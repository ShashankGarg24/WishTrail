const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who will receive the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Type of notification
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'new_follower',
      'goal_liked',
      'goal_reminder',
      'achievement_earned',
      'level_up',
      'streak_milestone',
      'friend_completed_goal',
      'friend_created_goal',
      'goal_due_soon',
      'weekly_summary',
      'monthly_summary'
    ],
    index: true
  },
  
  // Notification content
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 100
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: 500
  },
  
  // Flexible data for different notification types
  data: {
    // For follow notifications
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    followerName: String,
    followerAvatar: String,
    
    // For goal-related notifications
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal'
    },
    goalTitle: String,
    goalCategory: String,
    goalDueDate: Date,
    
    // For achievement notifications
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    achievementName: String,
    achievementIcon: String,
    
    // For level up notifications
    newLevel: String,
    oldLevel: String,
    pointsEarned: Number,
    
    // For streak notifications
    streakCount: Number,
    streakType: String,
    
    // For like notifications
    likerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likerName: String,
    likerAvatar: String,
    
    // For activity notifications
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    },
    
    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Notification delivery
  isDelivered: {
    type: Boolean,
    default: false
  },
  
  // Notification channels
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  
  // Delivery tracking
  deliveredAt: Date,
  readAt: Date,
  
  // Expiration (for cleanup)
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Pre-save middleware to set readAt when isRead changes
notificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    return await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user's notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    isRead = null,
    type = null,
    limit = 20,
    skip = 0
  } = options;
  
  const query = { userId };
  
  if (isRead !== null) {
    query.isRead = isRead;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('data.followerId', 'name avatar')
    .populate('data.goalId', 'title category')
    .populate('data.likerId', 'name avatar');
};

// Static method to get unread notification count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false
  });
};

// Static method to mark notification as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  try {
    const notification = await this.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    throw error;
  }
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to delete notification
notificationSchema.statics.deleteNotification = async function(notificationId, userId) {
  try {
    const notification = await this.findOneAndDelete({
      _id: notificationId,
      userId
    });
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    throw error;
  }
};

// Static method to create follow notification
notificationSchema.statics.createFollowNotification = async function(followerId, followingId) {
  const User = mongoose.model('User');
  const follower = await User.findById(followerId).select('name avatar');
  
  if (!follower) return;
  
  return this.createNotification({
    userId: followingId,
    type: 'new_follower',
    title: 'New Follower',
    message: `${follower.name} started following you`,
    data: {
      followerId: followerId,
      followerName: follower.name,
      followerAvatar: follower.avatar
    }
  });
};

// Static method to create goal like notification
notificationSchema.statics.createGoalLikeNotification = async function(likerId, goalId, goalUserId) {
  const User = mongoose.model('User');
  const Goal = mongoose.model('Goal');
  
  const [liker, goal] = await Promise.all([
    User.findById(likerId).select('name avatar'),
    Goal.findById(goalId).select('title category')
  ]);
  
  if (!liker || !goal) return;
  
  return this.createNotification({
    userId: goalUserId,
    type: 'goal_liked',
    title: 'Goal Liked',
    message: `${liker.name} liked your goal "${goal.title}"`,
    data: {
      likerId: likerId,
      likerName: liker.name,
      likerAvatar: liker.avatar,
      goalId: goalId,
      goalTitle: goal.title,
      goalCategory: goal.category
    }
  });
};

// Static method to create achievement notification
notificationSchema.statics.createAchievementNotification = async function(userId, achievementData) {
  return this.createNotification({
    userId,
    type: 'achievement_earned',
    title: 'Achievement Earned!',
    message: `You earned the "${achievementData.name}" achievement!`,
    data: {
      achievementId: achievementData._id,
      achievementName: achievementData.name,
      achievementIcon: achievementData.icon
    },
    priority: 'high'
  });
};

// Static method to create level up notification
notificationSchema.statics.createLevelUpNotification = async function(userId, oldLevel, newLevel) {
  return this.createNotification({
    userId,
    type: 'level_up',
    title: 'Level Up!',
    message: `Congratulations! You've leveled up from ${oldLevel} to ${newLevel}!`,
    data: {
      oldLevel,
      newLevel
    },
    priority: 'high'
  });
};

// Static method to create goal reminder notification
notificationSchema.statics.createGoalReminderNotification = async function(userId, goalId, goalTitle, dueDate) {
  const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
  
  return this.createNotification({
    userId,
    type: 'goal_reminder',
    title: 'Goal Reminder',
    message: `Your goal "${goalTitle}" is due in ${daysUntilDue} days`,
    data: {
      goalId,
      goalTitle,
      goalDueDate: dueDate
    }
  });
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpiredNotifications = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired notifications`);
    return result;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema); 