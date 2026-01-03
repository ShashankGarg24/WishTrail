const mongoose = require('mongoose');

/**
 * Extended schema for Goal details stored in MongoDB
 * References PostgreSQL goal.id
 */
const goalDetailsSchema = new mongoose.Schema({
  // Reference to PostgreSQL goals table
  goalId: {
    type: Number, // PostgreSQL BIGINT
    required: true,
    unique: true
  },
  
  // Rich text content
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  
  // Sub-goals (nested structure - not in PostgreSQL)
  subGoals: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    linkedGoalId: {
      type: Number, // Reference to another goal in PostgreSQL
      sparse: true
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  }],
  
  // Habit links (many-to-many relationship)
  habitLinks: [{
    habitId: {
      type: Number, // Reference to PostgreSQL habits table
      required: true
    },
    habitName: String, // Denormalized for display
    weight: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    endDate: {
      type: Date,
      default: null
    }
  }],
  
  // Progress tracking (computed, cached here)
  progress: {
    percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    breakdown: {
      subGoals: [{
        id: mongoose.Schema.Types.Mixed,
        title: String,
        completed: Boolean,
        weight: Number
      }],
      habits: [{
        id: Number,
        name: String,
        progress: Number,
        weight: Number
      }]
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Completion details
  completionNote: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  completionAttachmentUrl: {
    type: String,
    trim: true,
    default: ''
  },
  shareCompletionNote: {
    type: Boolean,
    default: false
  },
  
  // Community info (if shared to community)
  // communityInfo: {
  //   sourceId: Number, // Original goal ID if this is a copy
  //   sharedAt: Date,
  //   participantCount: {
  //     type: Number,
  //     default: 0
  //   }
  // },
  
  // Metadata
  metadata: {
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  },
  
  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Virtual for populated data (if needed)
goalDetailsSchema.virtual('linkedGoals', {
  ref: 'GoalDetails',
  localField: 'subGoals.linkedGoalId',
  foreignField: 'goalId'
});

// Method to calculate progress
goalDetailsSchema.methods.calculateProgress = async function() {
  const subGoalsCompleted = this.subGoals.filter(sg => sg.completed).length;
  const subGoalsTotal = this.subGoals.length;
  
  // Get habit progress (would need to query PostgreSQL habit_logs)
  // This is a simplified version
  const totalWeight = this.subGoals.reduce((sum, sg) => sum + (sg.weight || 0), 0) +
                      this.habitLinks.reduce((sum, hl) => sum + (hl.weight || 0), 0);
  
  if (totalWeight === 0) {
    return subGoalsTotal > 0 ? Math.round((subGoalsCompleted / subGoalsTotal) * 100) : 0;
  }
  
  const subGoalProgress = this.subGoals.reduce((sum, sg) => {
    return sum + (sg.completed ? (sg.weight || 0) : 0);
  }, 0);
  
  return Math.round((subGoalProgress / totalWeight) * 100);
};

// Static method to get or create goal details
goalDetailsSchema.statics.getOrCreate = async function(goalId, defaults = {}) {
  let details = await this.findOne({ goalId, isActive: true });
  
  if (!details) {
    details = await this.create({
      goalId,
      description: defaults.description || '',
      subGoals: defaults.subGoals || [],
      habitLinks: defaults.habitLinks || [],
      ...defaults
    });
  }
  
  return details;
};

module.exports = mongoose.model('GoalDetails', goalDetailsSchema);
