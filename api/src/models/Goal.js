const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    // Basic Goal Information
    title: {
        type: String,
        required: [true, 'Goal title is required'],
        trim: true,
        maxlength: [200, 'Goal title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Goal Description is required'],
        trim: true,
        maxlength: [1000, 'Goal description cannot exceed 1000 characters'],
        default: ''
    },

    // Normalized title for fast case-insensitive search
    titleLower: {
        type: String,
        trim: true,
        index: true
    },

    // Goal Classification
    category: {
        type: String,
        required: [true, 'Goal category is required'],
        enum: [
            'Health & Fitness',
            'Education & Learning',
            'Career & Business',
            'Personal Development',
            'Financial Goals',
            'Creative Projects',
            'Travel & Adventure',
            'Relationships',
            'Family & Friends',
            'Other'
        ]
    },

    // Time Management
    startDate: {
        type: Date,
    },
    targetDate: {
        type: Date,
        validate: {
            validator: function (v) {
                // Skip validation if:
                // 1. No targetDate provided
                // 2. Goal is being completed
                // 3. Existing goal and targetDate is not being modified
                if (!v) return true;

                // Skip validation when completing a goal
                if (this.completed || this.isModified('completed')) {
                    return true;
                }

                // Skip validation for existing goals when targetDate is not being modified
                if (!this.isNew && !this.isModified('targetDate')) {
                    return true;
                }

                // Validate targetDate for new goals or when targetDate is being updated
                const today = new Date();
                const targetDate = new Date(v);

                // Compare dates without time components
                today.setHours(0, 0, 0, 0);
                targetDate.setHours(0, 0, 0, 0);

                return targetDate >= today;
            },
            message: 'Target date must be today or in the future'
        }
    },
    year: {
        type: Number,
        required: [true, 'Year is required'],
        min: 2020,
        max: 2030
    },

    // Goal Division: Sub-Goals (binary) and Habit Links (progressive)
    subGoals: [{
        title: {
            type: String,
            // Optional when linkedGoalId is provided
            trim: true,
            maxlength: 200
        },
        linkedGoalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Goal',
            default: undefined
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        completedAt: {
            type: Date
        }
    }],
    habitLinks: [{
        habitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Habit',
            required: true,
            index: true
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        // Optional override for this habit's contribution window end
        endDate: {
            type: Date
        }
    }],
    // Completion Information
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    completionNote: {
        type: String,
        trim: true,
        maxlength: [1000, 'Completion note cannot exceed 1000 characters'],
        validate: {
            validator: function (v) {
                if (this.completed && v) {
                    const wordCount = v.trim().split(/\s+/).length;
                    return wordCount >= 10;
                }
                return true;
            },
            message: 'Completion note must be at least 10 words'
        }
    },
    completionAttachmentUrl: {
        type: String,
        trim: true,
        default: ''
    },

    // Owner Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    likeCount: {
        type: Number,
        default: 0
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Sharing Settings
    shareCompletionNote: {
        type: Boolean,
        default: true
    },
    // View permission for non-owners
    isPublic: {
        type: Boolean,
        default: true
    },
    isShareable: {
        type: Boolean,
        default: true
    },
    shareUrl: {
        type: String,
        trim: true
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
            ref: 'Goal'
        }
    },

    // Flag to identify community source goals (not shown in personal goals)
    isCommunitySource: {
        type: Boolean,
        default: false,
        index: true
    },

    // Store original category for community goals (since source uses 'Other' for enum validation)
    originalCategory: {
        type: String,
        enum: [
            'Health & Fitness',
            'Education & Learning',
            'Career & Business',
            'Personal Development',
            'Financial Goals',
            'Creative Projects',
            'Travel & Adventure',
            'Relationships',
            'Family & Friends',
            'Other'
        ]
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
goalSchema.index({ userId: 1, year: 1 });
goalSchema.index({ userId: 1, completed: 1 });
goalSchema.index({ category: 1 });
goalSchema.index({ completed: 1, completedAt: -1 });
goalSchema.index({ createdAt: -1 });
goalSchema.index({ targetDate: 1 });
goalSchema.index({ 'subGoals.completed': 1 });
goalSchema.index({ 'subGoals.linkedGoalId': 1 });
goalSchema.index({ 'habitLinks.habitId': 1 });
goalSchema.index({ completed: 1, isDiscoverable: 1, titleLower: 1, category: 1 });
// Optimized indexes for trending queries (public, active, completed, by likes)
goalSchema.index({ isPublic: 1, isActive: 1, completed: 1, likeCount: -1, completedAt: -1 });
goalSchema.index({ isPublic: 1, isActive: 1, completed: 1, category: 1, likeCount: -1, completedAt: -1 });

// Compound indexes for search optimization
goalSchema.index({ isPublic: 1, isActive: 1, completed: 1, titleLower: 1 }); // For text search
goalSchema.index({ isPublic: 1, isActive: 1, completed: 1, category: 1, completedAt: -1 }); // For category filter + sort
goalSchema.index({ userId: 1, isActive: 1, completed: 1 }); // For user's own goals lookup

// Virtual for days until target
goalSchema.virtual('daysUntilTarget').get(function () {
    if (!this.targetDate) return null;
    const today = new Date();
    const target = new Date(this.targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for completion status
goalSchema.virtual('canComplete').get(function () {
    return !this.completed;
});


// Virtual for early completion status
goalSchema.virtual('isEarlyCompletion').get(function () {
    if (!this.completed || !this.completedAt || !this.targetDate) return false;
    return new Date(this.completedAt) < new Date(this.targetDate);
});

// REMOVED: isLocked virtual - lock-in period removed

// REMOVED: Lock-in period calculation - simplified for better UX

// Normalize titleLower
goalSchema.pre('save', function (next) {
    if (this.isModified('title')) {
        this.titleLower = (this.title || '').toLowerCase();
    }
    next();
});

// Pre-save middleware to update completion timestamp
goalSchema.pre('save', function (next) {
    if (this.isModified('completed') && this.completed && !this.completedAt) {
        this.completedAt = new Date();
    }

    if (this.isModified('completed') && !this.completed) {
        this.completedAt = undefined;
        this.completionNote = ''
    }

    next();
});

// Method to complete a goal
goalSchema.methods.completeGoal = function (completionNote = '', shareCompletionNote = true) {
    if (this.completed) {
        throw new Error('Goal is already completed');
    }


    this.completed = true;
    this.completedAt = new Date();
    this.completionNote = completionNote;
    this.shareCompletionNote = shareCompletionNote;

    return this.save();
};

// Static method to get recent activities
goalSchema.statics.getRecentActivities = function (limit = 15) {
    return this.find({ completed: true, isActive: true })
        .sort({ completedAt: -1 })
        .limit(limit)
        .populate('userId', 'name avatar')
        .select('title category completedAt userId');
};

// Static method to get goals by user and year
goalSchema.statics.getUserGoalsByYear = function (userId, year) {
    return this.find({ userId, year, isActive: true })
        .sort({ createdAt: -1 });
};

// Static method to get user statistics
goalSchema.statics.getUserStats = function (userId) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
        {
            $group: {
                _id: null,
                totalGoals: { $sum: 1 },
                completedGoals: { $sum: { $cond: ['$completed', 1, 0] } },
                goalsByCategory: {
                    $push: {
                        category: '$category',
                        completed: '$completed'
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Goal', goalSchema); 