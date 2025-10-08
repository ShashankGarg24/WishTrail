const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Core
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },

  // Scheduling
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily',
    index: true
  },
  // Days of week 0-6 (Sun-Sat). Used for weekly/custom frequencies
  daysOfWeek: {
    type: [Number],
    default: undefined,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      },
      message: 'daysOfWeek must contain integers in range 0..6'
    }
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  reminders: [{
    time: { type: String, trim: true }, // HH:mm in user timezone
  }],

  // Optional linkage
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },

  // Gamification
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
  lastLoggedDateKey: {
    type: String, // YYYY-MM-DD (UTC)
    default: ''
  },
  totalCompletions: {
    type: Number,
    default: 0,
    min: 0
  },

  // Visibility & status
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Community Integration
  communityInfo: {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community'
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityItem'
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit'
    }
  },
  
  // Flag to identify community source habits (not shown in personal habits)
  isCommunitySource: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ userId: 1, isActive: 1, createdAt: -1 });

habitSchema.virtual('scheduleSummary').get(function() {
  if (this.frequency === 'daily') return 'Every day';
  const map = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const days = (this.daysOfWeek || []).sort().map(d => map[d]).join(', ');
  return this.frequency === 'weekly' ? (days || 'Weekly') : (days || 'Custom');
});

module.exports = mongoose.model('Habit', habitSchema);


