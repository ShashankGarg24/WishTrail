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
        title: String,
        linkedGoalId: Number,
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
        completedAt: Date,
        description: String
      }],
      habits: [{
        habitId: {
          type: Number,
          required: true
        },
        weight: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        },
        endDate: Date
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
  completionFeeling: {
    type: String,
    enum: ['excited', 'proud', 'relieved', 'happy', 'satisfied', 'neutral', 'accomplished', 'grateful'],
    default: 'neutral'
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
  const subGoals = this.progress?.breakdown?.subGoals || [];
  const habits = this.progress?.breakdown?.habits || [];
  
  const subGoalsCompleted = subGoals.filter(sg => sg.completed).length;
  const subGoalsTotal = subGoals.length;
  
  // Calculate total weight
  const totalWeight = subGoals.reduce((sum, sg) => sum + (sg.weight || 0), 0) +
                      habits.reduce((sum, hl) => sum + (hl.weight || 0), 0);
  
  if (totalWeight === 0) {
    return subGoalsTotal > 0 ? Math.round((subGoalsCompleted / subGoalsTotal) * 100) : 0;
  }
  
  const subGoalProgress = subGoals.reduce((sum, sg) => {
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
      progress: {
        percent: 0,
        breakdown: {
          subGoals: defaults.subGoals || [],
          habits: defaults.habitLinks || []
        },
        lastCalculated: new Date()
      },
      ...defaults
    });
  }
  
  return details;
};

module.exports = mongoose.model('GoalDetails', goalDetailsSchema);
