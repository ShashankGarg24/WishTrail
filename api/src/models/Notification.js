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
      'monthly_summary',
      // Extended types for social interactions
      'follow_request',
      'follow_request_accepted',
      'activity_comment',
      'comment_reply',
      'mention',
      'activity_liked',
      'comment_liked'
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
    
    // Generic actor
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actorName: String,
    actorAvatar: String,
    
    // For activity notifications
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    },
    // For comment notifications
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActivityComment'
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
    .populate('data.likerId', 'name avatar')
    .populate('data.actorId', 'name avatar')
    .populate('data.activityId', 'type')
    .populate('data.commentId');
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

// Static method to create follow request notification
notificationSchema.statics.createFollowRequestNotification = async function(followerId, followingId) {
  const User = mongoose.model('User');
  const follower = await User.findById(followerId).select('name avatar');
  if (!follower) return;
  return this.createNotification({
    userId: followingId,
    type: 'follow_request',
    title: 'Follow Request',
    message: `${follower.name} requested to follow you`,
    data: {
      followerId,
      followerName: follower.name,
      followerAvatar: follower.avatar,
      actorId: followerId,
      actorName: follower.name,
      actorAvatar: follower.avatar
    },
    priority: 'high'
  });
};

// Static method to notify follower that request accepted
notificationSchema.statics.createFollowAcceptedNotification = async function(followingId, followerId) {
  const User = mongoose.model('User');
  const following = await User.findById(followingId).select('name avatar');
  if (!following) return;
  return this.createNotification({
    userId: followerId,
    type: 'follow_request_accepted',
    title: 'Request Accepted',
    message: `${following.name} accepted your follow request`,
    data: {
      actorId: followingId,
      actorName: following.name,
      actorAvatar: following.avatar
    }
  });
};

// Activity comment notification
notificationSchema.statics.createActivityCommentNotification = async function(commenterId, activity) {
  try {
    if (!activity) return;
    const User = mongoose.model('User');
    const commenter = await User.findById(commenterId).select('name avatar');
    if (!commenter) return;
    if (String(activity.userId) === String(commenterId)) return; // no self notif
    return this.createNotification({
      userId: activity.userId,
      type: 'activity_comment',
      title: 'New comment',
      message: `${commenter.name} commented on your activity`,
      data: {
        actorId: commenterId,
        actorName: commenter.name,
        actorAvatar: commenter.avatar,
        activityId: activity._id
      }
    });
  } catch (e) {
    return null;
  }
};

// Comment reply notification
notificationSchema.statics.createCommentReplyNotification = async function(replierId, parentComment, activity) {
  try {
    if (!parentComment) return;
    const User = mongoose.model('User');
    const replier = await User.findById(replierId).select('name avatar');
    if (!replier) return;
    if (String(parentComment.userId) === String(replierId)) return;
    return this.createNotification({
      userId: parentComment.userId,
      type: 'comment_reply',
      title: 'New reply',
      message: `${replier.name} replied to your comment`,
      data: {
        actorId: replierId,
        actorName: replier.name,
        actorAvatar: replier.avatar,
        activityId: activity?._id,
        commentId: parentComment._id
      }
    });
  } catch (e) {
    return null;
  }
};

// Mention notification
notificationSchema.statics.createMentionNotification = async function(mentionerId, mentionedUserId, context = {}) {
  try {
    if (!mentionedUserId || String(mentionerId) === String(mentionedUserId)) return;
    const User = mongoose.model('User');
    const mentioner = await User.findById(mentionerId).select('name avatar');
    if (!mentioner) return;
    return this.createNotification({
      userId: mentionedUserId,
      type: 'mention',
      title: 'You were mentioned',
      message: `${mentioner.name} mentioned you`,
      data: {
        actorId: mentionerId,
        actorName: mentioner.name,
        actorAvatar: mentioner.avatar,
        activityId: context.activityId,
        commentId: context.commentId
      }
    });
  } catch (e) {
    return null;
  }
};

// Activity like notification
notificationSchema.statics.createActivityLikeNotification = async function(likerId, activity) {
  try {
    if (!activity) return;
    if (String(activity.userId) === String(likerId)) return;
    const User = mongoose.model('User');
    const liker = await User.findById(likerId).select('name avatar');
    if (!liker) return;
    return this.createNotification({
      userId: activity.userId,
      type: 'activity_liked',
      title: 'Activity liked',
      message: `${liker.name} liked your activity`,
      data: {
        actorId: likerId,
        actorName: liker.name,
        actorAvatar: liker.avatar,
        activityId: activity._id
      }
    });
  } catch (e) {
    return null;
  }
};

// Comment like notification
notificationSchema.statics.createCommentLikeNotification = async function(likerId, comment) {
  try {
    if (!comment) return;
    if (String(comment.userId) === String(likerId)) return;
    const User = mongoose.model('User');
    const liker = await User.findById(likerId).select('name avatar');
    if (!liker) return;
    return this.createNotification({
      userId: comment.userId,
      type: 'comment_liked',
      title: 'Comment liked',
      message: `${liker.name} liked your comment`,
      data: {
        actorId: likerId,
        actorName: liker.name,
        actorAvatar: liker.avatar,
        commentId: comment._id
      }
    });
  } catch (e) {
    return null;
  }
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