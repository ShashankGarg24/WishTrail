const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const OTP = require('../models/Otp');
const emailService = require('./emailService');
const BloomFilterService = require('../utility/BloomFilterService');
const { ALLOWED_MOOD_EMOJIS } = require('../config/constants');

class AuthService {

  /**
   * Create user
   */
  async register(profileData, deviceType) {
    const { email, name, password, username, dateOfBirth, interests, location, gender } = profileData || {};
    // Check if OTP was verified (you might want to implement a temporary verification token)
    const recentVerifiedOTP = await OTP.findOne({
      email,
      purpose: 'signup',
      isVerified: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Within last 30 minutes
    });

    if (!recentVerifiedOTP) {
      throw new Error('OTP verification required. Please verify your email first.');
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ 
      $or: [
        { email },
        ...(username ? [{ username }] : [])
      ]
    });
    
    if (existingUser) {
      throw new Error('User already exists with this email or username');
    }

    // Create user with all profile data
    const userData = {
      name,
      email,
      password,
      isActive: true,
      isVerified: true, // Since they verified via OTP
      profileCompleted: true,
      gender
    };

    // Add optional fields
    if (username) userData.username = username;
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (interests && interests.length > 0) userData.interests = interests;
    if (location) userData.location = location;

    // Initialize dashboard years with current year
    try {
      const currentYear = new Date().getFullYear();
      userData.dashboardYears = [currentYear];
    } catch (_) {}

