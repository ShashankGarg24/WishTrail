const mongoose = require('mongoose');

const activityCommentSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  userId: {
    type: String, // Changed to String to support PostgreSQL user IDs
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityComment',
    default: null
  },
  mentionUserId: {
    type: String, // Changed to String to support PostgreSQL user IDs
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
activityCommentSchema.index({ activityId: 1, createdAt: -1 });
activityCommentSchema.index({ parentCommentId: 1 });

module.exports = mongoose.model('ActivityComment', activityCommentSchema); 