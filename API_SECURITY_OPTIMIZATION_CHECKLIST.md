# 🔒 API Security & Optimization Checklist

## Overview
Comprehensive security hardening and optimization plan for WishTrail API to protect against attacks, minimize data exposure, and improve performance.

---

## ✅ Current Security Measures (Already Implemented)

### 1. Basic Security
- ✅ Helmet.js for HTTP headers security
- ✅ CORS with whitelist configuration
- ✅ Express rate limiting (commented out - needs enabling)
- ✅ JWT authentication with Bearer tokens
- ✅ Password hashing with bcryptjs
- ✅ Input validation using express-validator
- ✅ Cookie-based refresh tokens for web
- ✅ Compression enabled
- ✅ Request body size limits (10mb)
- ✅ MongoDB field selection to exclude sensitive data
- ✅ Global error handler
- ✅ Maintenance/Coming Soon mode middleware

---

## 🚨 CRITICAL SECURITY ISSUES TO FIX

### 1. **ENABLE RATE LIMITING (HIGH PRIORITY)**
**Current State:** Rate limiters are defined but commented out
**Risk:** Brute force attacks, DDoS, API abuse

**Actions:**
```javascript
// Enable in server.js (lines 95-98)
app.use('/api', createRateLimiter(15 * 60 * 1000, 500, 'Too many requests'));
app.use(/^\/api\/v\d+\/auth\/login$/, createRateLimiter(15 * 60 * 1000, 15, 'Too many login attempts'));
app.use(/^\/api\/v\d+\/auth\/signup$/, createRateLimiter(15 * 60 * 1000, 15, 'Too many signup attempts'));
app.use(/^\/api\/v\d+\/users/, createRateLimiter(60 * 1000, 30, 'Too many user requests'));
```

**Additional Rate Limits Needed:**
- `/auth/request-otp`: 5 requests/15min per IP
- `/auth/verify-otp`: 5 attempts/15min per email
- `/auth/refresh`: 10 requests/hour per token
- `/auth/forgot-password`: 3 requests/hour per email
- `/upload/*`: 10 requests/min per user
- `/goals`: 50 requests/min per user
- `/communities`: 30 requests/min per user
- `/notifications/send`: 20 requests/min per user

---

### 2. **RESPONSE DATA SANITIZATION (HIGH PRIORITY)**
**Current State:** Inconsistent field exclusion across responses
**Risk:** Sensitive data leakage (passwords, tokens, internal IDs, email addresses)

**Create Centralized Sanitizer:**

