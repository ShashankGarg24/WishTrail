const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  token: {
    type: String,
    required: [true, 'Reset token is required'],
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Maximum 5 reset attempts
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
passwordResetSchema.index({ email: 1, token: 1, isUsed: 1 });

// Static method to create password reset token
passwordResetSchema.statics.createResetToken = async function(email, expiryMinutes = 60) {
  // Clean up any existing unused tokens for this email
  await this.deleteMany({ email, isUsed: false });
  
  // Generate secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  const passwordReset = new this({
    email,
    token: hashedToken,
    expiresAt
  });
  
  await passwordReset.save();
  
  // Return the unhashed token to send via email
  return {
    token: resetToken,
    expiresAt,
    hashedToken
  };
};

// Static method to verify reset token
passwordResetSchema.statics.verifyResetToken = async function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const passwordReset = await this.findOne({
    token: hashedToken,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!passwordReset) {
    // Check if token exists but is expired or used
    const existingToken = await this.findOne({ token: hashedToken });
    
    if (existingToken) {
      if (existingToken.isUsed) {
        throw new Error('This password reset link has already been used. Please request a new one.');
      }
      if (existingToken.expiresAt < new Date()) {
        throw new Error('This password reset link has expired. Please request a new one.');
      }
    }
    
    throw new Error('Invalid or expired password reset token.');
  }
  
  return passwordReset;
};

// Static method to mark token as used
passwordResetSchema.statics.markTokenAsUsed = async function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const passwordReset = await this.findOneAndUpdate(
    { 
      token: hashedToken,
      isUsed: false 
    },
    { 
      isUsed: true,
      $inc: { attempts: 1 }
    },
    { new: true }
  );
  
  return passwordReset;
};

// Static method to check rate limiting
passwordResetSchema.statics.canRequestReset = async function(email) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Check how many requests in the last hour
  const recentRequests = await this.countDocuments({
    email,
    createdAt: { $gte: oneHourAgo }
  });
  
  const maxRequests = 3; // Maximum 3 requests per hour
  
  if (recentRequests >= maxRequests) {
    const nextAllowedTime = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
    const waitTime = Math.ceil((nextAllowedTime - now) / 1000 / 60); // minutes
    
    return {
      canRequest: false,
      reason: 'rate_limit',
      waitTime,
      maxRequests
    };
  }
  
  return { canRequest: true };
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);