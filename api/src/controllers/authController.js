const DeviceToken = require('../models/DeviceToken');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sanitizeAuthMe } = require('../utility/sanitizer');

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
    const result = await authService.register(req.body, deviceType);

    // For web: set refresh token cookie. For app: return refresh token in body.
    if (deviceType === 'web') {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        partitioned: isProd ? true : false,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: Object.assign(
        { user: result.user, token: result.token },
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

    const { email, password, deviceToken, platform } = req.body;
    const deviceType = getDeviceType(req);
    const result = await authService.login(email, password, deviceType);

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
      const isProdLogin = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProdLogin,
        sameSite: isProdLogin ? 'none' : 'lax',
        partitioned: isProdLogin ? true : false,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: Object.assign(
        { user: result.user, token: result.token },
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
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', partitioned: true });

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
    console.log(req)
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
    // Prefer header or body when cookies are unavailable (e.g., mobile clients)
    const headerToken = (req.headers['x-refresh-token'] || '').trim();
    const deviceType = getDeviceType(req);

    const bodyToken = (req.body && req.body.refreshToken) ? String(req.body.refreshToken).trim() : '';
    const cookieToken = (req.cookies && req.cookies.refreshToken) ? String(req.cookies.refreshToken).trim() : '';
    let token = headerToken || bodyToken || cookieToken;
    // Optional: allow Bearer refresh tokens (mobile clients) without overriding cookies
    if (!token) {
      const auth = (req.headers['authorization'] || '').trim();
      if (/^Bearer\s+/.test(auth)) {
        const bearer = auth.replace(/^Bearer\s+/i, '').trim();
        try {
          const decoded = jwt.decode(bearer);
          if (decoded && decoded.type === 'refresh') {
            token = bearer;
          }
        } catch (_) {}
      }
    }

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
        const isProdRefresh = process.env.NODE_ENV === 'production';
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: isProdRefresh,
          sameSite: isProdRefresh ? 'none' : 'lax',
          partitioned: isProdRefresh ? true : false,
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
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
  return req.get("X-Client-Platform") || (req.get("User-Agent")?.includes("WishTrailApp") ? "app" : "web");
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
  resendOTP
}; 