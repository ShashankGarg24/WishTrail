/**
 * Response Sanitization Utility
 * Removes sensitive and unnecessary fields from API responses
 * to prevent data leakage and minimize payload size
 */

// Fields to ALWAYS exclude from any user object
const SENSITIVE_USER_FIELDS = [
  'password',
  'refreshToken',
  'passwordResetToken',
  'passwordResetExpires',
  'passwordChangedAt',
  '__v'
];

// Fields safe for public view (when viewing another user's profile)
const PUBLIC_USER_FIELDS = [
  'id',
  'name',
  'username',
  'avatar',
  'avatar_url',
  'bio',
  'location',
  'interests',
  'isVerified',
  'is_verified',
  'isPremium',
  'isPrivate',
  'is_private',
  'areHabitsPrivate',
  'socialLinks',
  'createdAt',
  'created_at',
  'followersCount',
  'followers_count',
  'followingCount',
  'following_count',
  'goalsCount',
  'total_goals',
  'completed_goals',
  'current_streak',
  'longest_streak'
];

// Additional fields for own profile (self-view)
const PRIVATE_USER_FIELDS = [
  ...PUBLIC_USER_FIELDS,
  'email',
  'dateOfBirth',
  'date_of_birth',
  'notificationSettings',
  'dashboardYears',
  'timezone',
  'timezoneOffsetMinutes',
  'premium_expires_at',
  'isPremium',
];

/**
 * Sanitize user for /auth/me endpoint - minimal profile fields
 * @param {Object} user - User object
 * @returns {Object} Minimal user object for auth/me
 */
const sanitizeAuthMe = (user) => {
  if (!user) return null;
  
  const obj = user.toObject ? user.toObject() : { ...user };
  
  // Compute isPremium based on expiration timestamp
  const premiumExpiresAt = obj.premiumExpiresAt;
  const isPremium = premiumExpiresAt != null && new Date(premiumExpiresAt) > new Date();
  
  return {
    name: obj.name,
    email: obj.email,
    bio: obj.bio,
    location: obj.location,
    avatar: obj.avatar_url,
    followingCount: obj.following_count,
    followerCount: obj.followers_count,
    totalGoals: obj.total_goals,
    interests: obj.interests,
    isPrivate: obj.is_private,
    username: obj.username,
    timezone: obj.timezone,
    currentMood: obj.currentMood,
    instagram: obj.instagram || '',
    website: obj.website || '',
    youtube: obj.youtube || '',
    dashboardYears: obj.dashboardYears || [],
    isPremium: isPremium
  };
};

/**
 * Sanitize user object for API responses
 * @param {Object} user - User object (Mongoose document or plain object)
 * @param {Boolean} isSelf - Whether the user is viewing their own profile
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user, isSelf = false) => {
  if (!user) return null;
  
  // Convert Mongoose document to plain object if needed
  const obj = user.toObject ? user.toObject() : { ...user };
  
  // Compute isPremium based on expiration timestamp
  const premiumExpiresAt = obj.premiumExpiresAt;
  const isPremium = premiumExpiresAt != null && new Date(premiumExpiresAt) > new Date();
  
  // Add computed isPremium field
  
  if (isSelf) {
    obj.isPremium = isPremium;
    // User viewing their own profile - include private fields but remove sensitive ones
    SENSITIVE_USER_FIELDS.forEach(field => delete obj[field]);
    return obj;
  }  
  // Public view - only return safe fields (including isPremium)
  const sanitized = {};
  PUBLIC_USER_FIELDS.forEach(field => {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  });
  
  return sanitized;
};

/**
 * Sanitize an array of users
 * @param {Array} users - Array of user objects
 * @param {Boolean} isSelf - Whether viewing own data
 * @returns {Array} Array of sanitized user objects
 */
const sanitizeUsers = (users, isSelf = false) => {
  if (!Array.isArray(users)) return [];
  return users.map(user => sanitizeUser(user, isSelf)).filter(Boolean);
};

