const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const UserPreferences = require('../models/extended/UserPreferences');
const PasswordReset = require('../models/PasswordReset');
const OTP = require('../models/Otp');
const emailService = require('./emailService');
const BloomFilterService = require('../utility/BloomFilterService');
const { ALLOWED_MOOD_EMOJIS } = require('../config/constants');
const pgUserService = require('./pgUserService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Default avatar URL for users without profile picture
const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dmhqffeay/image/upload/v1737441346/avatars/default-avatar.png';

class AuthService {

  /**
   * Create user
   */
  async register(profileData, deviceType, timezone = 'UTC', locale = 'en-US') {
    const { email, name, password, username, dateOfBirth, interests, location } = profileData || {};
    
    // Validate interests
    const ALLOWED_INTERESTS = [
      'fitness', 'health', 'travel', 'education', 'career', 'finance', 'hobbies',
      'relationships', 'personal_growth', 'creativity', 'technology', 'business',
      'lifestyle', 'spirituality', 'sports', 'music', 'art', 'reading', 'cooking',
      'gaming', 'nature', 'volunteering'
    ];
    
    if (interests) {
      if (!Array.isArray(interests)) {
        throw new Error('Interests must be an array');
      }
      if (interests.length > 5) {
        throw new Error('You can select a maximum of 5 interests');
      }
      // Validate each interest value
      const invalidInterests = interests.filter(i => !ALLOWED_INTERESTS.includes(i));
      if (invalidInterests.length > 0) {
        throw new Error(`Invalid interests: ${invalidInterests.join(', ')}`);
      }
    }
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
    const existingByEmail = await pgUserService.getUserByEmail(email);
    const existingByUsername = username ? await pgUserService.getUserByUsername(username) : null;
    
    if (existingByEmail || existingByUsername) {
      throw new Error('User already exists with this email or username');
    }

    // Create user with all profile data
    const userData = {
      name,
      email,
      password,
      username: username || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      is_active: true,
      isVerified: true, // Since they verified via OTP
      profileCompleted: true,
      timezone: timezone || 'UTC',
      locale: locale || 'en-US'
    };

    // Add location fields if provided
    if (location) {
      userData.city = location.city || null;
      userData.state = location.state || null;
      userData.country = location.country || null;
    }

    const user = await pgUserService.createUser(userData);

    // Create user preferences in MongoDB with interests and dashboard years
    const currentYear = new Date().getFullYear();
    await UserPreferences.create({
      userId: user.id,
      interests: interests || [],
      dashboardYears: [currentYear]
    });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id);
    
    // Save refresh token (default to web if deviceType is unknown)
    const kind = deviceType === 'app' ? 'app' : 'web';
    await pgUserService.updateRefreshToken(user.id, kind, refreshToken);

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
    const hasPassword = !!user.password; // Check if password exists
    const userResponse = { ...user, hasPassword };
    delete userResponse.password;
    
    // Set default avatar if none exists
    if (!userResponse.avatar_url) {
      userResponse.avatar_url = DEFAULT_AVATAR_URL;
    }
    
    //populate bloom filter
    if (username) await BloomFilterService.add(username);
    await BloomFilterService.add(email);

    return {
      user: userResponse,
      token: accessToken,
      refreshToken
    };
  }

  /**
   * Login user
   */
  async login(email, password, deviceType, timezone = 'UTC', locale = 'en-US') {
    // Find user by email
    const user = await pgUserService.getUserByEmail(email, true); // true = include password
    
    if (!user || !user.is_active) {
      throw new Error('No user is registered with the given email.');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id);
    
    // Update last login, timezone, locale, and save refresh token
    const kind = deviceType === 'app' ? 'app' : 'web';
    await pgUserService.updateRefreshToken(user.id, kind, refreshToken);
    await pgUserService.updateUser(user.id, {
      last_login: new Date(),
      login_count: (user.login_count || 0) + 1,
      timezone: timezone || 'UTC',
      locale: locale || 'en-US'
    });
    
    // Remove password from response
    const hasPassword = !!user.password;
    const userResponse = { ...user, hasPassword };
    delete userResponse.password;
    
    // Set default avatar if none exists
    if (!userResponse.avatar_url) {
      userResponse.avatar_url = DEFAULT_AVATAR_URL;
    }
    
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
    await pgUserService.updateRefreshToken(userId, deviceType, null);
  
    return { message: `${deviceType} logged out successfully` };
  }
  
  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await pgUserService.getUserById(userId, true); // true = include password
    
    if (!user || !user.is_active) {
      throw new Error('User not found');
    }
    
    const userResponse = { ...user };
    const hasPassword = !!user.password; // Check if password exists
    delete userResponse.password;
    delete userResponse.refreshTokenWeb;
    delete userResponse.refreshTokenApp;
    
    // Set default avatar if none exists
    if (!userResponse.avatar_url) {
      userResponse.avatar_url = DEFAULT_AVATAR_URL;
    }
    
    // Fetch MongoDB extended fields (interests, currentMood, socialLinks)
    const UserPreferences = require('../models/extended/UserPreferences');
    const prefs = await UserPreferences.findOne({ userId }).lean();
    
    if (prefs) {
      userResponse.interests = prefs.interests || [];
      userResponse.currentMood = prefs.preferences?.currentMood || '';
      userResponse.theme = prefs.preferences?.theme || 'light';
      userResponse.website = prefs.socialLinks?.website || '';
      userResponse.youtube = prefs.socialLinks?.youtube || '';
      userResponse.instagram = prefs.socialLinks?.instagram || '';
    }
    
    return { ...userResponse, hasPassword };
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const pgAllowedUpdates = ['name', 'bio', 'location', 'dateOfBirth', 'avatar', 'username'];
    const mongoAllowedUpdates = ['interests', 'currentMood', 'theme', 'youtube', 'instagram', 'website'];
    const pgUpdates = {};
    const mongoUpdates = {};
    
    // Validate interests limit
    if (updateData.interests !== undefined) {
      if (!Array.isArray(updateData.interests)) {
        throw new Error('Interests must be an array');
      }
      if (updateData.interests.length > 5) {
        throw new Error('Maximum 5 interests allowed');
      }
    }
    
    // Validate mood emoji if provided
    if (updateData.currentMood !== undefined && updateData.currentMood !== '') {
      if (!ALLOWED_MOOD_EMOJIS.includes(updateData.currentMood)) {
        throw new Error('Invalid mood emoji. Please select from the allowed list.');
      }
    }
    
    // Validate theme if provided
    if (updateData.theme !== undefined && updateData.theme !== '') {
      if (!['light', 'dark'].includes(updateData.theme)) {
        throw new Error('Invalid theme. Please select either light or dark.');
      }
    }
    
    // Validate website URL if provided
    if (updateData.website && updateData.website.trim() !== '') {
      const websitePattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+/i;
      if (!websitePattern.test(updateData.website)) {
        throw new Error('Invalid website URL format');
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
    
    // Prevent email update
    if (updateData.email !== undefined) {
      throw new Error('Email cannot be updated');
    }

    // Username uniqueness check
    if (updateData.username) {
      const existing = await pgUserService.getUserByUsername(updateData.username);
      if (existing && existing.id !== userId) {
        const error = new Error('Username already exists');
        error.statusCode = 400;
        throw error;
      }
    }

    // Separate PostgreSQL and MongoDB updates
    Object.keys(updateData).forEach(key => {
      if (pgAllowedUpdates.includes(key) && updateData[key] !== undefined) {
        // Map camelCase to snake_case for PostgreSQL
        if (key === 'avatar') {
          pgUpdates['avatar_url'] = updateData[key];
        } else if (key === 'dateOfBirth') {
          pgUpdates['date_of_birth'] = updateData[key];
        } else {
          pgUpdates[key] = updateData[key];
        }
      }
      if (mongoAllowedUpdates.includes(key) && updateData[key] !== undefined) {
        mongoUpdates[key] = updateData[key];
      }
    });

    if (Object.keys(pgUpdates).length === 0 && Object.keys(mongoUpdates).length === 0) {
      throw new Error('No valid updates provided');
    }

    let user = null;
    
    // Update PostgreSQL fields
    if (Object.keys(pgUpdates).length > 0) {
      user = await pgUserService.updateUser(userId, pgUpdates);
      if (!user) {
        throw new Error('User not found');
      }
    } else {
      user = await pgUserService.getUserById(userId);
    }

    // Update MongoDB extended fields (interests, currentMood, social links)
    if (Object.keys(mongoUpdates).length > 0) {
      const UserPreferences = require('../models/extended/UserPreferences');
      const updateFields = {};
      
      if (mongoUpdates.interests !== undefined) {
        updateFields.interests = mongoUpdates.interests;
      }
      if (mongoUpdates.currentMood !== undefined) {
        updateFields['preferences.currentMood'] = mongoUpdates.currentMood;
      }
      if (mongoUpdates.theme !== undefined) {
        updateFields['preferences.theme'] = mongoUpdates.theme;
      }
      if (mongoUpdates.website !== undefined) {
        updateFields['socialLinks.website'] = mongoUpdates.website;
      }
      if (mongoUpdates.youtube !== undefined) {
        updateFields['socialLinks.youtube'] = mongoUpdates.youtube;
      }
      if (mongoUpdates.instagram !== undefined) {
        updateFields['socialLinks.instagram'] = mongoUpdates.instagram;
      }
      
      await UserPreferences.findOneAndUpdate(
        { userId },
        { $set: updateFields },
        { upsert: true, new: true }
      );
    }

    // Remove sensitive fields
    const userResponse = { ...user };
    delete userResponse.password;
    delete userResponse.refreshTokenWeb;
    delete userResponse.refreshTokenApp;

    // Set default avatar if none exists
    if (!userResponse.avatar_url) {
      userResponse.avatar_url = DEFAULT_AVATAR_URL;
    }

    // Fetch and include MongoDB extended fields in response
    const UserPreferences = require('../models/extended/UserPreferences');
    const prefs = await UserPreferences.findOne({ userId }).lean();
    
    if (prefs) {
      userResponse.interests = prefs.interests || [];
      userResponse.currentMood = prefs.preferences?.currentMood || '';
      userResponse.theme = prefs.preferences?.theme || 'light';
      userResponse.website = prefs.socialLinks?.website || '';
      userResponse.youtube = prefs.socialLinks?.youtube || '';
      userResponse.instagram = prefs.socialLinks?.instagram || '';
    }

    return userResponse;
  }
  
  /**
   * Update password
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const user = await pgUserService.getUserById(userId, true); // true = include password
    
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
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and invalidate all refresh tokens for security
    await pgUserService.updateUser(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date()
    });
    
    // Invalidate all existing refresh tokens for security
    await pgUserService.updateRefreshToken(userId, 'app', null);
    await pgUserService.updateRefreshToken(userId, 'web', null);

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
   * Request OTP for setting password (for users without password)
   */
  async requestPasswordSetupOTP(userId) {
    const user = await pgUserService.getUserById(userId, true); // true = include password
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a password
    if (user.password) {
      throw new Error('You already have a password. Use the change password option instead.');
    }

    // Delete any existing OTPs for this email and purpose
    await OTP.deleteMany({ email: user.email, purpose: 'password_setup' });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create OTP record (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({
      email: user.email,
      code: otpCode,
      purpose: 'password_setup',
      expiresAt,
      isVerified: false
    });

    // Send OTP email (non-blocking)
    emailService.sendOTPEmail(user.email, otpCode, 'password_setup')
      .then(() => console.log('Password setup OTP email sent successfully'))
      .catch(error => console.error('Failed to send password setup OTP email:', error));

    return {
      message: 'OTP sent to your email',
      expiresAt
    };
  }

  /**
   * Verify OTP and set new password (for users without password)
   */
  async setPasswordWithOTP(userId, otp, newPassword) {
    const user = await pgUserService.getUserById(userId, true); // true = include password
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a password
    if (user.password) {
      throw new Error('You already have a password. Use the change password option instead.');
    }

    // Find and verify OTP
    const otpRecord = await OTP.findOne({
      email: user.email,
      code: otp,
      purpose: 'password_setup',
      isVerified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pgUserService.updateUser(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date()
    });
    
    // Invalidate all existing refresh tokens for security
    await pgUserService.updateRefreshToken(userId, 'app', null);
    await pgUserService.updateRefreshToken(userId, 'web', null);

    // Delete verified OTP
    await OTP.deleteMany({ email: user.email, purpose: 'password_setup' });

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user.name);
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
    }

    return {
      message: 'Password has been set successfully',
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
      
      const user = await pgUserService.getUserById(decoded.userId);
      if (!user || !user.is_active) {
        throw new Error('Invalid refresh token');
      }
      
      // Get the stored refresh token for this device type
      const storedToken = await pgUserService.getRefreshToken(user.id, deviceType);
      if (storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      const tokens = this.generateTokens(user.id);
      
      // Rotate and persist the newly generated refresh token
      await pgUserService.updateRefreshToken(user.id, deviceType, tokens.refreshToken);
      
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
      const emailExists = await pgUserService.getUserByEmail(email);
      checks.push({
        field: 'email',
        value: email,
        exists: !!emailExists
      });
    }
    
    if (username && existsInBloom(username)) {
      const usernameExists = await pgUserService.getUserByUsername(username);
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
    // Check if user already exists - use bloom filter for optimization
    if (BloomFilterService.mightExist(email)) {
      const existingUser = await pgUserService.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
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

    // Send OTP email asynchronously (non-blocking) - don't wait for it
    emailService.sendOTPEmail(email, otpRecord.code, 'signup')
      .then(() => {
        console.log('OTP email sent successfully to:', email);
      })
      .catch((error) => {
        console.error('Failed to send OTP email:', error);
        // Email failure is logged but doesn't block the user
      });

    // Return immediately without waiting for email to be sent
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

    // Send OTP email asynchronously (non-blocking) - don't wait for it
    emailService.sendOTPEmail(email, otpRecord.code, 'signup')
      .then(() => {
        console.log('Resend OTP email sent successfully to:', email);
      })
      .catch((error) => {
        console.error('Failed to resend OTP email:', error);
        // Email failure is logged but doesn't block the user
      });

    // Return immediately without waiting for email to be sent
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
    const user = await pgUserService.getUserByEmail(email);
    if (!user || !user.is_active) {
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

    // Send reset email (non-blocking)
    emailService.sendPasswordResetEmail(email, resetData.token, user.name)
      .catch(error => {
        console.error('Failed to send password reset email:', error);
      });

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
    const user = await pgUserService.getUserByEmail(passwordReset.email);
    if (!user || !user.is_active) {
      throw new Error('User not found');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await pgUserService.updateUser(user.id, {
      password: hashedPassword,
      passwordChangedAt: new Date()
    });
    
    // Invalidate all existing refresh tokens for security
    await pgUserService.updateRefreshToken(user.id, 'app', null);
    await pgUserService.updateRefreshToken(user.id, 'web', null);

    // Mark token as used
    await PasswordReset.markTokenAsUsed(token);

    // Send confirmation email (non-blocking)
    emailService.sendPasswordChangeConfirmation(user.email, user.name)
      .catch(error => {
        console.error('Failed to send password change confirmation:', error);
      });

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
      email: user.email
    };
  }

  /**
   * Google OAuth Login/Register
   */
  async googleAuth(googleToken, deviceType, timezone = 'UTC', locale = 'en-US') {
    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      console.log(payload)
      const { email, name, picture, sub: googleId, email_verified } = payload;

      if (!email_verified) {
        throw new Error('Google email not verified');
      }

      // Check if user exists
      let user = await pgUserService.getUserByEmail(email);

      if (user) {
        // Existing user - login (DO NOT override name or avatar)
        const updates = {
          timezone: timezone || 'UTC',
          locale: locale || 'en-US'
        };
        
        // Update Google ID if not set (link account)
        if (!user.google_id) {
          updates.google_id = googleId;
        }
        
        // Note: We intentionally do NOT update name or avatar for existing users
        // Users may have customized these after initial signup
        
        user = await pgUserService.updateUser(user.id, updates);
      } else {
        // New user - register
        // Generate a unique username from email
        let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
        
        // Ensure username meets minimum length requirement (3 characters)
        if (baseUsername.length < 3) {
          baseUsername = baseUsername + 'user';
        }
        
        // Ensure it doesn't exceed maximum length (20 characters)
        if (baseUsername.length > 20) {
          baseUsername = baseUsername.substring(0, 20);
        }
        
        let username = baseUsername;
        let counter = 1;
        
        // Ensure username is unique - use bloom filter first for optimization
        // Check bloom filter first (fast), only query DB if bloom filter says it might exist
        while (BloomFilterService.mightExist(username) && await pgUserService.getUserByUsername(username)) {
          // Append counter, but ensure total length doesn't exceed 20 chars
          const counterStr = String(counter);
          const maxBaseLength = 20 - counterStr.length;
          const truncatedBase = baseUsername.substring(0, maxBaseLength);
          username = `${truncatedBase}${counter}`;
          counter++;
          
          // Safety check to prevent infinite loop (though unlikely)
          if (counter > 9999) {
            // Generate random suffix if too many collisions
            username = `${baseUsername.substring(0, 14)}${Math.floor(Math.random() * 999999)}`;
            break;
          }
        }


        // Download Google avatar and upload to Cloudinary (with timeout)
        console.log(picture)
        let avatarUrl = picture;
        try {
          const cloudinary = require('../utility/cloudinary');
          const axios = require('axios');
          
          // Download image with 5 second timeout
          const response = await axios.get(picture, { 
            responseType: 'arraybuffer',
            timeout: 5000
          });
          
          // Upload to Cloudinary with timeout
          await Promise.race([
            new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream({
                folder: 'avatars',
                resource_type: 'image',
                overwrite: true,
                public_id: `google_${username}_${Date.now()}`
              }, (error, result) => {
                if (error) reject(error);
                else {
                  avatarUrl = result.secure_url;
                  resolve(result);
                }
              });
              stream.end(Buffer.from(response.data, 'binary'));
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cloudinary upload timeout')), 8000)
            )
          ]);
        } catch (err) {
          // Fallback to Google picture if Cloudinary fails or times out
          console.log('Cloudinary upload failed, using Google avatar:', err.message);
          avatarUrl = picture;
        }

        user = await pgUserService.createUser({
          name,
          email,
          username,
          google_id: googleId,
          avatar_url: avatarUrl,
          isVerified: true,
          is_active: true,
          profileCompleted: false, // User needs to complete profile later
          timezone: timezone || 'UTC',
          locale: locale || 'en-US'
        });

        // Create user preferences in MongoDB with default dashboard year
        const currentYear = new Date().getFullYear();
        await UserPreferences.create({
          userId: user.id,
          interests: [], // Empty interests, user can add later
          dashboardYears: [currentYear]
        });

        // Add to bloom filter
        await BloomFilterService.add(username);
        await BloomFilterService.add(email);

        // Send welcome email
        try {
          await emailService.sendWelcomeEmail(email, name);
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id);
      
      // Save refresh token
      const kind = deviceType === 'app' ? 'app' : 'web';
      await pgUserService.updateRefreshToken(user.id, kind, refreshToken);

      // Remove sensitive data from response
      const userResponse = { ...user };
      const hasPassword = !!user.password; // Check if password exists
      delete userResponse.password;
      delete userResponse.refreshTokenWeb;
      delete userResponse.refreshTokenApp;

      // Set default avatar if none exists
      if (!userResponse.avatar_url) {
        userResponse.avatar_url = DEFAULT_AVATAR_URL;
      }

      return {
        user: { ...userResponse, hasPassword },
        token: accessToken,
        refreshToken,
        isNewUser: !user.profileCompleted
      };
    } catch (error) {
      if (error.message === 'Google email not verified') {
        throw error;
      }
      console.error('Google auth error:', error);
      throw new Error('Failed to authenticate with Google. Please try again.');
    }
  }
}

module.exports = new AuthService(); 