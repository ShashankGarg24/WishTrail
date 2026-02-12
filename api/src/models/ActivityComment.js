const mongoose = require('mongoose');

const activityCommentSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  userId: {
    type: Number,
    required: true
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
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ActivityComment', activityCommentSchema); 