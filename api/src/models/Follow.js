const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  // User who is following
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Follower ID is required'],
    index: true
  },
  
  // User being followed
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Following ID is required'],
    index: true
  },
  
  // Relationship status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Notification preferences
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  
  // When the follow relationship started
  followedAt: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate follows
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Additional indexes for performance
followSchema.index({ followingId: 1, isActive: 1, createdAt: -1 });
followSchema.index({ followerId: 1, isActive: 1, createdAt: -1 });

// Validation to prevent self-following
followSchema.pre('save', function(next) {
  if (this.followerId.equals(this.followingId)) {
    const error = new Error('Users cannot follow themselves');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Static method to follow a user
followSchema.statics.followUser = async function(followerId, followingId) {
  try {
    // Check if already following
    const existingFollow = await this.findOne({
      followerId,
      followingId
    });
    
    if (existingFollow) {
      if (existingFollow.isActive) {
        throw new Error('Already following this user');
      } else {
        // Re-activate the follow relationship
        existingFollow.isActive = true;
        existingFollow.followedAt = new Date();
        return await existingFollow.save();
      }
    }
    
    // Create new follow relationship
    const follow = new this({
      followerId,
      followingId
    });
    
    return await follow.save();
  } catch (error) {
    throw error;
  }
};

// Static method to unfollow a user
followSchema.statics.unfollowUser = async function(followerId, followingId) {
  try {
    const follow = await this.findOne({
      followerId,
      followingId,
      isActive: true
    });
    
    if (!follow) {
      throw new Error('Follow relationship not found');
    }
    
    // Soft delete - mark as inactive
    follow.isActive = false;
    return await follow.save();
  } catch (error) {
    throw error;
  }
};

// Static method to check if user is following another user
followSchema.statics.isFollowing = async function(followerId, followingId) {
  const follow = await this.findOne({
    followerId,
    followingId,
    isActive: true
  });
  
  return !!follow;
};

// Static method to get user's followers
followSchema.statics.getFollowers = function(userId, limit = 50) {
  return this.find({
    followingId: userId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('followerId', 'name avatar bio location level totalPoints completedGoals');
};

// Static method to get users that a user is following
followSchema.statics.getFollowing = function(userId, limit = 50) {
  return this.find({
    followerId: userId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('followingId', 'name avatar bio location level totalPoints completedGoals');
};

// Static method to get follower count
followSchema.statics.getFollowerCount = function(userId) {
  return this.countDocuments({
    followingId: userId,
    isActive: true
  });
};

// Static method to get following count
followSchema.statics.getFollowingCount = function(userId) {
  return this.countDocuments({
    followerId: userId,
    isActive: true
  });
};

// Static method to get mutual followers
followSchema.statics.getMutualFollowers = async function(userId1, userId2) {
  const user1Followers = await this.find({
    followingId: userId1,
    isActive: true
  }).select('followerId');
  
  const user2Followers = await this.find({
    followingId: userId2,
    isActive: true
  }).select('followerId');
  
  const user1FollowerIds = user1Followers.map(f => f.followerId.toString());
  const user2FollowerIds = user2Followers.map(f => f.followerId.toString());
  
  const mutualFollowerIds = user1FollowerIds.filter(id => 
    user2FollowerIds.includes(id)
  );
  
  return mutualFollowerIds.length;
};

// Static method to get following IDs (for activity feed)
followSchema.statics.getFollowingIds = async function(userId) {
  const following = await this.find({
    followerId: userId,
    isActive: true
  }).select('followingId');
  
  return following.map(f => f.followingId);
};

// Static method to get suggested users to follow
followSchema.statics.getSuggestedUsers = async function(userId, limit = 10) {
  // Get users that the current user's following are following
  // but exclude users already followed by current user
  const User = mongoose.model('User');
  
  const followingIds = await this.getFollowingIds(userId);
  const alreadyFollowingIds = [...followingIds, userId]; // Include self
  
  // Get users with high activity/points who aren't already followed
  const suggestions = await User.find({
    _id: { $nin: alreadyFollowingIds },
    isActive: true,
    completedGoals: { $gte: 1 } // Users with at least 1 completed goal
  })
  .sort({ totalPoints: -1, completedGoals: -1 })
  .limit(limit)
  .select('name avatar bio location level totalPoints completedGoals');
  
  return suggestions;
};

module.exports = mongoose.model('Follow', followSchema); 