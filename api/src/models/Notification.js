const { logger } = require('./../config/observability');
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who will receive the notification (Number for PostgreSQL user IDs)
  userId: {
    type: Number,
    required: [true, 'User ID is required']
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
      'streak_milestone',
      'friend_completed_goal',
      'friend_created_goal',
      'goal_due_soon',
      'weekly_summary',
      'monthly_summary',
      'daily_logs_prompt',
      'habit_reminder',
      'inactivity_reminder',
      'motivation_quote',
      // Extended types for social interactions
      'follow_request',
      'follow_request_accepted',
      'activity_comment',
      'comment_reply',
      'mention',
      'activity_liked',
      'comment_liked',
      // Community notifications
      'community_milestone',
      'community_announcement',
      'community_suggestion',
      'community_role_update',
      'community_join_request',
      'community_join_approved'
    ]
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
    // For follow notifications (Number for PostgreSQL user IDs)
    followerId: {
      type: Number
    },
    
    // For goal-related notifications (Number to support PostgreSQL goal IDs)
    goalId: {
      type: Number
    },
    
    // For achievement notifications
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    achievementName: String,
    achievementIcon: String,

    // For streak notifications
    streakCount: Number,
    streakType: String,
    
    // For like notifications (Number for PostgreSQL user IDs)
    likerId: {
      type: Number
    },

    // Generic actor (Number for PostgreSQL user IDs)
    actorId: {
      type: Number
    },
    
    // For activity notifications
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    },
    // For habit notifications (Number for PostgreSQL habit IDs)
    habitId: {
      type: Number
    },
    // For comment notifications
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActivityComment'
    }
  },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  aggregationKey: String,
  aggregateActors: [Number],
  // Community context
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },
  
  // Reversible social state; missing active on legacy records means visible.
  active: { type: Boolean, default: true },
  invalidatedAt: Date,
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityComment' },
  lifecycleKey: String,
  lifecycleRevision: { type: Number, default: 0 },
  sourceSignature: String,
  lastPushAt: Date,
  dismissed: { type: Boolean, default: false },
  // Notification status
  isRead: {
    type: Boolean,
    default: false
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
    default: null  // Will be set in createNotification based on type
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationSchema.index({ lifecycleKey: 1 }, { unique: true, sparse: true, name: 'notification_lifecycle_unique' });
notificationSchema.index({ userId: 1, active: 1, createdAt: -1 });
notificationSchema.index({ sourceId: 1, active: 1 });

notificationSchema.index({ aggregationKey: 1 }, { unique: true, sparse: true, name: 'notification_like_group_unique' });

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
    // Set expiration based on type (only if not explicitly set)
    if (typeof notificationData.expiresAt === 'undefined') {
      if (notificationData.type === 'follow_request') {
        notificationData.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      } else {
        notificationData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    }
    
    // Default push channel on selected types if not explicitly set
    const pushPreferredTypes = new Set([
      'habit_reminder','goal_due_soon','weekly_summary','monthly_summary','daily_logs_prompt','inactivity_reminder',
      'motivation_quote',
      'follow_request','follow_request_accepted','new_follower',
      'friend_created_goal','friend_completed_goal',
      'activity_comment','comment_reply','mention',
      'goal_liked','activity_liked','comment_liked',
      'achievement_earned','streak_milestone'
    ]);
    const channels = notificationData.channels || {};
    if (typeof channels.push === 'undefined') {
      channels.push = pushPreferredTypes.has(notificationData.type);
    }
    notificationData.channels = channels;

    let saved;
    const { normalizeUserId, preferenceReason } = require('../services/notificationPolicy');
    notificationData.userId = normalizeUserId(notificationData.userId);
    const prefs = await require('./extended/UserPreferences').findOne({ userId: notificationData.userId }).select('notifications').lean();
    const allowInAppTopic = !preferenceReason(prefs, notificationData.type);
    const emailEnabled = prefs?.notifications?.email?.enabled !== false;
    if (!allowInAppTopic) { channels.inApp = false; channels.push = false; }
    if (!emailEnabled) channels.email = false;
    const lifecycle = require('../services/socialNotificationLifecycle');
    if (lifecycle.TYPES.includes(notificationData.type)) {
      return lifecycle.synchronize(notificationData, { push: true });
    }
    if (notificationData.sourceId) {
      await lifecycle.ensureIndexes();
      const source = await require('./ActivityComment').findById(notificationData.sourceId).lean();
      if (!source || (source.parentCommentId && !await require('./ActivityComment').exists({ _id: source.parentCommentId }))) return null;
      notificationData.lifecycleKey = `${notificationData.userId}:${notificationData.type}:source:${notificationData.sourceId}`;
    }
    try { saved = await this.create(notificationData); }
    catch (error) {
      if (error.code !== 11000 || !notificationData.lifecycleKey) throw error;
      return this.findOne({ lifecycleKey: notificationData.lifecycleKey });
    }
    if (notificationData.sourceId) {
      const Comment = require('./ActivityComment');
      const source = await Comment.findById(notificationData.sourceId).lean();
      if (!source || (source.parentCommentId && !await Comment.exists({ _id: source.parentCommentId }))) {
        await this.updateOne({ _id: saved._id }, { $set: { active: false, invalidatedAt: new Date() } });
        return null;
      }
    }
    try {
      const pushAllowed = saved?.channels?.push && allowInAppTopic;
      if (pushAllowed) {
        const { sendFcmToUser } = require('../services/pushService');
        const dispatch = await sendFcmToUser(saved.userId, saved);
        if (dispatch?.ok && !dispatch?.queued) {
          await this.updateOne(
            { _id: saved._id },
            { $set: { isDelivered: true, deliveredAt: new Date() } }
          );
        }
      }
    } catch (_) {}

    return saved;
  } catch (error) {
    logger.error('Error creating notification:', error);
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
  
  const query = { userId, ...require('../services/socialNotificationLifecycle').visibleQuery() };
  
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
    .lean();
};

// Static method to get unread notification count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    ...require('../services/socialNotificationLifecycle').visibleQuery(),
    isRead: false
  });
};