```javascript
// api/src/utility/sanitizer.js

const USER_PUBLIC_FIELDS = [
  '_id', 'name', 'username', 'avatar', 'bio', 'location', 
  'interests', 'isVerified', 'isPremium', 'createdAt',
  'followersCount', 'followingCount', 'goalsCount', 'isPrivate'
];

const USER_PRIVATE_FIELDS = [
  'email', 'password', 'refreshToken', 'passwordResetToken', 
  'passwordResetExpires', 'passwordChangedAt', 'deviceTokens',
  'notificationSettings', 'dashboardYears', 'timezone', '__v'
];

const GOAL_PUBLIC_FIELDS = [
  '_id', 'title', 'description', 'category', 'priority', 'status',
  'progress', 'targetDate', 'duration', 'userId', 'year',
  'likesCount', 'commentsCount', 'isPrivate', 'createdAt', 'updatedAt'
];

const NOTIFICATION_SAFE_FIELDS = [
  '_id', 'userId', 'type', 'title', 'body', 'isRead', 
  'createdAt', 'data'  // data should be further sanitized
];

const sanitizeUser = (user, isSelf = false) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  
  if (isSelf) {
    // User viewing their own profile - include more fields
    const excluded = ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires', '__v'];
    excluded.forEach(field => delete obj[field]);
    return obj;
  }
  
  // Public view - only safe fields
  return USER_PUBLIC_FIELDS.reduce((acc, field) => {
    if (obj[field] !== undefined) acc[field] = obj[field];
    return acc;
  }, {});
};

const sanitizeGoal = (goal, isOwner = false, viewerId = null) => {
  if (!goal) return null;
  const obj = goal.toObject ? goal.toObject() : { ...goal };
  
  // Remove internal fields
  delete obj.__v;
  delete obj.deletedAt;
  
  // Populate owner info with sanitized user data
  if (obj.userId && typeof obj.userId === 'object') {
    obj.userId = sanitizeUser(obj.userId, false);
  }
  
  return obj;
};

const sanitizeNotification = (notification) => {
  if (!notification) return null;
  const obj = notification.toObject ? notification.toObject() : { ...notification };
  
  // Remove internal fields
  delete obj.__v;
  
  // Sanitize nested data
  if (obj.data) {
    // Remove sensitive info from notification data
    delete obj.data.email;
    delete obj.data.phone;
    delete obj.data.password;
    delete obj.data.token;
  }
  
  return obj;
};

const sanitizeArray = (array, sanitizerFn, ...args) => {
  if (!Array.isArray(array)) return [];
  return array.map(item => sanitizerFn(item, ...args)).filter(Boolean);
};

// Sanitize API error messages (don't expose internal details)
const sanitizeError = (error, isDevelopment = false) => {
  const safeError = {
    success: false,
    message: error.message || 'An error occurred'
  };
  
  // Only include stack trace in development
  if (isDevelopment) {
    safeError.stack = error.stack;
    safeError.details = error.details;
  }
  
  return safeError;
};

module.exports = {
  sanitizeUser,
  sanitizeGoal,
  sanitizeNotification,
  sanitizeArray,
  sanitizeError,
  USER_PUBLIC_FIELDS,
  GOAL_PUBLIC_FIELDS
};
```

**Update All Controllers:**
- Import sanitizer in every controller
- Wrap all responses with appropriate sanitizer
- Never send raw Mongoose documents

---

### 3. **JWT TOKEN SECURITY IMPROVEMENTS (HIGH PRIORITY)**

**Issues:**
- No token rotation mechanism
- No token revocation/blacklist
- JWT secret might be weak
- No monitoring for token reuse attacks

**Actions:**

```javascript
// api/src/middleware/tokenBlacklist.js
const redis = require('./config/redis');

const blacklistToken = async (token, expiresIn = 86400) => {
  // Store token in Redis with TTL matching JWT expiration
  await redis.setex(`blacklist:${token}`, expiresIn, '1');
};

const isTokenBlacklisted = async (token) => {
  const result = await redis.get(`blacklist:${token}`);
  return result === '1';
};

const blacklistUserTokens = async (userId) => {
  // Blacklist all tokens for a user (on password change, account deletion)
  await redis.setex(`blacklist:user:${userId}`, 86400, '1');
};

const isUserBlacklisted = async (userId) => {
  const result = await redis.get(`blacklist:user:${userId}`);
  return result === '1';
};

module.exports = { 
  blacklistToken, 
  isTokenBlacklisted,
  blacklistUserTokens,
  isUserBlacklisted
};
```

**Update auth middleware:**
```javascript
// In api/src/middleware/auth.js
const { isTokenBlacklisted, isUserBlacklisted } = require('./tokenBlacklist');

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user's all tokens are blacklisted
    if (await isUserBlacklisted(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired, please login again'
      });
    }
    
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this id'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }
    
    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'Password was changed, please login again'
        });
      }
    }
    
    req.user = user;
    req.token = token; // Store for potential blacklisting
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired, please refresh'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
```

**On password change/logout:**
```javascript
// Blacklist token on logout
await blacklistToken(req.token);

// Blacklist all user tokens on password change
await blacklistUserTokens(userId);
```

---

### 4. **REQUEST VALIDATION & SANITIZATION (MEDIUM PRIORITY)**

**Missing Validations:**
- File upload validation (size, type, content)
- Query parameter validation
- Deep object validation
- Array length limits
- MongoDB injection prevention

**Create Comprehensive Validators:**

