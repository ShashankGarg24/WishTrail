const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  // User who earned the achievement
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Achievement that was earned
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: [true, 'Achievement ID is required'],
    index: true
  },
  
  // When the achievement was earned
  earnedAt: {
    type: Date,
    default: Date.now,
    index: -1
  },
  
  // Progress towards achievement (for partial achievements)
  progress: {
    type: Number,
    default: 100, // 100% means fully earned
    min: 0,
    max: 100
  },
  
  // Current values when achievement was earned (for historical tracking)
  progressData: {
    pointsWhenEarned: Number,
    goalsCompletedWhenEarned: Number,
    streakWhenEarned: Number,
    followersWhenEarned: Number,
    followingWhenEarned: Number,
    accountAgeWhenEarned: Number, // Days
    
    // Category-specific progress
    categoryProgress: {
      type: Map,
      of: Number
    },
    
    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Achievement notification status
  notificationSent: {
    type: Boolean,
    default: false
  },
  
  // For repeatable achievements
  occurrenceNumber: {
    type: Number,
    default: 1,
    min: 1
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate achievements (unless repeatable)
userAchievementSchema.index({ userId: 1, achievementId: 1, occurrenceNumber: 1 }, { unique: true });

// Additional indexes for performance
userAchievementSchema.index({ userId: 1, earnedAt: -1 });
userAchievementSchema.index({ achievementId: 1, earnedAt: -1 });
userAchievementSchema.index({ earnedAt: -1 });

// Virtual for time since earned
userAchievementSchema.virtual('timeSinceEarned').get(function() {
  const now = new Date();
  const diff = now - this.earnedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just earned';
});

// Pre-save middleware to capture progress data
userAchievementSchema.pre('save', async function(next) {
  if (this.isNew && !this.progressData.pointsWhenEarned) {
    try {
      const User = mongoose.model('User');
      const Goal = mongoose.model('Goal');
      const Follow = mongoose.model('Follow');
      
      const user = await User.findById(this.userId);
      
      if (user) {
        // Capture user stats when achievement was earned
        this.progressData.pointsWhenEarned = user.totalPoints;
        this.progressData.goalsCompletedWhenEarned = user.completedGoals;
        this.progressData.streakWhenEarned = user.currentStreak;
        this.progressData.accountAgeWhenEarned = Math.floor(
          (new Date() - user.createdAt) / (1000 * 60 * 60 * 24)
        );
        
        // Get social stats
        const [followerCount, followingCount] = await Promise.all([
          Follow.getFollowerCount(this.userId),
          Follow.getFollowingCount(this.userId)
        ]);
        
        this.progressData.followersWhenEarned = followerCount;
        this.progressData.followingWhenEarned = followingCount;
        
        // Get category progress
        const goals = await Goal.find({ userId: this.userId, completed: true });
        const categoryProgress = new Map();
        
        goals.forEach(goal => {
          const count = categoryProgress.get(goal.category) || 0;
          categoryProgress.set(goal.category, count + 1);
        });
        
        this.progressData.categoryProgress = categoryProgress;
      }
    } catch (error) {
      console.error('Error capturing progress data:', error);
    }
  }
  
  next();
});

// Static method to award achievement to user
userAchievementSchema.statics.awardAchievement = async function(userId, achievementId, progressData = {}) {
  try {
    const Achievement = mongoose.model('Achievement');
    const achievement = await Achievement.findById(achievementId);
    
    if (!achievement) {
      throw new Error('Achievement not found');
    }
    
    // Check if user already has this achievement
    let occurrenceNumber = 1;
    if (achievement.isRepeatable) {
      const existingCount = await this.countDocuments({ userId, achievementId });
      occurrenceNumber = existingCount + 1;
    } else {
      const existing = await this.findOne({ userId, achievementId });
      if (existing) {
        throw new Error('User already has this achievement');
      }
    }
    
    // Create user achievement record
    const userAchievement = new this({
      userId,
      achievementId,
      occurrenceNumber,
      progressData
    });
    
    const savedAchievement = await userAchievement.save();
    
    // Update user's total points if achievement has point rewards
    if (achievement.rewards && achievement.rewards.points > 0) {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(userId, {
        $inc: { totalPoints: achievement.rewards.points }
      });
    }
    
    const currentUser = (await User.findById(userId).select('name avatar').lean());

    // Create activity record
    await Activity.createActivity(
      userId,
      currentUser.name,
      currentUser.avatar,
      'achievement_earned',
      {
        achievementId,
        achievementName: achievement.name,
        pointsEarned: achievement.rewards?.points || 0
      }
    );
    
    // Create notification
    const Notification = mongoose.model('Notification');
    await Notification.createAchievementNotification(userId, achievement);
    
    return savedAchievement;
  } catch (error) {
    throw error;
  }
};

// Static method to get user's achievements with details
userAchievementSchema.statics.getUserAchievementsWithDetails = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ earnedAt: -1 })
    .limit(limit)
    .populate({
      path: 'achievementId',
      select: 'name description icon type rarity rewards'
    });
};