/**
 * Sanitize goal object for API responses
 * @param {Object} goal - Goal object
 * @param {Boolean} isOwner - Whether the requester owns this goal
 * @param {String} viewerId - ID of the user viewing (for nested user sanitization)
 * @returns {Object} Sanitized goal object
 */
const sanitizeGoal = (goal, isOwner = false, viewerId = null) => {
  if (!goal) return null;
  
  const obj = goal.toObject ? goal.toObject() : { ...goal };
  
  // Remove internal fields
  delete obj.__v;
  delete obj.deletedAt;
  
  // If userId is populated with user object, sanitize it
  if (obj.userId && typeof obj.userId === 'object' && obj.userId._id) {
    const isSelf = viewerId && obj.userId._id.toString() === viewerId.toString();
    obj.userId = sanitizeUser(obj.userId, isSelf);
  }
  
  return obj;
};

/**
 * Sanitize goal for profile page - minimal fields only
 * @param {Object} goal - Goal object
 * @returns {Object} Minimal goal object for profile display
 */
const sanitizeGoalForProfile = (goal) => {
  if (!goal) return null;
  
  const obj = goal.toObject ? goal.toObject() : { ...goal };
  
  return {
    id: obj.id || (obj._id ? obj._id.toString() : undefined),
    title: obj.title,
    description: obj.description,
    category: obj.category,
    year: obj.year,
    createdAt: obj.createdAt,
    completedAt: obj.completedAt
  };
};

/**
 * Sanitize array of goals
 * @param {Array} goals - Array of goal objects
 * @param {Boolean} isOwner - Whether the requester owns these goals
 * @param {String} viewerId - ID of the user viewing
 * @returns {Array} Array of sanitized goals
 */
const sanitizeGoals = (goals, isOwner = false, viewerId = null) => {
  if (!Array.isArray(goals)) return [];
  return goals.map(goal => sanitizeGoal(goal, isOwner, viewerId)).filter(Boolean);
};

/**
 * Sanitize array of goals for profile page - minimal fields
 * @param {Array} goals - Array of goal objects
 * @returns {Array} Array of minimal goal objects
 */
const sanitizeGoalsForProfile = (goals) => {
  if (!Array.isArray(goals)) return [];
  return goals.map(goal => sanitizeGoalForProfile(goal)).filter(Boolean);
};

/**
 * Sanitize journal entry for API responses
 * Minimal fields: id, content, mood, visibility, dayKey, motivation, createdAt
 * @param {Object} entry - Journal entry object
 * @param {Boolean} isOwner - Whether the requester owns this entry
 * @param {String} viewerId - ID of the user viewing
 * @returns {Object} Sanitized journal entry with minimal fields
 */
const sanitizeJournalEntry = (entry, isOwner = false, viewerId = null) => {
  if (!entry) return null;
  
  const obj = entry.toObject ? entry.toObject() : { ...entry };
  
  // Return only essential fields
  const sanitized = {
    content: obj.content,
    mood: obj.mood,
    visibility: obj.visibility,
    dayKey: obj.dayKey,
    createdAt: obj.createdAt,
    id: obj._id ? obj._id.toString() : undefined
  };
  
  // Include AI motivation if available (flatten from ai.motivation to motivation)
  if (obj.ai && obj.ai.motivation) {
    sanitized.motivation = obj.ai.motivation;
  }
  
  return sanitized;
};

/**
 * Sanitize habit object for API responses
 * @param {Object} habit - Habit object
 * @returns {Object} Sanitized habit
 */