```javascript
// api/src/middleware/validators.js
const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');

// MongoDB injection protection middleware
const sanitizeInput = (req, res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.query);
  mongoSanitize.sanitize(req.params);
  next();
};

// Common validation rules
const validators = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  
  mongoId: (paramName = 'id') => [
    param(paramName).isMongoId().withMessage('Invalid ID format')
  ],
  
  email: [
    body('email')
      .isEmail().normalizeEmail()
      .withMessage('Invalid email')
      .isLength({ max: 255 })
  ],
  
  username: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('Invalid username format')
  ],
  
  arrayLength: (fieldName, min = 0, max = 50) => [
    body(fieldName)
      .optional()
      .isArray({ min, max })
      .withMessage(`${fieldName} must be an array with ${min}-${max} items`)
  ],
  
  // XSS protection
  noScriptTags: (fieldName) => [
    body(fieldName)
      .trim()
      .customSanitizer(value => {
        // Remove script tags and event handlers
        return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      })
  ],
  
  // SQL injection patterns (if using raw queries)
  noSqlInjection: (fieldName) => [
    body(fieldName)
      .customSanitizer(value => {
        if (typeof value === 'string') {
          // Remove common SQL injection patterns
          return value.replace(/('|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute)/gi, '');
        }
        return value;
      })
  ]
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  sanitizeInput,
  validators,
  handleValidationErrors
};
```

**Install required package:**
```bash
npm install express-mongo-sanitize
```

**Apply to all routes:**
```javascript
// In server.js - add after body parsers
const { sanitizeInput } = require('./middleware/validators');
app.use(sanitizeInput);
```

---

### 5. **HELMET CONFIGURATION HARDENING (MEDIUM PRIORITY)**

**Current State:** Basic helmet setup
**Improvement:** Add comprehensive security headers

```javascript
// In server.js - replace current helmet config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
});
```

---

### 6. **FILE UPLOAD SECURITY (HIGH PRIORITY)**

**Current State:** Basic file upload with size limit
**Risks:** Malicious files, path traversal, DoS

**Secure File Upload Middleware:**

```javascript
// api/src/middleware/fileUpload.js
const fileUpload = require('express-fileupload');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

const fileUploadConfig = fileUpload({
  limits: { fileSize: MAX_VIDEO_SIZE },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  safeFileNames: true,
  preserveExtension: true,
  parseNested: true
});

const validateImageUpload = (req, res, next) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  const file = req.files.file;
  
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
    });
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    });
  }
  
  // Check file extension matches mime type
  const ext = path.extname(file.name).toLowerCase();
  const validExtensions = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
  };
  
  if (!validExtensions[file.mimetype]?.includes(ext)) {
    return res.status(400).json({
      success: false,
      message: 'File extension does not match file type'
    });
  }
  
  // Generate secure filename
  const hash = crypto.randomBytes(16).toString('hex');
  req.secureFilename = `${hash}${ext}`;
  
  next();
};

const validateVideoUpload = (req, res, next) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  const file = req.files.file;
  
  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only MP4, WebM, and MOV are allowed'
    });
  }
  
  // Check file size
  if (file.size > MAX_VIDEO_SIZE) {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`
    });
  }
  
  next();
};

module.exports = {
  fileUploadConfig,
  validateImageUpload,
  validateVideoUpload
};
```

---

### 7. **CORS SECURITY HARDENING (MEDIUM PRIORITY)**

**Issues:**
- Regex patterns might be too permissive
- No origin validation logging
- Missing preflight cache

**Improvements:**

```javascript
// In server.js - enhance CORS config
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const isAllowedExact = allowedOrigins.includes(origin);
    const isAllowedRegex = allowedRegexes.some((re) => re.test(origin));
    
    if (isAllowedExact || isAllowedRegex) {
      return callback(null, true);
    }
    
    // Log blocked origins for security monitoring
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    
    // Return error instead of silently blocking
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'X-Client-Platform', 
    'X-Platform',
    'X-Refresh-Token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours preflight cache
  preflightContinue: false
};
```

---

### 8. **LOGGING & MONITORING (MEDIUM PRIORITY)**

**Missing:**
- Security event logging
- Failed authentication attempts tracking
- API abuse detection
- Error logging to external service

**Implement Security Logger:**

```javascript
// api/src/utility/securityLogger.js
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const SECURITY_LOG = path.join(LOG_DIR, 'security.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logSecurityEvent = (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  
  // Write to file
  fs.appendFileSync(SECURITY_LOG, JSON.stringify(logEntry) + '\n');
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Security Event:', logEntry);
  }
  
  // TODO: Send to external monitoring service (Sentry, DataDog, etc.)
};

