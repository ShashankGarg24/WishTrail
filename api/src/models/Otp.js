const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
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
  code: {
    type: String,
    required: [true, 'OTP code is required'],
    length: 6
  },
  purpose: {
    type: String,
    required: [true, 'OTP purpose is required'],
    enum: ['signup', 'login', 'password_reset', 'email_verification', 'password_setup'],
    default: 'signup'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Maximum 5 attempts before blocking
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastAttempt: {
    type: Date,
    default: null
  },
  metadata: {
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Static method to generate OTP
otpSchema.statics.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create OTP
otpSchema.statics.createOTP = async function(email, purpose = 'signup', expiryMinutes = 10) {
  // Clean up any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose, isVerified: false });
  
  const code = this.generateCode();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  const otp = new this({
    email,
    code,
    purpose,
    expiresAt
  });
  
  await otp.save();
  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, code, purpose = 'signup') {
  const otp = await this.findOne({
    email,
    code,
    purpose,
    isVerified: false,
    isBlocked: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!otp) {
    // Try to find any OTP for this email/purpose to check for issues
    const existingOTP = await this.findOne({ email, purpose, isVerified: false });
    
    if (existingOTP) {
      // Increment attempts
      existingOTP.attempts += 1;
      existingOTP.lastAttempt = new Date();
      
      // Block after too many attempts
      if (existingOTP.attempts >= 5) {
        existingOTP.isBlocked = true;
      }
      
      await existingOTP.save();
      
      if (existingOTP.isBlocked) {
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }
      
      if (existingOTP.expiresAt < new Date()) {
        throw new Error('OTP has expired. Please request a new one.');
      }
      
      throw new Error('Invalid OTP code. Please try again.');
    }
    
    throw new Error('No valid OTP found. Please request a new one.');
  }
  
  // Mark as verified
  otp.isVerified = true;
  await otp.save();
  
  return otp;
};

// Static method to check if user can request new OTP
otpSchema.statics.canRequestNewOTP = async function(email, purpose = 'signup') {
  const lastOTP = await this.findOne(
    { email, purpose },
    {},
    { sort: { createdAt: -1 } }
  );
  
  if (!lastOTP) {
    return { canRequest: true, waitTime: 0 };
  }
  
  // Check if user is blocked
  if (lastOTP.isBlocked) {
    const blockTime = 15 * 60 * 1000; // 15 minutes block
    const timeSinceLastAttempt = Date.now() - lastOTP.lastAttempt.getTime();
    
    if (timeSinceLastAttemit < blockTime) {
      return {
        canRequest: false,
        waitTime: Math.ceil((blockTime - timeSinceLastAttempt) / 1000),
        reason: 'blocked'
      };
    }
  }
  
  // Check minimum wait time between requests (starts at 30 seconds, then exponential backoff)
  const timeSinceCreation = Date.now() - lastOTP.createdAt.getTime();
  const requestCount = await this.countDocuments({ email, purpose });
  
  // Exponential backoff: 30s, 60s, 120s, 300s (5 min), 600s (10 min)
  const waitTimes = [30, 60, 120, 300, 600];
  const requiredWaitTime = waitTimes[Math.min(requestCount - 1, waitTimes.length - 1)] * 1000;
  
  if (timeSinceCreation < requiredWaitTime) {
    return {
      canRequest: false,
      waitTime: Math.ceil((requiredWaitTime - timeSinceCreation) / 1000),
      reason: 'rate_limit'
    };
  }
  
  return { canRequest: true, waitTime: 0 };
};

module.exports = mongoose.model('OTP', otpSchema);