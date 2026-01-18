const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const activityService = require('../services/activityService');

// PostgreSQL Services
const pgFollowService = require('../services/pgFollowService');
const pgBlockService = require('../services/pgBlockService');
const pgUserService = require('../services/pgUserService');

// @desc    Follow a user
// @route   POST /api/v1/social/follow/:userId
// @access  Private
const followUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Check if user exists
    const userToFollow = await pgUserService.findById(parseInt(userId));
    if (!userToFollow || !userToFollow.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Can't follow yourself
    if (parseInt(userId) === followerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }
    
    // Check if already following
    const existingFollow = await pgFollowService.isFollowing(followerId, parseInt(userId));
    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }
    
    // Prevent follow if blocked either way
    if (await pgBlockService.isBlockedBetween(followerId, parseInt(userId))) {
      return res.status(403).json({ success: false, message: 'Cannot follow due to block' });
    }

    // If target user is private, create follow request and notification
    if (userToFollow.is_private) {
      await pgFollowService.requestFollow(followerId, parseInt(userId));
      await Notification.createFollowRequestNotification(followerId, parseInt(userId));
      return res.status(200).json({ success: true, message: 'Follow request sent', data: { requested: true } });
    }

    // Follow the user directly for public profile
    await pgFollowService.followUser(followerId, parseInt(userId));
    const notif = await Notification.createFollowNotification(followerId, parseInt(userId));
    console.log('[Follow] Notification created:', notif ? 'Yes' : 'No', 'for follower:', followerId, 'following:', userId);
    
    // Check if activity already exists
    const existingActivity = await Activity.findOne({
      userId: followerId,
      type: 'user_followed',
      'data.targetUserId': parseInt(userId)
    });

    const currentUser = await pgUserService.findById(followerId);
    // Follower counts are updated automatically by database triggers

    if (!existingActivity) {
      await Activity.createActivity(
        followerId,
        currentUser.name,
        currentUser.username,
        currentUser.avatar_url,
        'user_followed',
        {
          targetUserId: parseInt(userId)
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
    // Reject the pending request
    const success = await pgFollowService.rejectFollowRequest(followerId, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'No pending request' });
    }
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

    const offset = (parsedPage - 1) * parsedLimit;
    const requests = await pgFollowService.getPendingRequests(req.user.id, { limit: parsedLimit, offset });
    const total = await pgFollowService.countPendingRequests(req.user.id);
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
    const updated = await pgFollowService.acceptFollowRequest(followerId, followingId);
    // Follower counts are updated automatically by database triggers
    await Promise.all([
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
    await pgFollowService.rejectFollowRequest(followerId, followingId);
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
    const userToUnfollow = await pgUserService.findById(parseInt(userId));
    if (!userToUnfollow || !userToUnfollow.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if following
    const existingFollow = await pgFollowService.isFollowing(followerId, parseInt(userId));
    if (!existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Not following this user'
      });
    }
    
    // Unfollow the user
    await pgFollowService.unfollowUser(followerId, parseInt(userId));
    
    // Follower counts are updated automatically by database triggers

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
      const { user } = await userService.getUserByUsername(username, req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetUserId = user.id.toString();
    }
    
    // If checking another user's followers, ensure they can view
    if (targetUserId !== req.user.id) {
      const canView = await pgFollowService.isFollowing(req.user.id, targetUserId);
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const followers = await pgFollowService.getFollowers({ userId: targetUserId, limit: parseInt(limit), offset });
    
    // ✅ Extract minimal user info - only name, username, avatar
    const sanitizedFollowers = followers.map(f => {
      if (!f.user) return null;
      return {
        name: f.user.name,
        username: f.user.username,
        avatar: f.user.avatarUrl
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
      const { user } = await userService.getUserByUsername(username, req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetUserId = user.id.toString();
    }
    
    // If checking another user's following, ensure they can view
    if (targetUserId !== req.user.id) {
      const canView = await pgFollowService.isFollowing(req.user.id, targetUserId);
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const following = await pgFollowService.getFollowing({ userId: targetUserId, limit: parseInt(limit), offset });
    
    // ✅ Extract minimal user info - only name, username, avatar
    const sanitizedFollowing = following.map(f => {
      if (!f.user) return null;
      return {
        name: f.user.name,
        username: f.user.username,
        avatar: f.user.avatarUrl
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
    const user = await pgUserService.findById(parseInt(userId));
    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const mutualFollowers = await pgFollowService.getMutualFollowers(req.user.id, userId);
    
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
    
    const suggestions = await pgFollowService.getFollowSuggestions(req.user.id, { limit: parseInt(limit) });
    
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
    const [followerCount, followingCount] = await Promise.all([
      pgFollowService.getFollowersCount(targetUserId),
      pgFollowService.getFollowingCount(targetUserId)
    ]);
    
    // If viewing another user's stats, check if following them
    let isFollowing = false;
    if (targetUserId !== req.user.id) {
      isFollowing = await pgFollowService.isFollowing(req.user.id, targetUserId);
    }
    
    const stats = {
      followerCount,
      followingCount,
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
    const user = await pgUserService.findById(parseInt(userId));
    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isFollowing = await pgFollowService.isFollowing(req.user.id, userId);
    
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
    
    // Get users with most followers from PostgreSQL
    const popularUsers = await pgUserService.getPopularUsers({ limit: parseInt(limit) });
    
    // Add following status for each user
    const userIds = popularUsers.map(u => u.id.toString());
    const followStatus = await pgFollowService.bulkCheckFollowStatus(req.user.id, userIds);
    const usersWithFollowStatus = popularUsers.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar_url,
      bio: user.bio,
      location: user.location,
      completedGoals: user.completed_goals,
      currentStreak: user.current_streak,
      followerCount: user.follower_count,
      isFollowing: followStatus[user.id.toString()] || false
    }));
    
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