// Track failed login attempts
const failedLoginAttempts = new Map();

const trackFailedLogin = (email, ip) => {
  const key = `${email}:${ip}`;
  const attempts = failedLoginAttempts.get(key) || 0;
  const newAttempts = attempts + 1;
  
  failedLoginAttempts.set(key, newAttempts);
  
  logSecurityEvent('FAILED_LOGIN', {
    email,
    ip,
    attempts: newAttempts
  });
  
  // Alert on suspicious activity
  if (newAttempts >= 5) {
    logSecurityEvent('BRUTE_FORCE_DETECTED', {
      email,
      ip,
      attempts: newAttempts
    });
    // TODO: Send alert to admin, potentially block IP
  }
  
  // Reset after 15 minutes
  setTimeout(() => {
    failedLoginAttempts.delete(key);
  }, 15 * 60 * 1000);
};

const logSuccessfulLogin = (userId, ip, userAgent) => {
  logSecurityEvent('SUCCESSFUL_LOGIN', {
    userId,
    ip,
    userAgent
  });
};

const logTokenRefresh = (userId, ip) => {
  logSecurityEvent('TOKEN_REFRESH', {
    userId,
    ip
  });
};

const logSuspiciousActivity = (type, details) => {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    type,
    ...details
  });
};

module.exports = {
  logSecurityEvent,
  trackFailedLogin,
  logSuccessfulLogin,
  logTokenRefresh,
  logSuspiciousActivity
};
```

---

### 9. **DATABASE QUERY OPTIMIZATION (MEDIUM PRIORITY)**

**Issues:**
- Potential N+1 queries
- Missing indexes on frequently queried fields
- No query result caching
- Unbounded queries without limits

**Actions:**

```javascript
// Add indexes to models
// api/src/models/User.js
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });
userSchema.index({ interests: 1 });

// api/src/models/Goal.js
goalSchema.index({ userId: 1, year: 1, status: 1 });
goalSchema.index({ category: 1, isPrivate: 1 });
goalSchema.index({ createdAt: -1 });
goalSchema.index({ targetDate: 1 });

// api/src/models/Activity.js
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

// api/src/models/Notification.js
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// api/src/models/Follow.js
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, status: 1 });
```

**Query Optimization Utility:**

```javascript
// api/src/utility/queryOptimizer.js
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const paginateQuery = (query, page = 1, limit = DEFAULT_PAGE_LIMIT) => {
  const validLimit = Math.min(Math.max(1, parseInt(limit)), MAX_PAGE_LIMIT);
  const validPage = Math.max(1, parseInt(page));
  const skip = (validPage - 1) * validLimit;
  
  return query.skip(skip).limit(validLimit);
};

const selectOnlyNeeded = (query, fields) => {
  if (fields && fields.length > 0) {
    return query.select(fields.join(' '));
  }
  return query;
};

// Prevent unbounded queries
const ensureLimit = (query, maxLimit = MAX_PAGE_LIMIT) => {
  if (!query.options.limit || query.options.limit > maxLimit) {
    query.limit(maxLimit);
  }
  return query;
};

