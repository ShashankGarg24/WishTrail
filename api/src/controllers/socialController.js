const User = require('../models/User');
const Follow = require('../models/Follow');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const activityService = require('../services/activityService');

// @desc    Follow a user
// @route   POST /api/v1/social/follow/:userId
// @access  Private
const followUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Check if user exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow || !userToFollow.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Can't follow yourself
    if (userId === followerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }
    
    // Check if already following
    const existingFollow = await Follow.isFollowing(followerId, userId);
    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }
    
    // Follow the user
    await Follow.followUser(followerId, userId);
    userToFollow.increaseFollowingCount();
    
    // Create notification for the followed user
    // await Notification.createNotification({
    //   userId: userId,
    //   type: 'new_follower',
    //   data: {
    //     followerId: followerId,
    //     followerName: req.user.name
    //   }
    // });
    
    // Check if activity already exists
    const existingActivity = await Activity.findOne({
      userId: followerId,
      type: 'user_followed',
      'data.targetUserId': userId
    });

    const currentUser = (await User.findById(followerId).select('name avatar').lean());
    currentUser.increaseFollowerCount();

    if (!existingActivity) {
      await Activity.createActivity(
        followerId,
        currentUser.name,
        currentUser.avatar,
        'user_followed',
        {
          targetUserId: userId,
          targetUserName: userToFollow.name
        }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/v1/social/follow/:userId
// @access  Private
const unfollowUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Check if user exists
    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow || !userToUnfollow.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if following
    const existingFollow = await Follow.isFollowing(followerId, userId);
    if (!existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Not following this user'
      });
    }
    
    // Unfollow the user
    await Follow.unfollowUser(followerId, userId);
    
    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's followers
// @route   GET /api/v1/social/followers
// @access  Private
const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;
    
    // If checking another user's followers, ensure they can view
    if (targetUserId !== req.user.id) {
      const canView = await Follow.isFollowing(req.user.id, targetUserId);
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const followers = await Follow.getFollowers(targetUserId);
    
    res.status(200).json({
      success: true,
      data: { followers }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users that user is following
// @route   GET /api/v1/social/following
// @access  Private
const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;
    
    // If checking another user's following, ensure they can view
    if (targetUserId !== req.user.id) {
      const canView = await Follow.isFollowing(req.user.id, targetUserId);
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const following = await Follow.getFollowing(targetUserId);
    
    res.status(200).json({
      success: true,
      data: { following }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mutual followers
// @route   GET /api/v1/social/mutual/:userId
// @access  Private
const getMutualFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const mutualFollowers = await Follow.getMutualFollowers(req.user.id, userId);
    
    res.status(200).json({
      success: true,
      data: { mutualFollowers }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggested users to follow
// @route   GET /api/v1/social/suggestions
// @access  Private
const getSuggestedUsers = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    const suggestions = await Follow.getSuggestedUsers(req.user.id, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get follow stats
// @route   GET /api/v1/social/stats
// @access  Private
const getFollowStats = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;
    
    // Get follower and following counts
    const followers = await Follow.getFollowers(targetUserId);
    const following = await Follow.getFollowing(targetUserId);
    
    // If viewing another user's stats, check if following them
    let isFollowing = false;
    if (targetUserId !== req.user.id) {
      isFollowing = await Follow.isFollowing(req.user.id, targetUserId);
    }
    
    const stats = {
      followerCount: followers.length,
      followingCount: following.length,
      isFollowing: targetUserId !== req.user.id ? isFollowing : null
    };
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity feed (from followed users)
// @route   GET /api/v1/social/feed
// @access  Private
const getActivityFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const activities = await activityService.getActivityFeed(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user is following another user
// @route   GET /api/v1/social/following/check/:userId
// @access  Private
const checkFollowingStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isFollowing = await Follow.isFollowing(req.user.id, userId);
    
    res.status(200).json({
      success: true,
      data: { isFollowing }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular users (for discovery)
// @route   GET /api/v1/social/popular
// @access  Private
const getPopularUsers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get users with most followers
    const popularUsers = await User.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'follows',
          localField: '_id',
          foreignField: 'followingId',
          as: 'followers'
        }
      },
      {
        $addFields: {
          followerCount: { $size: '$followers' }
        }
      },
      {
        $sort: { followerCount: -1, totalPoints: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          bio: 1,
          location: 1,
          totalPoints: 1,
          level: 1,
          currentStreak: 1,
          followerCount: 1
        }
      }
    ]);
    
    // Add following status for each user
    const usersWithFollowStatus = await Promise.all(
      popularUsers.map(async (user) => {
        const isFollowing = await Follow.isFollowing(req.user.id, user._id);
        return {
          ...user,
          isFollowing
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: { users: usersWithFollowStatus }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getMutualFollowers,
  getSuggestedUsers,
  getFollowStats,
  getActivityFeed,
  checkFollowingStatus,
  getPopularUsers
}; 