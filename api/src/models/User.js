const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEFAULT_AVATAR_MALE = process.env.DEFAULT_AVATAR_MALE_URL || '';
const DEFAULT_AVATAR_FEMALE = process.env.DEFAULT_AVATAR_FEMALE_URL || '';
const DEFAULT_AVATAR_OTHER = process.env.DEFAULT_AVATAR_OTHER_URL || '';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  username: {
    type: String,
    unique: true,
    required: [true, 'Username is required'],
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [
      /^[a-zA-Z0-9._-]+$/,
      'Username can only contain letters, numbers, dots, hyphens, and underscores'
    ]
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: false, // Not required for Google SSO users
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  passwordChangedAt: {
    type: Date,
  },

  // OAuth Integration
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values to not be indexed
  },

  avatar: {
    type: String,
    default: function() {
      if (DEFAULT_AVATAR_OTHER) return DEFAULT_AVATAR_OTHER;
      // Fallback to dicebear with unique seed
      const seed = encodeURIComponent(this.email || this.username || this.name || String(this._id));
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },
  currentMood: {
    type: String,
    maxlength: [10, 'Mood emoji cannot exceed 10 characters'],
    default: '⭐'
  },

  // Timezone preferences (auto-detected)
  timezone: {
    type: String,
    default: '' // IANA name, e.g., "America/Los_Angeles"
  },
  timezoneOffsetMinutes: {
    type: Number,
    default: null // minutes east of UTC (e.g., -480 for PST -> send -offset if using JS getTimezoneOffset)
  },

  // Last time the user was active (app open or key action)
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        // Must be at least 13 years old
        if (!v) return true; // Optional field
        const today = new Date();
        const age = today.getFullYear() - v.getFullYear();
        return age >= 13;
      },
      message: 'You must be at least 13 years old to use this service'
    }
  },
  interests: [{
    type: String,
    enum: [
      'fitness', 'health', 'travel', 'education', 'career', 'finance', 
      'hobbies', 'relationships', 'personal_growth', 'creativity', 
      'technology', 'business', 'lifestyle', 'spirituality', 'sports',
      'music', 'art', 'reading', 'cooking', 'gaming', 'nature', 'volunteering'
    ]
  }],
  profileCompleted: {
    type: Boolean,
    default: false
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  // Dashboard preferences
  dashboardYears: {
    type: [Number],
    default: []
  },
  // Notification preferences
  notificationSettings: {
    inAppEnabled: { type: Boolean, default: true },
    habits: {
      enabled: { type: Boolean, default: true },
      skipIfDone: { type: Boolean, default: true }
    },
    journal: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['daily','weekly','off'], default: 'daily' }
    },
    motivation: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['off','daily','weekly'], default: 'off' }
    },
    social: {
      enabled: { type: Boolean, default: true }
    }
  },
  preferences: {
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      achievements: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      }
    }
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  areHabitsPrivate: {
    type: Boolean,
    default: true
  },
  
  // Social Links
  website: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  youtube: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(v);
      },
      message: 'YouTube must be a valid YouTube URL'
    }
  },
  instagram: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?instagram\.com\/.+/.test(v);
      },
      message: 'Instagram must be a valid Instagram URL'
    }
  },
  
  // Gamification & Statistics
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: String,
    enum: ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'],
    default: 'Novice'
  },
  totalGoals: {
    type: Number,
    default: 0,
    min: 0
  },
  completedGoals: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },

  followerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Daily Activity Tracking
  dailyCompletions: {
    type: Map,
    of: [{
      goalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal'
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: undefined
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  refreshTokens: {
    app: { type: String, default: null, select: false },
    web: { type: String, default: null, select: false }
  },
  
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Email Verification
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ totalPoints: -1 });
userSchema.index({ completedGoals: -1 });
userSchema.index({ createdAt: -1 });

// Compound indexes for search optimization
userSchema.index({ isActive: 1, totalPoints: -1 }); // For discover/leaderboard
userSchema.index({ isActive: 1, interests: 1, totalPoints: -1 }); // For interest-based search
userSchema.index({ isActive: 1, username: 1, name: 1 }); // For name/username search

// Virtual for completion rate
userSchema.virtual('completionRate').get(function() {
  if (this.totalGoals === 0) return 0;
  return Math.round((this.completedGoals / this.totalGoals) * 100);
});

// Virtual for level info with icon and color
userSchema.virtual('levelInfo').get(function() {
  const levels = {
    'Novice': { icon: '🎯', color: 'text-gray-500', minPoints: 0 },
    'Beginner': { icon: '🌱', color: 'text-orange-500', minPoints: 50 },
    'Intermediate': { icon: '🚀', color: 'text-green-500', minPoints: 100 },
    'Advanced': { icon: '💎', color: 'text-blue-500', minPoints: 200 },
    'Expert': { icon: '⭐', color: 'text-purple-500', minPoints: 500 },
    'Master': { icon: '🏆', color: 'text-yellow-500', minPoints: 1000 }
  };
  
  return levels[this.level] || levels['Novice'];
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run if password is modified
  if (!this.isModified('password')) return next();
  
  // Hash password with salt of 12
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  
  next();
});

// Pre-save middleware to update level based on points
userSchema.pre('save', function(next) {
  if (this.isModified('totalPoints')) {
    const points = this.totalPoints;
    
    if (points >= 1000) this.level = 'Master';
    else if (points >= 500) this.level = 'Expert';
    else if (points >= 200) this.level = 'Advanced';
    else if (points >= 100) this.level = 'Intermediate';
    else if (points >= 50) this.level = 'Beginner';
    else this.level = 'Novice';
  }
  
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      name: this.name
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '24h',
      issuer: 'wishtrail-api',
      audience: 'wishtrail-app'
    }
  );
};

