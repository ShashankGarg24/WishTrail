const User = require('../models/User');
const Block = require('../models/Block');
const authService = require('../services/authService');

// @desc    Get privacy settings
// @route   GET /api/v1/settings/privacy
// @access  Private
const getPrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isPrivate preferences.privacy').lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   POST /api/v1/settings/privacy
// @access  Private
const updatePrivacySettings = async (req, res, next) => {
  try {
    const { isPrivate, privacy } = req.body;
    
    const updateData = {};
    if (typeof isPrivate !== 'undefined') {
      updateData.isPrivate = isPrivate;
    }
    if (privacy && ['public', 'friends', 'private'].includes(privacy)) {
      updateData['preferences.privacy'] = privacy;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('isPrivate preferences.privacy');

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: {
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get theme settings
// @route   GET /api/v1/settings/theme
// @access  Private
const getThemeSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('theme').lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        theme: user.theme || 'light'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update theme settings
// @route   POST /api/v1/settings/theme
// @access  Private
const updateThemeSettings = async (req, res, next) => {
  try {
    const { theme } = req.body;
    
    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theme value. Must be light, dark, or system'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { theme } },
      { new: true, runValidators: true }
    ).select('theme');

    res.status(200).json({
      success: true,
      message: 'Theme updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blocked users
// @route   GET /api/v1/settings/blocked
// @access  Private
const getBlockedUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blockedUsers = await Block.find({
      blockerId: req.user.id,
      isActive: true
    })
      .populate('blockedId', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Block.countDocuments({
      blockerId: req.user.id,
      isActive: true
    });

    const sanitizedUsers = blockedUsers.map(block => ({
      name: block.blockedId.name,
      username: block.blockedId.username,
      avatar: block.blockedId.avatar,
    }));

    res.status(200).json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a user
// @route   POST /api/v1/settings/blocked
// @access  Private
const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }

    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({
      blockerId: req.user.id,
      blockedId: userId
    });

    if (existingBlock) {
      if (existingBlock.isActive) {
        return res.status(400).json({
          success: false,
          message: 'User is already blocked'
        });
      }
      // Reactivate the block
      existingBlock.isActive = true;
      await existingBlock.save();
    } else {
      // Create new block
      await Block.create({
        blockerId: req.user.id,
        blockedId: userId,
        isActive: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a user
// @route   DELETE /api/v1/settings/blocked/:username
// @access  Private
const unblockUser = async (req, res, next) => {
  try {
    const { username } = req.params;

    // Find the user by username
    const targetUser = await User.findOne({ username }).select('_id');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const block = await Block.findOne({
      blockerId: req.user.id,
      blockedId: targetUser._id,
      isActive: true
    });

    if (!block) {
      return res.status(404).json({
        success: false,
        message: 'Block not found'
      });
    }

    block.isActive = false;
    await block.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification settings
// @route   GET /api/v1/settings/notifications
// @access  Private
const getNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('notificationSettings preferences.notifications')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notificationSettings: user.notificationSettings || {},
        preferences: user.preferences?.notifications || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification settings
// @route   POST /api/v1/settings/notifications
// @access  Private
const updateNotificationSettings = async (req, res, next) => {
  try {
    const { notificationSettings, preferences } = req.body;
    
    const updateData = {};
    
    if (notificationSettings) {
      // Validate and update notificationSettings fields
      if (typeof notificationSettings.inAppEnabled !== 'undefined') {
        updateData['notificationSettings.inAppEnabled'] = notificationSettings.inAppEnabled;
      }
      if (notificationSettings.habits) {
        if (typeof notificationSettings.habits.enabled !== 'undefined') {
          updateData['notificationSettings.habits.enabled'] = notificationSettings.habits.enabled;
        }
        if (typeof notificationSettings.habits.skipIfDone !== 'undefined') {
          updateData['notificationSettings.habits.skipIfDone'] = notificationSettings.habits.skipIfDone;
        }
      }
      if (notificationSettings.journal) {
        if (typeof notificationSettings.journal.enabled !== 'undefined') {
          updateData['notificationSettings.journal.enabled'] = notificationSettings.journal.enabled;
        }
        if (notificationSettings.journal.frequency && ['daily', 'weekly', 'off'].includes(notificationSettings.journal.frequency)) {
          updateData['notificationSettings.journal.frequency'] = notificationSettings.journal.frequency;
        }
      }
      if (notificationSettings.motivation) {
        if (typeof notificationSettings.motivation.enabled !== 'undefined') {
          updateData['notificationSettings.motivation.enabled'] = notificationSettings.motivation.enabled;
        }
        if (notificationSettings.motivation.frequency && ['off', 'daily', 'weekly'].includes(notificationSettings.motivation.frequency)) {
          updateData['notificationSettings.motivation.frequency'] = notificationSettings.motivation.frequency;
        }
      }
      if (notificationSettings.social) {
        if (typeof notificationSettings.social.enabled !== 'undefined') {
          updateData['notificationSettings.social.enabled'] = notificationSettings.social.enabled;
        }
      }
    }

    if (preferences) {
      if (typeof preferences.email !== 'undefined') {
        updateData['preferences.notifications.email'] = preferences.email;
      }
      if (typeof preferences.achievements !== 'undefined') {
        updateData['preferences.notifications.achievements'] = preferences.achievements;
      }
      if (typeof preferences.reminders !== 'undefined') {
        updateData['preferences.notifications.reminders'] = preferences.reminders;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('notificationSettings preferences.notifications');

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        notificationSettings: user.notificationSettings,
        preferences: user.preferences?.notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   POST /api/v1/settings/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Validate password contains both letters and numbers
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain both letters and numbers'
      });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a password (might not if signed up with social auth)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update password. Please use social login or reset password'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrivacySettings,
  updatePrivacySettings,
  getThemeSettings,
  updateThemeSettings,
  getBlockedUsers,
  blockUser,
  unblockUser,
  getNotificationSettings,
  updateNotificationSettings,
  updatePassword
};