    const user = await User.create(userData);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user._id);
    
    // Save refresh token (default to web if deviceType is unknown)
    const kind = deviceType === 'app' ? 'app' : 'web';
    user.refreshTokens[kind] = refreshToken;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error - registration was successful
    }

    // Clean up verified OTP
    await OTP.deleteMany({ email, purpose: 'signup', isVerified: true });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    
    //populate bloom filter
    await BloomFilterService.add(username);
    await BloomFilterService.add(email);
    BloomFilterService.rebuildIdExpectedUsersIncrease(User);

    return {
      user: userResponse,
      token: accessToken,
      refreshToken
    };
  }

  /**
   * Login user
   */
  async login(email, password, deviceType) {
    // Find user and include password for comparison
    const user = await User.findOne({ email, isActive: true }).select('+password');
    
    if (!user) {
      throw new Error('No user is registered with the given email.');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user._id);
    
    // Save refresh token
    deviceType === 'app' ? user.refreshTokens.app = refreshToken : user.refreshTokens.web = refreshToken;
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens.app;
    delete userResponse.refreshTokens.web;
    
    return {
      user: userResponse,
      token: accessToken,
      refreshToken
    };
  }
  
  /**
   * Logout user
   */
  async logout(userId, deviceType) {
    if (!['app', 'web'].includes(deviceType)) {
      throw new Error('Invalid device type');
    }
  
    // Clear the specific token
    await User.findByIdAndUpdate(
      userId,
      {
        $set: { [`refreshTokens.${deviceType}`]: null }
      },
      { new: true }
    );
  
    return { message: `${deviceType} logged out successfully` };
  }
  
  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const allowedUpdates = ['name', 'bio', 'location', 'dateOfBirth', 'avatar', 'interests', 'currentMood', 'website', 'youtube', 'instagram'];
    const updates = {};
    
    // Validate mood emoji if provided
    if (updateData.currentMood !== undefined && updateData.currentMood !== '') {
      if (!ALLOWED_MOOD_EMOJIS.includes(updateData.currentMood)) {
        throw new Error('Invalid mood emoji. Please select from the allowed list.');
      }
    }
    
    // Validate YouTube URL if provided
    if (updateData.youtube && updateData.youtube.trim() !== '') {
      const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?|youtu\.be\/).+/i;
      if (!youtubePattern.test(updateData.youtube)) {
        throw new Error('Invalid YouTube URL format');
      }
    }
    
    // Validate Instagram URL if provided
    if (updateData.instagram && updateData.instagram.trim() !== '') {
      const instagramPattern = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/i;
      if (!instagramPattern.test(updateData.instagram)) {
        throw new Error('Invalid Instagram URL format');
      }
    }
    
    // Filter allowed updates
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      throw new Error('No valid updates provided');
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
  
  /**
   * Update password
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password +refreshTokens.app +refreshTokens.web');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    if (currentPassword == newPassword) {
      throw new Error('New password cannot be same as the current password');
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    // Invalidate all existing refresh tokens for security
    user.refreshTokens.app = null;
    user.refreshTokens.web = null;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user.name);
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
    }

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }
  
  /**
   * Generate access and refresh tokens
   */
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '24h' }
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, deviceType) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      const user = await User.findById(decoded.userId).select('+refreshTokens.app +refreshTokens.web');
      if (!user || !user.isActive || user.refreshTokens[deviceType] !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      const tokens = this.generateTokens(user._id);
      
      // Rotate and persist the newly generated refresh token
      if (deviceType === 'app') {
        user.refreshTokens.app = tokens.refreshToken;
      } else {
        user.refreshTokens.web = tokens.refreshToken;
      }
      await user.save();
      
      return tokens;
    } catch (error) {
      console.error('Invalid refresh token:', error.message);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Check if email or username already exists
   */
  async checkExistingUser({ email, username }) {
    const checks = [];

    const existsInBloom = BloomFilterService.mightExist;
    
    if (email && existsInBloom(email)) {
      const emailExists = await User.findOne({ email });
      checks.push({
        field: 'email',
        value: email,
        exists: !!emailExists
      });
    }
    
    if (username && existsInBloom(username)) {
      const usernameExists = await User.findOne({ username });
      checks.push({
        field: 'username',
        value: username,
        exists: !!usernameExists
      });
    }
    
    const hasConflicts = checks.some(check => check.exists);
    
    return {
      available: !hasConflicts,
      checks
    };
  }

  /**
   * Request OTP for signup
   */
     async requestOTP({ email, name, password, gender }) {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Check if we can send OTP (rate limiting)
    const canRequest = await OTP.canRequestNewOTP(email, 'signup');
    if (!canRequest.canRequest) {
      if (canRequest.reason === 'blocked') {
        throw new Error(`Too many attempts. Please wait ${Math.ceil(canRequest.waitTime / 60)} minutes before requesting again.`);
      } else {
        throw new Error(`Please wait ${canRequest.waitTime} seconds before requesting another OTP.`);
      }
    }

    // Generate and save OTP
    const otpRecord = await OTP.createOTP(email, 'signup', 10); // 10 minutes expiry

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otpRecord.code, 'signup');
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      // Don't throw error - we still want to return success even if email fails
    }

    // Store user data temporarily (in production, use Redis or session)
    // For now, we'll just return success without storing temp data
    return {
      message: 'OTP sent successfully',
      email,
      expiresAt: otpRecord.expiresAt
    };
  }

  /**
   * Verify OTP and create temporary user record
   */
  async verifyOTP({ email, otp }) {
    try {
      // Verify the OTP
      await OTP.verifyOTP(email, otp, 'signup');
      
      return {
        message: 'OTP verified successfully',
        email,
        verified: true
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP({ email }) {
    // Check if we can send OTP (rate limiting)
    const canRequest = await OTP.canRequestNewOTP(email, 'signup');
    if (!canRequest.canRequest) {
      if (canRequest.reason === 'blocked') {
        throw new Error(`Too many attempts. Please wait ${Math.ceil(canRequest.waitTime / 60)} minutes before requesting again.`);
      } else {
        throw new Error(`Please wait ${canRequest.waitTime} seconds before requesting another OTP.`);
      }
    }

    // Generate and save new OTP
    const otpRecord = await OTP.createOTP(email, 'signup', 10); // 10 minutes expiry

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otpRecord.code, 'signup');
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email. Please try again.');
    }

    return {
      message: 'OTP resent successfully',
      email,
      expiresAt: otpRecord.expiresAt,
      nextResendTime: Date.now() + (canRequest.waitTime || 30) * 1000
    };
  }


  /**
   * Request password reset
   */
  async forgotPassword(email) {
    // Check if user exists
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account with this email exists, you will receive a password reset link.',
        email
      };
    }

    // Check rate limiting
    const canRequest = await PasswordReset.canRequestReset(email);
    if (!canRequest.canRequest) {
      throw new Error(`Too many password reset requests. Please wait ${canRequest.waitTime} minutes before requesting again.`);
    }

    // Generate reset token
    const resetData = await PasswordReset.createResetToken(email, 15); // 15 mins expiry

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetData.token, user.name);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error - we still want to return success even if email fails
    }

    return {
      message: 'If an account with this email exists, you will receive a password reset link.',
      email,
      expiresAt: resetData.expiresAt
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword) {
    // Verify the reset token
    const passwordReset = await PasswordReset.verifyResetToken(token);
    
    // Get the user
    const user = await User.findOne({ email: passwordReset.email, isActive: true }).select('+refreshTokens.app +refreshTokens.web');
    if (!user) {
      throw new Error('User not found');
    }

    // Update user password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    
    // Invalidate all existing refresh tokens for security
    user.refreshTokens.app = null;
    user.refreshTokens.web = null;
    
    await user.save();

    // Mark token as used
    await PasswordReset.markTokenAsUsed(token);

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user.name);
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
      // Don't throw error - password was successfully changed
    }

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
      email: user.email
    };
  }
}

module.exports = new AuthService(); 