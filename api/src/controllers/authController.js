const { logger } = require('./../config/observability');
const DeviceToken = require('../models/DeviceToken');
const authService = require('../services/authService');
const productUpdateService = require('../services/productUpdateService');
const { validationResult } = require('express-validator');
const { sanitizeAuthMe } = require('../utility/sanitizer');

const REFRESH_COOKIE_NAME = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';

// In production: cross-site cookie (frontend on wishtrail.in, API on api.wishtrail.in)
// In development: same-site lax, no domain restriction, no secure requirement
const REFRESH_COOKIE_BASE_OPTIONS = isProd
  ? { httpOnly: true, secure: true, sameSite: 'none', path: '/', domain: process.env.COOKIE_DOMAIN || 'api.wishtrail.in' }
  : { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };

const REFRESH_COOKIE_OPTIONS = {
  ...REFRESH_COOKIE_BASE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_BASE_OPTIONS);
};

const setRefreshTokenCookie = (res, token) => {
  clearRefreshTokenCookie(res);
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
};

// @desc    Complete user profile and register after OTP verification
// @route   POST /api/v1/auth/complete-profile
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const deviceType = getDeviceType(req);
    const { timezone, locale } = req.body;
    const result = await authService.register(req.body, deviceType, timezone, locale);

    // Fetch unseen major product update for new users (if any)
    let latestUpdate = null;
    try {
      latestUpdate = await productUpdateService.getLatestUnseenMajorUpdate(result.user.id);
    } catch (error) {
      logger.info('Failed to fetch latest product update:', error.message);
    }

    // For web: set refresh token cookie. For app: return refresh token in body.
    if (deviceType === 'web') {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: Object.assign(
        { user: result.user, token: result.token, latestUpdate },
        deviceType === 'app' ? { refreshToken: result.refreshToken } : {}
      )
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, deviceToken, platform, timezone, locale } = req.body;
    const deviceType = getDeviceType(req);
    const result = await authService.login(email, password, deviceType, timezone, locale);

    // Fetch unseen major product update for client modal
    let latestUpdate = null;
    try {
      latestUpdate = await productUpdateService.getLatestUnseenMajorUpdate(result.user.id);
    } catch (error) {
      logger.info('Failed to fetch latest product update:', error.message);
    }

    // ✅ Store Expo push token if login is from app
    if (deviceToken) {
      await DeviceToken.findOneAndUpdate(
        { userId: result.user._id, token: deviceToken },
        { $set: { platform, provider: 'expo', isActive: true, lastSeenAt: new Date() } },
        { upsert: true }
      );
    }

    // For web: set refresh token cookie (used by web)
    if (deviceType === 'web') {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: Object.assign(
        { user: result.user, token: result.token, latestUpdate },
        deviceType === 'app' ? { refreshToken: result.refreshToken } : {}
      )
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const { deviceToken } = req.body;
    const deviceType = getDeviceType(req);

    await authService.logout(req.user.id, deviceType);

    if (deviceToken) {
      await DeviceToken.updateOne(
        { userId: req.user.id, token: deviceToken },
        { $set: { isActive: false, lastSeenAt: new Date() } }
      );
    }

    // Clear refresh token cookie (for web)
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    const sanitizedUser = sanitizeAuthMe(user);

    res.status(200).json({
      success: true,
      data: { user: sanitizedUser }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    logger.info(req)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await authService.updateProfile(req.user.id, req.body);
    const sanitizedUser = sanitizeAuthMe(user);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: sanitizedUser }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for password setup (Google SSO users)
// @route   POST /api/v1/auth/password-setup/request-otp
// @access  Private
const requestPasswordSetupOTP = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordSetupOTP(req.user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { expiresAt: result.expiresAt }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set password with OTP (Google SSO users)
// @route   POST /api/v1/auth/password-setup/verify
// @access  Private
const setPasswordWithOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { otp, newPassword } = req.body;
    const result = await authService.setPasswordWithOTP(req.user.id, otp, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const result = await authService.updatePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const deviceType = getDeviceType(req);

    // Read refresh token: cookie (web) → x-refresh-token header → body (app/fallback)
    const cookieToken = (req.cookies && req.cookies.refreshToken) ? String(req.cookies.refreshToken).trim() : '';
    const headerToken = String(req.headers['x-refresh-token'] || '').trim();
    const bodyToken = (req.body && req.body.refreshToken) ? String(req.body.refreshToken).trim() : '';
    const token = cookieToken || headerToken || bodyToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    const result = await authService.refreshToken(token, deviceType);

    // For web: set new refresh token as httpOnly cookie; For app: return it in body.
    if (deviceType === 'web') {
      try {
        setRefreshTokenCookie(res, result.refreshToken);
      } catch (_) {}
    }

    const payload = Object.assign(
      { token: result.accessToken },
      deviceType === 'app' ? { refreshToken: result.refreshToken } : {}
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: payload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const { email } = req.body;
    const result = await authService.forgotPassword(email);


    // In a real application, you would send this token via email
    // For now, we'll just return it in the response (NOT recommended for production)
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Check if email or username already exists
// @route   POST /api/v1/auth/check-existing
// @access  Public
const checkExistingUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await authService.checkExistingUser(req.body);

    res.status(200).json({
      success: true,
      message: 'User availability checked',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for signup
// @route   POST /api/v1/auth/request-otp
// @access  Public
const requestOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await authService.requestOTP(req.body);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await authService.verifyOTP(req.body);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await authService.resendOTP(req.body);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getDeviceType = (req) => {
  const platformHeader = String(req.get('X-Client-Platform') || '').toLowerCase();
  if (platformHeader === 'app' || platformHeader === 'web') {
    return platformHeader;
  }

  return req.get('User-Agent')?.includes('WishTrailApp') ? 'app' : 'web';
};

// @desc    Google OAuth authentication
// @route   POST /api/v1/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, timezone, locale } = req.body;
    const deviceType = getDeviceType(req);
    
    const result = await authService.googleAuth(token, deviceType, timezone, locale);

    // Fetch unseen major product update for Google auth users
    let latestUpdate = null;
    try {
      latestUpdate = await productUpdateService.getLatestUnseenMajorUpdate(result.user.id);
    } catch (error) {
      logger.info('Failed to fetch latest product update:', error.message);
    }

    // For web: set refresh token cookie
    if (deviceType === 'web') {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.status(200).json({
      success: true,
      message: result.isNewUser ? 'Registration successful' : 'Login successful',
      data: Object.assign(
        { user: result.user, token: result.token, isNewUser: result.isNewUser, latestUpdate },
        deviceType === 'app' ? { refreshToken: result.refreshToken } : {}
      )
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  checkExistingUser,
  requestOTP,
  verifyOTP,
  resendOTP,
  googleAuth,
  requestPasswordSetupOTP,
  setPasswordWithOTP
}; 