const sanitizeHabit = (habit) => {
  if (!habit) return null;
  
  const obj = habit.toObject ? habit.toObject() : { ...habit };
  
  // Remove internal fields
  delete obj.__v;
  
  // Ensure id field exists (handle both MongoDB _id and PostgreSQL id)
  const habitId = obj.id || (obj._id ? obj._id.toString() : undefined);
  
  // Map PostgreSQL snake_case to camelCase for frontend
  return {
    id: habitId,
    name: obj.name,
    description: obj.description || '',
    frequency: obj.frequency,
    daysOfWeek: obj.daysOfWeek || obj.days_of_week || [],
    reminders: obj.reminders || [],
    currentStreak: obj.currentStreak || obj.current_streak || 0,
    longestStreak: obj.longestStreak || obj.longest_streak || 0,
    totalCompletions: obj.totalCompletions || obj.total_completions || 0,
    totalDays: obj.totalDays || obj.total_days || 0,
    targetCompletions: obj.targetCompletions || obj.target_completions || null,
    targetDays: obj.targetDays || obj.target_days || null,
    goalId: obj.goalId || obj.goal_id || null,
    isPublic: obj.isPublic !== undefined ? obj.isPublic : (obj.is_public !== undefined ? obj.is_public : false),
    createdAt: obj.createdAt || obj.created_at,
    updatedAt: obj.updatedAt || obj.updated_at
  };
};

/**
 * Sanitize habit for profile page - minimal fields only
 * @param {Object} habit - Habit object
 * @returns {Object} Minimal habit object for profile display
 */
const sanitizeHabitForProfile = (habit) => {
  if (!habit) return null;
  
  const obj = habit.toObject ? habit.toObject() : { ...habit };
  
  // Handle both MongoDB (_id) and PostgreSQL (id) formats
  const habitId = obj.id || (obj._id ? obj._id.toString() : undefined);
  
  return {
    id: habitId,
    name: obj.name,
    description: obj.description || '',
    frequency: obj.frequency,
    daysOfWeek: obj.daysOfWeek || obj.days_of_week || [],
    timezone: obj.timezone,
    reminders: (obj.reminders || []).map(r => ({
      time: r.time
    })),
    currentStreak: obj.currentStreak || obj.current_streak || 0,
    longestStreak: obj.longestStreak || obj.longest_streak || 0,
    totalCompletions: obj.totalCompletions || obj.total_completions || 0,
    totalDays: obj.totalDays || obj.total_days || 0,
    targetCompletions: obj.targetCompletions || obj.target_completions || null,
    targetDays: obj.targetDays || obj.target_days || null
  };
};

/**
 * Sanitize notification object for API responses
 * @param {Object} notification - Notification object
 * @returns {Object} Sanitized notification
 */
const sanitizeNotification = (notification) => {
  if (!notification) return null;
  
  const obj = notification.toObject ? notification.toObject() : { ...notification };
  
  // Calculate age
  const getAge = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };
  
  const sanitized = {
    id: obj.id,
    type: obj.type,
    title: obj.title,
    message: obj.message,
    isRead: obj.isRead,
    createdAt: obj.createdAt,
    age: getAge(obj.createdAt),
    data: {}
  };
  
  // Add actions for follow requests with notificationId
  if (obj.type === 'follow_request') {
    sanitized.actions = [
      { 
        type: 'accept', 
        label: 'Accept',
        notificationId: obj.id || obj._id 
      },
      { 
        type: 'reject', 
        label: 'Reject',
        notificationId: obj.id || obj._id 
      }
    ];
  }
  
  // Sanitize data based on what's populated
  if (obj.data) {
    // Goal data
    if (obj.data.goalId) {
      if (typeof obj.data.goalId === 'object' && obj.data.goalId._id) {
        sanitized.data.goalId = obj.data.goalId._id;
        sanitized.data.goalTitle = obj.data.goalId.title;
      } else {
        sanitized.data.goalId = obj.data.goalId;
      }
    }
    
    // Actor data (for comments, likes, etc.) - unified as 'actor'
    const actorSource = obj.data.actorId || obj.data.followerId || obj.data.likerId;
    if (actorSource) {
      if (typeof actorSource === 'object' && actorSource.id) {
        sanitized.data.actor = {
          name: actorSource.name,
          username: actorSource.username,
          avatar: actorSource.avatar
        };
      } else {
        // Fallback to stored name/avatar if not populated
        sanitized.data.actor = {
          name: obj.data.actorName || obj.data.followerName || obj.data.likerName,
          username: null,
          avatar: obj.data.actorAvatar || obj.data.followerAvatar || obj.data.likerAvatar
        };
      }
    }
    
    // Activity data
    if (obj.data.activityId) {
      if (typeof obj.data.activityId === 'object' && obj.data.activityId._id) {
        sanitized.data.activityId = obj.data.activityId._id
      } else {
        sanitized.data.activityId = obj.data.activityId;
      }
    }
    
    // Comment data
    if (obj.data.commentId) {
      if (typeof obj.data.commentId === 'object' && obj.data.commentId._id) {
        sanitized.data.commentId = obj.data.commentId._id;
      } else {
        sanitized.data.commentId = obj.data.commentId;
      }
    }
    
    // Habit data
    if (obj.data.habitId) {
      sanitized.data.habitId = typeof obj.data.habitId === 'object' ? obj.data.habitId._id : obj.data.habitId;
    }
    
    // Achievement data
    if (obj.data.achievementName) {
      sanitized.data.achievement = {
        name: obj.data.achievementName,
        icon: obj.data.achievementIcon
      };
    }
  
    
    // Streak data
    if (obj.data.streakCount) {
      sanitized.data.streak = {
        count: obj.data.streakCount,
        type: obj.data.streakType
      };
    }
    
    // Community data
    if (obj.communityId) {
      sanitized.data.communityId = typeof obj.communityId === 'object' ? obj.communityId._id : obj.communityId;
    }
  }
  
  return sanitized;
};

