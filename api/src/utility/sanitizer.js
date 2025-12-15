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
  '_id',
  'name',
  'username',
  'avatar',
  'bio',
  'location',
  'gender',
  'interests',
  'isVerified',
  'isPremium',
  'isPrivate',
  'socialLinks',
  'createdAt',
  'followersCount',
  'followingCount',
  'goalsCount'
];

// Additional fields for own profile (self-view)
const PRIVATE_USER_FIELDS = [
  ...PUBLIC_USER_FIELDS,
  'email',
  'dateOfBirth',
  'notificationSettings',
  'dashboardYears',
  'timezone',
  'timezoneOffsetMinutes'
];

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
  
  if (isSelf) {
    // User viewing their own profile - include private fields but remove sensitive ones
    SENSITIVE_USER_FIELDS.forEach(field => delete obj[field]);
    return obj;
  }
  
  // Public view - only return safe fields
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
 * Sanitize journal entry for API responses
 * Minimal fields: _id, content, mood, visibility, dayKey, createdAt, motivation
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
    _id: obj._id,
    content: obj.content,
    mood: obj.mood,
    visibility: obj.visibility,
    dayKey: obj.dayKey,
    createdAt: obj.createdAt
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
  
  return obj;
};

/**
 * Sanitize notification object for API responses
 * @param {Object} notification - Notification object
 * @returns {Object} Sanitized notification
 */
const sanitizeNotification = (notification) => {
  if (!notification) return null;
  
  const obj = notification.toObject ? notification.toObject() : { ...notification };
  
  // Remove internal fields
  delete obj.__v;
  
  // Sanitize data field to remove any sensitive info
  if (obj.data) {
    delete obj.data.email;
    delete obj.data.phone;
    delete obj.data.password;
    delete obj.data.token;
  }
  
  return obj;
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
  
  // Only include detailed error info in development
  if (isDevelopment) {
    safeError.stack = error.stack;
    if (error.errors) {
      safeError.errors = error.errors;
    }
  }
  
  return safeError;
};

module.exports = {
  sanitizeUser,
  sanitizeUsers,
  sanitizeGoal,
  sanitizeGoals,
  sanitizeJournalEntry,
  sanitizeHabit,
  sanitizeNotification,
  sanitizeFollow,
  sanitizeArray,
  sanitizeError,
  // Export field lists for reference
  PUBLIC_USER_FIELDS,
  PRIVATE_USER_FIELDS,
  SENSITIVE_USER_FIELDS
};
