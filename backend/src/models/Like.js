const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  // User who liked
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // What was liked
  targetType: {
    type: String,
    required: [true, 'Target type is required'],
    enum: ['goal', 'activity', 'user'], // Extensible for future content types
    index: true
  },
  
  // ID of the liked item
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required'],
    index: true
  },
  
  // Like status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Optional reaction type (for future emoji reactions)
  reactionType: {
    type: String,
    enum: ['like', 'love', 'celebrate', 'support', 'inspire'],
    default: 'like'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate likes
likeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

// Additional indexes for performance
likeSchema.index({ targetType: 1, targetId: 1, isActive: 1 });
likeSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
likeSchema.index({ createdAt: -1 });

// Static method to like an item
likeSchema.statics.likeItem = async function(userId, targetType, targetId) {
  try {
    // Check if already liked
    const existingLike = await this.findOne({
      userId,
      targetType,
      targetId
    });
    
    if (existingLike) {
      if (existingLike.isActive) {
        throw new Error('Item already liked');
      } else {
        // Re-activate the like
        existingLike.isActive = true;
        return await existingLike.save();
      }
    }
    
    // Create new like
    const like = new this({
      userId,
      targetType,
      targetId
    });
    
    const savedLike = await like.save();
    
    // Update like count in the target model
    await this.updateTargetLikeCount(targetType, targetId);
    
    return savedLike;
  } catch (error) {
    throw error;
  }
};

// Static method to unlike an item
likeSchema.statics.unlikeItem = async function(userId, targetType, targetId) {
  try {
    const like = await this.findOne({
      userId,
      targetType,
      targetId,
      isActive: true
    });
    
    if (!like) {
      throw new Error('Like not found');
    }
    
    // Soft delete - mark as inactive
    like.isActive = false;
    const savedLike = await like.save();
    
    // Update like count in the target model
    await this.updateTargetLikeCount(targetType, targetId);
    
    return savedLike;
  } catch (error) {
    throw error;
  }
};

// Static method to toggle like
likeSchema.statics.toggleLike = async function(userId, targetType, targetId) {
  try {
    const existingLike = await this.findOne({
      userId,
      targetType,
      targetId
    });
    
    if (existingLike && existingLike.isActive) {
      // Unlike
      return await this.unlikeItem(userId, targetType, targetId);
    } else {
      // Like
      return await this.likeItem(userId, targetType, targetId);
    }
  } catch (error) {
    throw error;
  }
};

// Static method to check if user liked an item
likeSchema.statics.hasUserLiked = async function(userId, targetType, targetId) {
  const like = await this.findOne({
    userId,
    targetType,
    targetId,
    isActive: true
  });
  
  return !!like;
};

// Static method to get like count for an item
likeSchema.statics.getLikeCount = function(targetType, targetId) {
  return this.countDocuments({
    targetType,
    targetId,
    isActive: true
  });
};

// Static method to get likes for an item
likeSchema.statics.getLikes = function(targetType, targetId, limit = 20) {
  return this.find({
    targetType,
    targetId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('userId', 'name avatar level');
};

// Static method to get user's liked items
likeSchema.statics.getUserLikedItems = function(userId, targetType = null, limit = 50) {
  const query = {
    userId,
    isActive: true
  };
  
  if (targetType) {
    query.targetType = targetType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get popular items (most liked)
likeSchema.statics.getPopularItems = function(targetType, timeFrame = 'week', limit = 10) {
  const timeFrames = {
    'day': 1,
    'week': 7,
    'month': 30,
    'year': 365
  };
  
  const daysBack = timeFrames[timeFrame] || 7;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysBack);
  
  return this.aggregate([
    {
      $match: {
        targetType,
        isActive: true,
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: '$targetId',
        likeCount: { $sum: 1 },
        latestLike: { $max: '$createdAt' }
      }
    },
    {
      $sort: { likeCount: -1, latestLike: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to update like count in target model
likeSchema.statics.updateTargetLikeCount = async function(targetType, targetId) {
  try {
    const likeCount = await this.getLikeCount(targetType, targetId);
    
    // Update the target model's like count
    if (targetType === 'goal') {
      const Goal = mongoose.model('Goal');
      await Goal.findByIdAndUpdate(targetId, { likeCount });
    }
    // Add more target types as needed
    
  } catch (error) {
    console.error('Error updating target like count:', error);
  }
};

// Static method to get trending items (likes + recency)
likeSchema.statics.getTrendingItems = function(targetType, limit = 10) {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  return this.aggregate([
    {
      $match: {
        targetType,
        isActive: true,
        createdAt: { $gte: oneDayAgo }
      }
    },
    {
      $group: {
        _id: '$targetId',
        likeCount: { $sum: 1 },
        avgLikeTime: { $avg: '$createdAt' }
      }
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ['$likeCount', 100] }, // Weight likes heavily
            { $divide: ['$avgLikeTime', 1000000] } // Add recency factor
          ]
        }
      }
    },
    {
      $sort: { trendingScore: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get user's like activity
likeSchema.statics.getUserLikeActivity = function(userId, limit = 20) {
  return this.find({
    userId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('targetId'); // This will need refinement based on targetType
};

module.exports = mongoose.model('Like', likeSchema); 