module.exports = {
  paginateQuery,
  selectOnlyNeeded,
  ensureLimit,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT
};
```

---

### 10. **API RESPONSE HEADERS OPTIMIZATION (LOW PRIORITY)**

**Add performance and security headers:**

```javascript
// api/src/middleware/responseHeaders.js
const setResponseHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Performance headers
  res.setHeader('X-Response-Time', Date.now() - req.startTime);
  
  // Cache control for different routes
  if (req.path.includes('/static/') || req.path.includes('/uploads/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.includes('/auth/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  }
  
  // Remove unnecessary headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Track request start time
const trackRequestTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

module.exports = { setResponseHeaders, trackRequestTime };
```

---

### 11. **ENVIRONMENT VARIABLES SECURITY (HIGH PRIORITY)**

**Issues:**
- No validation of required env vars
- Potential exposure in error messages
- No secure secrets management

**Create Env Validator:**

```javascript
// api/src/config/validateEnv.js
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGO_URI',
  'CLIENT_URL',
  'NODE_ENV'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  // Validate MONGO_URI format
  if (!process.env.MONGO_URI.startsWith('mongodb')) {
    throw new Error('Invalid MONGO_URI format');
  }
  
  console.log('✅ Environment variables validated');
};

module.exports = validateEnv;
```

**Call at startup:**
```javascript
// In server.js, before createApp()
require('./config/validateEnv')();
```

---

### 12. **API REQUEST/RESPONSE PAYLOAD MINIMIZATION (HIGH PRIORITY)**

**Strategy: Send only what's needed**

**Create Response Formatter:**

```javascript
// api/src/utility/responseFormatter.js

class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }
  
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };
    
    if (errors && process.env.NODE_ENV === 'development') {
      response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
  }
  
  static paginated(res, data, page, limit, total, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  }
  
  // For list responses - only include necessary fields
  static list(res, items, fields = null) {
    const data = fields 
      ? items.map(item => this.pickFields(item, fields))
      : items;
    
    return res.status(200).json({
      success: true,
      data
    });
  }
  
  static pickFields(obj, fields) {
    return fields.reduce((acc, field) => {
      if (obj[field] !== undefined) {
        acc[field] = obj[field];
      }
      return acc;
    }, {});
  }
}

module.exports = ApiResponse;
```

**Apply to all controller responses:**
```javascript
// Example usage in controller
const ApiResponse = require('../utility/responseFormatter');

// Instead of:
res.status(200).json({ success: true, data: users });

// Use:
ApiResponse.success(res, users, 'Users retrieved successfully');
```

---

### 13. **PASSWORD SECURITY ENHANCEMENTS (MEDIUM PRIORITY)**

**Current:** Basic bcrypt hashing
**Improvements:**

```javascript
// api/src/utility/passwordSecurity.js
const bcrypt = require('bcryptjs');

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Password strength validator
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check against common passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Hash password with appropriate cost
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12); // Increased from default 10
  return bcrypt.hash(password, salt);
};

// Check for password reuse
const isPasswordReused = async (userId, newPassword) => {
  // TODO: Store hash of last 5 passwords and check against them
  // For now, just check against current password
  const user = await User.findById(userId).select('password');
  if (user && await bcrypt.compare(newPassword, user.password)) {
    return true;
  }
  return false;
};

module.exports = {
  validatePasswordStrength,
  hashPassword,
  isPasswordReused,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH
};
```

---

### 14. **API VERSIONING IMPROVEMENTS (LOW PRIORITY)**

**Current:** Basic v1 versioning
**Improvements:**

- Add deprecation warnings for old versions
- Version-specific rate limits
- Graceful migration path

```javascript
// api/src/middleware/apiVersion.js
const CURRENT_VERSION = 'v1';
const DEPRECATED_VERSIONS = [];
const SUNSET_VERSIONS = [];

