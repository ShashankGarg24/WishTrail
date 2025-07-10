const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Activity = require('../models/Activity');
const OTP = require('../models/Otp');
const emailService = require('./emailService');
const BloomFilterService = require('../utility/BloomFilterService');

class AuthService {

  /**
   * Create user
   */
  async register({ email, name, password, username, dateOfBirth, interests, location }) {
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
      profileCompleted: true
    };

    // Add optional fields
    if (username) userData.username = username;
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (interests && interests.length > 0) userData.interests = interests;
    if (location) userData.location = location;

    const user = await User.create(userData);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
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
  async login(email, password) {
    // Find user and include password for comparison
    const user = await User.findOne({ email, isActive: true }).select('+password');
    
    if (!user) {
      throw new Error('Invalid credentials');
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
    user.refreshToken = refreshToken;
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    
    return {
      user: userResponse,
      token: accessToken,
      refreshToken
    };
  }
  
  /**
   * Logout user
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 }
    });
    
    return { message: 'Logged out successfully' };
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
    const allowedUpdates = ['name', 'bio', 'location', 'dateOfBirth', 'avatar'];
    const updates = {};
    
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
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    return { message: 'Password changed successfully' };
  }
  
  /**
   * Generate access and refresh tokens
   */
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      const tokens = this.generateTokens(user._id);
      
      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();
      
      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email) {
    const user = await User.findOne({ email, isActive: true });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    
    return resetToken;
  }
  
  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    });
    
    if (!user) {
      throw new Error('Token is invalid or has expired');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    return { message: 'Password reset successful' };
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
  async requestOTP({ email, name, password }) {
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
}

module.exports = new AuthService(); 