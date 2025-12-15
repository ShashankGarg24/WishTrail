const User = require('../models/User');
const Follow = require('../models/Follow');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Block = require('../models/Block');
const activityService = require('../services/activityService');
const { sanitizeFollow } = require('../utility/sanitizer');

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
    
    // Prevent follow if blocked either way
    if (await Block.isBlockedBetween(followerId, userId)) {
      return res.status(403).json({ success: false, message: 'Cannot follow due to block' });
    }

    // If target user is private, create follow request and notification
    if (userToFollow.isPrivate) {
      await Follow.requestFollow(followerId, userId);
      await Notification.createFollowRequestNotification(followerId, userId);
      return res.status(200).json({ success: true, message: 'Follow request sent', data: { requested: true } });
    }

    // Follow the user directly for public profile
    await Follow.followUser(followerId, userId);
    await Notification.createFollowNotification(followerId, userId);
    
    // Check if activity already exists
    const existingActivity = await Activity.findOne({
      userId: followerId,
      type: 'user_followed',
      'data.targetUserId': userId
    });

    const currentUser = (await User.findById(followerId).select('name avatar'));
    userToFollow.increaseFollowerCount();
    currentUser.increaseFollowingCount();

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
    
    res.status(200).json({ success: true, message: 'User followed successfully', data: { requested: false } });
  } catch (error) {
    next(error);
  }
};
// @desc    Cancel follow request for a private user
// @route   DELETE /api/v1/social/follow/requests/:userId
// @access  Private
const cancelFollowRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    // Set any pending request to rejected/inactive
    const FollowModel = require('../models/Follow');
    const pending = await FollowModel.findOne({ followerId, followingId: userId, status: 'pending', isActive: false });
    if (!pending) {
      return res.status(404).json({ success: false, message: 'No pending request' });
    }
    pending.status = 'rejected';
    pending.isActive = false;
    await pending.save();
    await Notification.deleteFollowRequestNotification(followerId, userId);
    return res.status(200).json({ success: true, message: 'Follow request canceled' });
  } catch (err) {
    next(err);
  }
};

// @desc    List pending follow requests for current user
// @route   GET /api/v1/social/follow/requests
// @access  Private
const getFollowRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const Follow = require('../models/Follow');
    const requests = await Follow.find({ followingId: req.user.id, status: 'pending', isActive: false })
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate('followerId', 'name avatar username');
    const total = await Follow.countDocuments({ followingId: req.user.id, status: 'pending', isActive: false });
    res.status(200).json({ success: true, data: { requests, pagination: { page: parsedPage, limit: parsedLimit, total, pages: Math.ceil(total / parsedLimit) } } });
  } catch (err) {
    next(err);
  }
};

// @desc    Accept a follow request
// @route   POST /api/v1/social/follow/requests/:followerId/accept
// @access  Private
const acceptFollowRequest = async (req, res, next) => {
  try {
    const { followerId } = req.params;
    const followingId = req.user.id;
    const updated = await Follow.acceptFollowRequest(followerId, followingId);
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const [currentUser, follower] = await Promise.all([
      User.findById(followingId),
      User.findById(followerId)
    ]);
    await Promise.all([
      currentUser.increaseFollowerCount(),
      follower.increaseFollowingCount(),
      Notification.createFollowAcceptedNotification(followingId, followerId),
      Notification.convertFollowRequestToNewFollower(followerId, followingId)
    ]);
    return res.status(200).json({ success: true, message: 'Follow request accepted', data: { follow: updated } });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject a follow request
// @route   POST /api/v1/social/follow/requests/:followerId/reject
// @access  Private
const rejectFollowRequest = async (req, res, next) => {
  try {
    const { followerId } = req.params;
    const followingId = req.user.id;
    await Follow.rejectFollowRequest(followerId, followingId);
    await Notification.deleteFollowRequestNotification(followerId, followingId);
    return res.status(200).json({ success: true, message: 'Follow request rejected' });
  } catch (err) {
    next(err);
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
    
    const currentUser = await User.findById(followerId);
    userToUnfollow.decreaseFollowerCount();
    currentUser.decreaseFollowingCount();

    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's followers
// @route   GET /api/v1/social/followers?username=johndoe
// @access  Private
const getFollowers = async (req, res, next) => {
  try {
    const { username, page = 1, limit = 20 } = req.query;
    
    // Resolve username to userId if provided
    let targetUserId = req.user.id;
    if (username) {
      const userService = require('../services/userService');
      const { user } = await userService.getUserByIdOrUsername(username, req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetUserId = user._id.toString();
    }
    
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
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const followers = await Follow.getFollowers(targetUserId, { limit: parseInt(limit), skip });
    
    // ✅ Extract minimal user info - only name, username, avatar
    const sanitizedFollowers = followers.map(f => {
      if (!f.followerId) return null;
      const user = f.followerId.toObject ? f.followerId.toObject() : f.followerId;
      return {
        name: user.name,
        username: user.username,
        avatar: user.avatar
      };
    }).filter(Boolean);
    
    res.status(200).json({
      success: true,
      data: { followers: sanitizedFollowers }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users that user is following
// @route   GET /api/v1/social/following?username=johndoe
// @access  Private
const getFollowing = async (req, res, next) => {
  try {
    const { username, page = 1, limit = 20 } = req.query;
    
    // Resolve username to userId if provided
    let targetUserId = req.user.id;
    if (username) {
      const userService = require('../services/userService');
      const { user } = await userService.getUserByIdOrUsername(username, req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetUserId = user._id.toString();
    }
    
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
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const following = await Follow.getFollowing(targetUserId, { limit: parseInt(limit), skip });
    
    // ✅ Extract minimal user info - only name, username, avatar
    const sanitizedFollowing = following.map(f => {
      if (!f.followingId) return null;
      const user = f.followingId.toObject ? f.followingId.toObject() : f.followingId;
      return {
        name: user.name,
        username: user.username,
        avatar: user.avatar
      };
    }).filter(Boolean);
    
    res.status(200).json({
      success: true,
      data: { following: sanitizedFollowing }
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

    // Service already normalizes to { user, ... }. Return as-is.
    res.status(200).json({ success: true, data: activities });
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
  getPopularUsers,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest
};