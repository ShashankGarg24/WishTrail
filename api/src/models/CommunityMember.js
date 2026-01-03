const mongoose = require('mongoose');

const communityMemberSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'removed'],
    default: 'active'
  },
  joinedAt: { type: Date, default: Date.now },
  currentStreak: { type: Number, default: 0, min: 0 },
  longestStreak: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommunityMember', communityMemberSchema);