// Static method to mark notification as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  try {
    const notification = await this.findOneAndUpdate(
      { _id: notificationId, userId, active: { $ne: false } },
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
      { userId, isRead: false, ...require('../services/socialNotificationLifecycle').visibleQuery() },
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
    const notification = await this.findOneAndUpdate({
      _id: notificationId, userId
    }, { $set: { active: false, dismissed: true, invalidatedAt: new Date() }, $inc: { lifecycleRevision: 1 } }, { new: true });
    
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
  const pgUserService = require('../services/pgUserService');
  const follower = await pgUserService.findById(followerId);
  
  if (!follower) {
    return;
  }

  return this.createNotification({
    userId: followingId,
    type: 'new_follower',
    title: 'New Follower',
    message: `${follower.name} started following you`,
    data: {
      followerId: followerId,
      actorId: followerId
    }
  });
};

// Static method to create follow request notification
notificationSchema.statics.createFollowRequestNotification = async function(followerId, followingId) {
  const pgUserService = require('../services/pgUserService');
  const follower = await pgUserService.findById(followerId);
  if (!follower) return;
  return this.createNotification({
    userId: followingId,
    type: 'follow_request',
    title: 'Follow Request',
    message: `${follower.name} requested to follow you`,
    data: {
      followerId,
      actorId: followerId
    },
    priority: 'high'
    // expiresAt will be set to null automatically in createNotification
  });
};

// Re-read the relationship, so a delayed cancellation cannot erase a new request.
notificationSchema.statics.deleteFollowRequestNotification = async function(followerId, followingId) {
  const lifecycle = require('../services/socialNotificationLifecycle');
  return lifecycle.safely(() => lifecycle.synchronize({ userId: Number(followingId), type: 'follow_request', title: 'Follow Request', message: 'Follow request', data: { followerId: Number(followerId), actorId: Number(followerId) } }));
};

notificationSchema.statics.convertFollowRequestToNewFollower = async function(followerId, followingId) {
  await this.deleteFollowRequestNotification(followerId, followingId);
  return this.createFollowNotification(followerId, followingId);
};

// Static method to notify follower that request accepted
notificationSchema.statics.createFollowAcceptedNotification = async function(followingId, followerId) {
  const pgUserService = require('../services/pgUserService');
  const following = await pgUserService.findById(followingId);
  if (!following) return;
  return this.createNotification({
    userId: followerId,
    type: 'follow_request_accepted',
    title: 'Request Accepted',
    message: `${following.name} accepted your follow request`,
    data: {
      actorId: followingId
    }
  });
};

// Activity comment notification
notificationSchema.statics.createActivityCommentNotification = async function(commenterId, activity, comment) {
  try {
    if (!activity) return;
    const pgUserService = require('../services/pgUserService');
    const commenter = await pgUserService.findById(commenterId);
    if (!commenter) return;
    if (String(activity.userId) === String(commenterId)) return; // no self notif
    return this.createNotification({
      userId: activity.userId,
      type: 'activity_comment',
      sourceId: comment?._id,
      title: 'New comment',
      message: `${commenter.name} commented on your activity`,
      data: {
        actorId: commenterId,
        commentId: comment?._id,
        activityId: activity._id,
        goalId: activity?.data?.goalId || undefined
      }
    });
  } catch (e) {
    return null;
  }
};

