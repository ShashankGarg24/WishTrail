const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  // Basic Achievement Information
  name: {
    type: String,
    required: [true, 'Achievement name is required'],
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String,
    required: [true, 'Achievement icon is required'],
    default: '🏆'
  },
  
  // Achievement Classification
  type: {
    type: String,
    required: [true, 'Achievement type is required'],
    enum: [
      'streak',        // Consecutive days achievements
      'category',      // Category-specific achievements
      'points',        // Points-based achievements
      'social',        // Social interaction achievements
      'special',       // Special event achievements
      'completion',    // Goal completion achievements
      'milestone',     // General milestone achievements
      'time'          // Time-based achievements
    ],
    index: true
  },
  
  // Achievement Rarity
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common',
    index: true
  },
  
  // Achievement Criteria
  criteria: {
    // Streak requirements
    streakDays: {
      type: Number,
      min: 1
    },
    streakType: {
      type: String,
      enum: ['daily_login', 'daily_completion', 'weekly_goals']
    },
    
    // Points requirements
    pointsRequired: {
      type: Number,
      min: 0
    },
    
    // Category requirements
    categoryGoalsRequired: {
      type: Number,
      min: 1
    },
    targetCategory: {
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
    },
    
    // Social requirements
    followersRequired: {
      type: Number,
      min: 1
    },
    followingRequired: {
      type: Number,
      min: 1
    },
    likesGivenRequired: {
      type: Number,
      min: 1
    },
    likesReceivedRequired: {
      type: Number,
      min: 1
    },
    
    // Completion requirements
    totalGoalsRequired: {
      type: Number,
      min: 1
    },
    completedGoalsRequired: {
      type: Number,
      min: 1
    },
    goalsInTimeframeRequired: {
      type: Number,
      min: 1
    },
    timeframeType: {
      type: String,
      enum: ['day', 'week', 'month', 'year']
    },
    
    // Time-based requirements
    accountAgeRequired: {
      type: Number, // Days since account creation
      min: 1
    },
    
    // Special requirements
    specialConditions: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Rewards
  rewards: {
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    title: String, // Special user title
    badge: String, // Special badge URL
    unlockables: [String] // Future features unlock
  },
  
  // Achievement Properties
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSecret: {
    type: Boolean,
    default: false // Hidden achievements
  },
  isRepeatable: {
    type: Boolean,
    default: false // Can be earned multiple times
  },
  
  // Order and display
  displayOrder: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Statistics
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
achievementSchema.index({ name: 1 });
achievementSchema.index({ type: 1, isActive: 1 });
achievementSchema.index({ rarity: 1, isActive: 1 });
achievementSchema.index({ isActive: 1, displayOrder: 1 });

// Virtual for achievement difficulty
achievementSchema.virtual('difficulty').get(function() {
  const rarityDifficulty = {
    'common': 1,
    'uncommon': 2,
    'rare': 3,
    'epic': 4,
    'legendary': 5
  };
  
  return rarityDifficulty[this.rarity] || 1;
});

// Virtual for completion percentage
achievementSchema.virtual('completionRate').get(function() {
  const User = mongoose.model('User');
  // This would need to be calculated separately as it requires async operation
  return 0;
});

// Static method to create default achievements
achievementSchema.statics.createDefaultAchievements = async function() {
  const defaultAchievements = [
    // Streak Achievements
    {
      name: 'First Steps',
      description: 'Complete your first goal',
      icon: '🎯',
      type: 'completion',
      rarity: 'common',
      criteria: { completedGoalsRequired: 1 },
      rewards: { points: 10 },
      displayOrder: 1
    },
    {
      name: 'On Fire',
      description: 'Complete goals for 3 days in a row',
      icon: '🔥',
      type: 'streak',
      rarity: 'uncommon',
      criteria: { streakDays: 3, streakType: 'daily_completion' },
      rewards: { points: 25 },
      displayOrder: 2
    },
    {
      name: 'Unstoppable',
      description: 'Complete goals for 7 days in a row',
      icon: '⚡',
      type: 'streak',
      rarity: 'rare',
      criteria: { streakDays: 7, streakType: 'daily_completion' },
      rewards: { points: 50 },
      displayOrder: 3
    },
    {
      name: 'Legendary Streak',
      description: 'Complete goals for 30 days in a row',
      icon: '👑',
      type: 'streak',
      rarity: 'legendary',
      criteria: { streakDays: 30, streakType: 'daily_completion' },
      rewards: { points: 200 },
      displayOrder: 4
    },
    
    // Points Achievements
    {
      name: 'Point Collector',
      description: 'Earn 100 points',
      icon: '💎',
      type: 'points',
      rarity: 'common',
      criteria: { pointsRequired: 100 },
      rewards: { points: 20 },
      displayOrder: 5
    },
    {
      name: 'Point Master',
      description: 'Earn 500 points',
      icon: '💰',
      type: 'points',
      rarity: 'uncommon',
      criteria: { pointsRequired: 500 },
      rewards: { points: 50 },
      displayOrder: 6
    },
    {
      name: 'Point Legend',
      description: 'Earn 1000 points',
      icon: '🏆',
      type: 'points',
      rarity: 'epic',
      criteria: { pointsRequired: 1000 },
      rewards: { points: 100 },
      displayOrder: 7
    },
    
    // Social Achievements
    {
      name: 'Social Butterfly',
      description: 'Follow 10 users',
      icon: '🦋',
      type: 'social',
      rarity: 'common',
      criteria: { followingRequired: 10 },
      rewards: { points: 15 },
      displayOrder: 8
    },
    {
      name: 'Popular',
      description: 'Get 25 followers',
      icon: '⭐',
      type: 'social',
      rarity: 'uncommon',
      criteria: { followersRequired: 25 },
      rewards: { points: 40 },
      displayOrder: 9
    },
    {
      name: 'Influencer',
      description: 'Get 100 followers',
      icon: '🎭',
      type: 'social',
      rarity: 'rare',
      criteria: { followersRequired: 100 },
      rewards: { points: 100 },
      displayOrder: 10
    },
    
    // Category Achievements
    {
      name: 'Health Enthusiast',
      description: 'Complete 10 health & fitness goals',
      icon: '💪',
      type: 'category',
      rarity: 'uncommon',
      criteria: { categoryGoalsRequired: 10, targetCategory: 'Health & Fitness' },
      rewards: { points: 30 },
      displayOrder: 11
    },
    {
      name: 'Lifelong Learner',
      description: 'Complete 10 education & learning goals',
      icon: '📚',
      type: 'category',
      rarity: 'uncommon',
      criteria: { categoryGoalsRequired: 10, targetCategory: 'Education & Learning' },
      rewards: { points: 30 },
      displayOrder: 12
    },
    {
      name: 'Career Climber',
      description: 'Complete 10 career & business goals',
      icon: '🚀',
      type: 'category',
      rarity: 'uncommon',
      criteria: { categoryGoalsRequired: 10, targetCategory: 'Career & Business' },
      rewards: { points: 30 },
      displayOrder: 13
    },
    
    // Milestone Achievements
    {
      name: 'Goal Setter',
      description: 'Create 10 goals',
      icon: '📝',
      type: 'milestone',
      rarity: 'common',
      criteria: { totalGoalsRequired: 10 },
      rewards: { points: 20 },
      displayOrder: 14
    },
    {
      name: 'Completionist',
      description: 'Complete 50 goals',
      icon: '✅',
      type: 'completion',
      rarity: 'rare',
      criteria: { completedGoalsRequired: 50 },
      rewards: { points: 75 },
      displayOrder: 15
    },
    {
      name: 'Goal Master',
      description: 'Complete 100 goals',
      icon: '🎖️',
      type: 'completion',
      rarity: 'epic',
      criteria: { completedGoalsRequired: 100 },
      rewards: { points: 150 },
      displayOrder: 16
    },
    
    // Time-based Achievements
    {
      name: 'Veteran',
      description: 'Use WishTrail for 30 days',
      icon: '🛡️',
      type: 'time',
      rarity: 'uncommon',
      criteria: { accountAgeRequired: 30 },
      rewards: { points: 35 },
      displayOrder: 17
    },
    {
      name: 'Old Timer',
      description: 'Use WishTrail for 365 days',
      icon: '⏳',
      type: 'time',
      rarity: 'epic',
      criteria: { accountAgeRequired: 365 },
      rewards: { points: 200 },
      displayOrder: 18
    },
    // Emotional Achievements
    {
      name: 'Compassionate Soul',
      description: 'Consistently helped and showed gratitude this period',
      icon: '🕊️',
      type: 'special',
      rarity: 'uncommon',
      criteria: { specialConditions: { code: 'compassionate_soul' } },
      rewards: { points: 20 },
      displayOrder: 19
    },
    {
      name: 'Ray of Sunshine',
      description: 'Radiated positivity throughout the period',
      icon: '🌞',
      type: 'special',
      rarity: 'common',
      criteria: { specialConditions: { code: 'ray_of_sunshine' } },
      rewards: { points: 10 },
      displayOrder: 20
    }
  ];
  
  try {
    for (const achievement of defaultAchievements) {
      await this.findOneAndUpdate(
        { name: achievement.name },
        achievement,
        { upsert: true, new: true }
      );
    }
    console.log('Default achievements created successfully');
  } catch (error) {
    console.error('Error creating default achievements:', error);
  }
};

// Static method to check user achievements
achievementSchema.statics.checkUserAchievements = async function(userId) {
  const User = mongoose.model('User');
  const Goal = mongoose.model('Goal');
  const Follow = mongoose.model('Follow');
  const UserAchievement = mongoose.model('UserAchievement');
  
  try {
    const user = await User.findById(userId);
    const goals = await Goal.find({ userId, isActive: true });
    const achievements = await this.find({ isActive: true });
    
    const newAchievements = [];
    
    for (const achievement of achievements) {
      // Check if user already has this achievement
      const existingUserAchievement = await UserAchievement.findOne({
        userId,
        achievementId: achievement._id
      });
      
      if (existingUserAchievement && !achievement.isRepeatable) {
        continue;
      }
      
      let earned = false;
      
      // Check completion criteria
      if (achievement.criteria.completedGoalsRequired) {
        earned = user.completedGoals >= achievement.criteria.completedGoalsRequired;
      }
      
      // Check points criteria
      if (achievement.criteria.pointsRequired) {
        earned = user.totalPoints >= achievement.criteria.pointsRequired;
      }
      
      // Check total goals criteria
      if (achievement.criteria.totalGoalsRequired) {
        earned = user.totalGoals >= achievement.criteria.totalGoalsRequired;
      }
      
      // Check category criteria
      if (achievement.criteria.categoryGoalsRequired && achievement.criteria.targetCategory) {
        const categoryCompletedCount = goals.filter(g => 
          g.category === achievement.criteria.targetCategory && g.completed
        ).length;
        earned = categoryCompletedCount >= achievement.criteria.categoryGoalsRequired;
      }
      
      // Check social criteria
      if (achievement.criteria.followersRequired) {
        const followerCount = await Follow.getFollowerCount(userId);
        earned = followerCount >= achievement.criteria.followersRequired;
      }
      
      if (achievement.criteria.followingRequired) {
        const followingCount = await Follow.getFollowingCount(userId);
        earned = followingCount >= achievement.criteria.followingRequired;
      }
      
      // Check time criteria
      if (achievement.criteria.accountAgeRequired) {
        const accountAge = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
        earned = accountAge >= achievement.criteria.accountAgeRequired;
      }
      
      if (earned) {
        newAchievements.push(achievement);
        
        // Create user achievement record
        await UserAchievement.create({
          userId,
          achievementId: achievement._id
        });
        
        // Update achievement stats
        achievement.totalEarned += 1;
        await achievement.save();
      }
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error checking user achievements:', error);
    return [];
  }
};

// Static method to get user's achievements
achievementSchema.statics.getUserAchievements = async function(userId) {
  const UserAchievement = mongoose.model('UserAchievement');
  
  return UserAchievement.find({ userId })
    .populate('achievementId')
    .sort({ earnedAt: -1 });
};

// Static method to get achievement leaderboard
achievementSchema.statics.getAchievementLeaderboard = async function(limit = 10) {
  const UserAchievement = mongoose.model('UserAchievement');
  
  return UserAchievement.aggregate([
    {
      $group: {
        _id: '$userId',
        achievementCount: { $sum: 1 },
        latestAchievement: { $max: '$earnedAt' }
      }
    },
    {
      $sort: { achievementCount: -1, latestAchievement: -1 }
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

module.exports = mongoose.model('Achievement', achievementSchema); 