// Instance method to get today's completion count
userSchema.methods.getTodayCompletionCount = function() {
  const today = new Date().toISOString().split('T')[0];
  if (!this.dailyCompletions) return 0;
  const todayCompletions = this.dailyCompletions.get(today);
  return Array.isArray(todayCompletions) ? todayCompletions.length : 0;
};

userSchema.methods.increaseCompletedGoals = function () {
  this.completedGoals = (this.completedGoals || 0) + 1;
};

userSchema.methods.decreaseCompletedGoals = function () {
  this.completedGoals = Math.max((this.completedGoals || 0) - 1, 0);
};

userSchema.methods.increaseTotalGoals = function () {
  this.totalGoals = (this.totalGoals || 0) + 1;
  return this.save();
};

userSchema.methods.decreaseTotalGoals = function () {
  this.totalGoals = Math.max((this.totalGoals || 0) - 1, 0);
  return this.save();
};

userSchema.methods.increaseFollowerCount = function () {
  this.followerCount = (this.followerCount || 0) + 1;
  return this.save();
};

userSchema.methods.increaseFollowingCount = function () {
  this.followingCount = (this.followingCount || 0) + 1;
  return this.save();
};

userSchema.methods.decreaseFollowerCount = function () {
  this.followerCount = Math.max((this.followerCount || 0) - 1, 0);
  return this.save();
};

userSchema.methods.decreaseFollowingCount = function () {
  this.followingCount = Math.max((this.followingCount || 0) - 1, 0);
  return this.save();
};

// Instance method to add daily completion
userSchema.methods.addDailyCompletion = function(goalId) {
  const today = new Date().toISOString().split('T')[0];
  const todayCompletions = this.dailyCompletions.get(today) || [];
  // prevent duplicates for same goal in same day
  const filtered = todayCompletions.filter(c => String(c.goalId) !== String(goalId));
  filtered.push({ goalId, completedAt: new Date() });
  this.dailyCompletions.set(today, filtered);
  // prune to last 7 days on mutate (best-effort in doc context)
  try {
    const nowMid = new Date(); nowMid.setHours(0,0,0,0);
    const minKeep = new Date(nowMid.getTime() - 6 * 24 * 60 * 60 * 1000);
    for (const key of this.dailyCompletions.keys()) {
      const d = new Date(key);
      if (!isNaN(d) && d < minKeep) {
        this.dailyCompletions.delete(key);
      }
    }
  } catch (_) {}
};

//Add to total Points
userSchema.methods.addToTotalPoints = async function(points) {
  // Ensure points is a number
  const validPoints = typeof points === 'number' && !isNaN(points) ? points : 0;
  const existingPoints = typeof this.totalPoints === 'number' && !isNaN(this.totalPoints) ? this.totalPoints : 0;

  this.totalPoints = existingPoints + validPoints;
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ completedGoals: -1, totalPoints: -1, createdAt: 1 })
    .limit(limit)
    .select('name avatar bio location completedGoals totalPoints currentStreak level createdAt');
};

// Static method to search users
userSchema.statics.searchUsers = function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [
      { name: searchRegex },
      { bio: searchRegex },
      { location: searchRegex }
    ]
  })
  .limit(limit)
  .select('name avatar bio location completedGoals totalPoints level createdAt');
};

module.exports = mongoose.model('User', userSchema); 