// Comment reply notification
notificationSchema.statics.createCommentReplyNotification = async function(replierId, parentComment, activity, reply) {
  try {
    if (!parentComment) return;
    const pgUserService = require('../services/pgUserService');
    const replier = await pgUserService.findById(replierId);
    if (!replier) return;
    if (String(parentComment.userId) === String(replierId)) return;
    return this.createNotification({
      userId: parentComment.userId,
      type: 'comment_reply',
      sourceId: reply?._id,
      title: 'New reply',
      message: `${replier.name} replied to your comment`,
      data: {
        actorId: replierId,
        activityId: activity?._id,
        commentId: reply?._id || parentComment._id,
        goalId: activity?.data?.goalId || undefined
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
    const pgUserService = require('../services/pgUserService');
    const mentioner = await pgUserService.findById(mentionerId);
    if (!mentioner) return;
    return this.createNotification({
      userId: mentionedUserId,
      type: 'mention',
      sourceId: context.commentId,
      title: 'You were mentioned',
      message: `${mentioner.name} mentioned you`,
      data: {
        actorId: mentionerId,
        activityId: context.activityId,
        commentId: context.commentId,
        goalId: context.goalId
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
    const pgUserService = require('../services/pgUserService');
    const liker = await pgUserService.findById(likerId);
    if (!liker) return;
    return this.createNotification({
      userId: activity.userId,
      type: 'activity_liked',
      title: 'Activity liked',
      message: `${liker.name} liked your activity`,
      data: {
        actorId: likerId,
        activityId: activity._id,
        goalId: activity?.data?.goalId || undefined
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
    const pgUserService = require('../services/pgUserService');
    const Activity = mongoose.model('Activity');
    const ActivityComment = mongoose.model('ActivityComment');
    const liker = await pgUserService.findById(likerId);
    if (!liker) return;
    // Try to enrich with activityId and goalId for deep linking
    let activityId = comment.activityId;
    if (!activityId) {
      try { const c = await ActivityComment.findById(comment._id).select('activityId'); activityId = c?.activityId; } catch (_) {}
    }
    let goalId = undefined;
    if (activityId) {
      try { const act = await Activity.findById(activityId).select('data.goalId'); goalId = act?.data?.goalId; } catch (_) {}
    }
    return this.createNotification({
      userId: comment.userId,
      type: 'comment_liked',
      title: 'Comment liked',
      message: `${liker.name} liked your comment`,
      data: {
        actorId: likerId,
        commentId: comment._id,
        activityId: activityId || undefined,
        goalId: goalId || undefined
      }
    });
  } catch (e) {
    return null;
  }
};

// Static method to create goal like notification
notificationSchema.statics.createGoalLikeNotification = async function(likerId, goalId, goalUserId) {
  const pgUserService = require('../services/pgUserService');
  const pgGoalService = require('../services/pgGoalService');
  
  const [liker, goal] = await Promise.all([
    pgUserService.findById(likerId),
    pgGoalService.findById(goalId)
  ]);
  
  if (!liker || !goal) return;

  return this.createNotification({
    userId: goalUserId,
    type: 'goal_liked',
    title: 'Goal Liked',
    message: `${liker.name} liked your goal "${goal.title}"`,
    data: {
      likerId: likerId,
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

// Habit reminder
notificationSchema.statics.createHabitReminderNotification = async function(userId, habitId, habitName, timeHHmm) {
  return this.createNotification({
    userId,
    type: 'habit_reminder',
    title: 'Habit Reminder',
    message: `Time to do: ${habitName}`,
    data: {
      habitId,
      metadata: { time: timeHHmm }
    },
    priority: 'low'
  });
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpiredNotifications = async function() {
  try {
    // First, find expired follow_request notifications to clean up the Follow records
    const expiredFollowRequests = await this.find({
      type: 'follow_request',
      expiresAt: { $lt: new Date() }
    }).select('data.followerId userId').lean();
    
    logger.info(`Found ${expiredFollowRequests.length} expired follow_request notifications`);
    
    // Delete the corresponding pending Follow records
    if (expiredFollowRequests.length > 0) {
      const Follow = require('./Follow');
      const deletePromises = expiredFollowRequests.map(notif => {
        const followerId = notif.data?.followerId;
        const followingId = notif.userId;
        
        if (followerId && followingId) {
          return Follow.deleteOne({
            followerId,
            followingId,
            status: 'pending'
          });
        }
        return Promise.resolve();
      });
      
      const followResults = await Promise.all(deletePromises);
      const deletedFollows = followResults.filter(r => r && r.deletedCount > 0).length;
      logger.info(`Deleted ${deletedFollows} pending Follow records`);
    }
    
    // Now delete all expired notifications
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    logger.info(`Cleaned up ${result.deletedCount} expired notifications`);
    return result;
  } catch (error) {
    logger.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
