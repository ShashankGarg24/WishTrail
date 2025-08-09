const mongoose = require('mongoose');

const activityCommentSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    default: null,
    index: true
  },
  mentionUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

activityCommentSchema.index({ activityId: 1, createdAt: -1 });
activityCommentSchema.index({ parentCommentId: 1, createdAt: 1 });

module.exports = mongoose.model('ActivityComment', activityCommentSchema); 