// Static method to get recent achievements across all users
userAchievementSchema.statics.getRecentAchievements = function(limit = 10) {
  return this.find({})
    .sort({ earnedAt: -1 })
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'name avatar level'
    })
    .populate({
      path: 'achievementId',
      select: 'name description icon type rarity'
    });
};

// Static method to get achievement statistics
userAchievementSchema.statics.getAchievementStats = function(achievementId) {
  return this.aggregate([
    {
      $match: { achievementId: new mongoose.Types.ObjectId(achievementId) }
    },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: 1 },
        firstEarned: { $min: '$earnedAt' },
        lastEarned: { $max: '$earnedAt' },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);
};

// Static method to get user's achievement progress
userAchievementSchema.statics.getUserAchievementProgress = async function(userId) {
  const Achievement = mongoose.model('Achievement');
  
  const [earnedAchievements, allAchievements] = await Promise.all([
    this.find({ userId }).populate('achievementId'),
    Achievement.find({ isActive: true, isSecret: false })
  ]);
  
  const earnedIds = earnedAchievements.map(ua => ua.achievementId._id.toString());
  const availableAchievements = allAchievements.filter(a => 
    !earnedIds.includes(a._id.toString()) || a.isRepeatable
  );
  
  return {
    earned: earnedAchievements,
    available: availableAchievements,
    totalEarned: earnedAchievements.length,
    totalAvailable: allAchievements.length,
    completionRate: Math.round((earnedAchievements.length / allAchievements.length) * 100)
  };
};

// Static method to get achievement leaderboard
userAchievementSchema.statics.getAchievementLeaderboard = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$userId',
        achievementCount: { $sum: 1 },
        latestAchievement: { $max: '$earnedAt' },
        rareAchievements: {
          $sum: {
            $cond: [
              { $in: ['$achievementId.rarity', ['rare', 'epic', 'legendary']] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 
        achievementCount: -1, 
        rareAchievements: -1,
        latestAchievement: -1 
      }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        achievementCount: 1,
        rareAchievements: 1,
        latestAchievement: 1,
        user: {
          name: 1,
          avatar: 1,
          level: 1
        }
      }
    }
  ]);
};

// Static method to get trending achievements
userAchievementSchema.statics.getTrendingAchievements = function(timeFrame = 'week', limit = 10) {
  const timeFrames = {
    'day': 1,
    'week': 7,
    'month': 30
  };
  
  const daysBack = timeFrames[timeFrame] || 7;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysBack);
  
  return this.aggregate([
    {
      $match: {
        earnedAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: '$achievementId',
        recentEarns: { $sum: 1 },
        latestEarn: { $max: '$earnedAt' }
      }
    },
    {
      $sort: { recentEarns: -1, latestEarn: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'achievements',
        localField: '_id',
        foreignField: '_id',
        as: 'achievement'
      }
    },
    {
      $unwind: '$achievement'
    },
    {
      $project: {
        achievementId: '$_id',
        recentEarns: 1,
        latestEarn: 1,
        achievement: {
          name: 1,
          description: 1,
          icon: 1,
          type: 1,
          rarity: 1
        }
      }
    }
  ]);
};

module.exports = mongoose.model('UserAchievement', userAchievementSchema); 