const checkApiVersion = (req, res, next) => {
  const version = req.baseUrl.match(/\/v(\d+)\//)?.[0];
  
  if (!version) {
    return res.status(400).json({
      success: false,
      message: 'API version not specified'
    });
  }
  
  if (SUNSET_VERSIONS.includes(version)) {
    return res.status(410).json({
      success: false,
      message: `API ${version} has been sunset. Please upgrade to ${CURRENT_VERSION}`
    });
  }
  
  if (DEPRECATED_VERSIONS.includes(version)) {
    res.setHeader('X-API-Warn', `API ${version} is deprecated. Please upgrade to ${CURRENT_VERSION}`);
  }
  
  next();
};

module.exports = checkApiVersion;
```

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

### Phase 1: Critical Security (Week 1)
1. ✅ Enable rate limiting on all routes
2. ✅ Implement JWT token blacklisting
3. ✅ Create response data sanitization utility
4. ✅ Add file upload validation
5. ✅ Enable MongoDB injection protection

### Phase 2: Data Protection (Week 2)
6. ✅ Apply response sanitizers to all controllers
7. ✅ Implement security event logging
8. ✅ Add password strength validation
9. ✅ Environment variable validation
10. ✅ Update error handler to sanitize errors

### Phase 3: Optimization (Week 3)
11. ✅ Add database indexes
12. ✅ Implement query result caching with Redis
13. ✅ Create unified response formatter
14. ✅ Optimize payload sizes
15. ✅ Add request/response compression

### Phase 4: Monitoring & Maintenance (Week 4)
16. ✅ Set up external logging service integration
17. ✅ Implement API usage analytics
18. ✅ Create admin dashboard for security events
19. ✅ Add automated security testing
20. ✅ Document security best practices

---

## 🔍 TESTING CHECKLIST

### Security Tests
- [ ] Test rate limiting on all endpoints
- [ ] Verify JWT token expiration and refresh
- [ ] Test file upload with malicious files
- [ ] Attempt SQL/NoSQL injection
- [ ] Test XSS payloads in inputs
- [ ] Verify CORS with unauthorized origins
- [ ] Test authentication bypass attempts
- [ ] Verify sensitive data is not exposed in responses
- [ ] Test password reset flow
- [ ] Verify session invalidation on password change

### Performance Tests
- [ ] Load test with 1000+ concurrent users
- [ ] Measure API response times (target <200ms)
- [ ] Test pagination with large datasets
- [ ] Verify caching is working
- [ ] Test query performance with indexes
- [ ] Measure payload sizes (target <100KB)

---

## 📝 MONITORING METRICS

### Security Metrics to Track
- Failed login attempts per hour
- Rate limit violations per endpoint
- JWT token refresh frequency
- Blocked CORS requests
- File upload rejections
- Password reset requests
- Suspicious activity alerts

### Performance Metrics
- Average response time per endpoint
- Database query execution time
- Cache hit/miss ratio
- API throughput (requests/second)
- Error rate percentage
- Payload size distribution

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Production Deploy
- [ ] All rate limiters enabled
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] All sensitive env vars are set
- [ ] Database indexes created
- [ ] Redis cache configured
- [ ] Error logging service connected
- [ ] Security headers configured
- [ ] CORS origins restricted to production domains
- [ ] File upload limits configured
- [ ] API documentation updated

### Production Monitoring
- [ ] Set up uptime monitoring
- [ ] Configure error alerting
- [ ] Enable security event notifications
- [ ] Set up performance monitoring
- [ ] Configure log rotation
- [ ] Regular security audits scheduled

---

## 📚 ADDITIONAL RESOURCES

### Security Best Practices
- OWASP API Security Top 10
- JWT Best Practices
- MongoDB Security Checklist
- Express.js Security Guide

### Tools to Consider
- **Helmet.js** - Already using ✅
- **express-rate-limit** - Already using ✅
- **express-validator** - Already using ✅
- **express-mongo-sanitize** - Need to add
- **Sentry** - For error tracking
- **DataDog/New Relic** - For APM
- **Cloudflare** - For DDoS protection
- **AWS WAF** - Web application firewall

---

## 📞 INCIDENT RESPONSE PLAN

### If Security Breach Detected
1. Immediately rotate JWT_SECRET
2. Invalidate all user sessions
3. Review security logs for attack vectors
4. Patch vulnerability
5. Notify affected users
6. Document incident and response

### Regular Security Maintenance
- Weekly: Review security logs
- Monthly: Security audit of new features
- Quarterly: Full penetration testing
- Annually: External security audit

---

**Last Updated:** December 16, 2025
**Status:** Ready for Implementation
**Owner:** Development Team
