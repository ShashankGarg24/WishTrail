const mongoose = require('mongoose');

/**
 * Extended schema for User preferences and settings stored in MongoDB
 * References PostgreSQL user.id
 */
const userPreferencesSchema = new mongoose.Schema({
  // Reference to PostgreSQL users table
  userId: {
    type: Number, // PostgreSQL BIGINT
    required: true,
    unique: true
  },
  
  // User interests for personalization
  interests: {
    type: [String],
    default: [],
    validate: [arr => arr.length <= 10, 'Maximum 10 interests allowed']
  },
  
  // Privacy settings
  privacy: {
    showEmail: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: true
    },
    allowFollow: {
      type: Boolean,
      default: true
    },
    showGoals: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'followers'
    },
    showActivity: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'followers'
    }
  },
  
  // Notification preferences
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      goalReminders: { type: Boolean, default: true },
      socialUpdates: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true }
    },
    push: {
      enabled: { type: Boolean, default: true },
      goalReminders: { type: Boolean, default: true },
      socialUpdates: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      habitReminders: { type: Boolean, default: true },
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' }, // HH:mm format
        end: { type: String, default: '08:00' }
      }
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibration: { type: Boolean, default: true }
    }
  },
  
  // App preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: ''
    },
    dateFormat: {
      type: String,
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      default: 'MM/DD/YYYY'
    },
    startOfWeek: {
      type: Number,
      enum: [0, 1], // 0 = Sunday, 1 = Monday
      default: 0
    },
    defaultGoalVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    },
    autoShareCompletions: {
      type: Boolean,
      default: false
    }
  },
  
  // Dashboard settings
  dashboardYears: {
    type: [Number],
    default: []
  },
  
  // Social links
  socialLinks: {
    website: {
      type: String,
      trim: true,
      maxlength: 200,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid website URL'
      }
    },
    youtube: {
      type: String,
      trim: true,
      maxlength: 200,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(v);
        },
        message: 'Invalid YouTube URL'
      }
    },
    instagram: {
      type: String,
      trim: true,
      maxlength: 200,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/(www\.)?instagram\.com\/.+/.test(v);
        },
        message: 'Invalid Instagram URL'
      }
    },
    twitter: {
      type: String,
      trim: true,
      maxlength: 200
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  
  // Onboarding and feature flags
  onboarding: {
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    steps: {
      profileSetup: { type: Boolean, default: false },
      firstGoalCreated: { type: Boolean, default: false },
      firstHabitCreated: { type: Boolean, default: false },
      followedUsers: { type: Boolean, default: false },
      joinedCommunity: { type: Boolean, default: false }
    }
  },
  
  // Feature usage tracking
  featureUsage: {
    lastGoalCreated: Date,
    lastHabitLogged: Date,
    lastCommunityVisit: Date,
    lastJournalEntry: Date,
    totalGoalsCreated: { type: Number, default: 0 },
    totalHabitsCreated: { type: Number, default: 0 },
    totalJournalEntries: { type: Number, default: 0 }
  },
  
  // Blocked users (denormalized for quick access)
  blockedUsers: {
    type: [Number], // Array of user IDs from PostgreSQL
    default: []
  },
  
  // Muted users
  mutedUsers: {
    type: [Number], // Array of user IDs from PostgreSQL
    default: []
  },
  
  // Daily completions tracking (last 7 days for heatmap)
  dailyCompletions: {
    type: Map,
    of: [{
      goalId: Number,
      completedAt: Date
    }],
    default: new Map()
  },
  
  // Metadata
  metadata: {
    lastSyncedAt: {
      type: Date,
      default: Date.now
    },
    appVersion: String,
    platform: String
  }
}, {
  timestamps: true,
  versionKey: false,
  strict: false // Allow additional fields for flexibility
});

// Static method to get or create preferences
userPreferencesSchema.statics.getOrCreate = async function(userId, defaults = {}) {
  let prefs = await this.findOne({ userId });
  
  if (!prefs) {
    prefs = await this.create({
      userId,
      ...defaults
    });
  }
  
  return prefs;
};

// Method to add blocked user
userPreferencesSchema.methods.blockUser = async function(blockedUserId) {
  if (!this.blockedUsers.includes(blockedUserId)) {
    this.blockedUsers.push(blockedUserId);
    await this.save();
  }
};

// Method to unblock user
userPreferencesSchema.methods.unblockUser = async function(blockedUserId) {
  this.blockedUsers = this.blockedUsers.filter(id => id !== blockedUserId);
  await this.save();
};

// Method to update daily completions (keep only last 7 days)
userPreferencesSchema.methods.addDailyCompletion = async function(goalId, completedAt = new Date()) {
  const dateKey = completedAt.toISOString().split('T')[0];
  const current = this.dailyCompletions.get(dateKey) || [];
  
  // Check if already exists
  if (!current.some(c => c.goalId === goalId)) {
    current.push({ goalId, completedAt });
    this.dailyCompletions.set(dateKey, current);
    
    // Clean up old entries (keep only last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const [key] of this.dailyCompletions) {
      const keyDate = new Date(key);
      if (keyDate < sevenDaysAgo) {
        this.dailyCompletions.delete(key);
      }
    }
    
    await this.save();
  }
};

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