/**
 * Sanitize follow object (follower/following relationship)
 * Minimal fields: only name, username, and avatar
 * @param {Object} follow - Follow object
 * @param {String} viewerId - ID of the user viewing
 * @returns {Object} Sanitized follow object
 */
const sanitizeFollow = (follow, viewerId = null) => {
  if (!follow) return null;
  
  const obj = follow.toObject ? follow.toObject() : { ...follow };
  
  // Remove internal fields
  delete obj.__v;
  
  // Sanitize followerId if populated - keep only name, username, avatar
  if (obj.followerId && typeof obj.followerId === 'object' && obj.followerId._id) {
    const user = obj.followerId;
    obj.followerId = {
      name: user.name,
      username: user.username,
      avatar: user.avatar
    };
  }
  
  // Sanitize followingId if populated - keep only name, username, avatar
  if (obj.followingId && typeof obj.followingId === 'object' && obj.followingId._id) {
    const user = obj.followingId;
    obj.followingId = {
      name: user.name,
      username: user.username,
      avatar: user.avatar
    };
  }
  
  return obj;
};

/**
 * Generic array sanitizer
 * @param {Array} array - Array to sanitize
 * @param {Function} sanitizerFn - Sanitizer function to apply
 * @param  {...any} args - Additional arguments to pass to sanitizer
 * @returns {Array} Sanitized array
 */
const sanitizeArray = (array, sanitizerFn, ...args) => {
  if (!Array.isArray(array)) return [];
  return array.map(item => sanitizerFn(item, ...args)).filter(Boolean);
};

/**
 * Sanitize error for API responses
 * Removes stack traces in production
 * @param {Error} error - Error object
 * @param {Boolean} isDevelopment - Whether in development mode
 * @returns {Object} Sanitized error
 */
const sanitizeError = (error, isDevelopment = false) => {
  const safeError = {
    success: false,
    message: error.message || 'An error occurred'
  };
  
  return safeError;
};

module.exports = {
  sanitizeUser,
  sanitizeUsers,
  sanitizeAuthMe,
  sanitizeGoal,
  sanitizeGoals,
  sanitizeGoalForProfile,
  sanitizeGoalsForProfile,
  sanitizeJournalEntry,
  sanitizeHabit,
  sanitizeHabitForProfile,
  sanitizeNotification,
  sanitizeFollow,
  sanitizeArray,
  sanitizeError,
  // Export field lists for reference
  PUBLIC_USER_FIELDS,
  PRIVATE_USER_FIELDS,
  SENSITIVE_USER_FIELDS
};
