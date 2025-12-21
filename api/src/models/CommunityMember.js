const mongoose = require('mongoose');

const communityMemberSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'removed'],
    default: 'active',
    index: true
  },
  joinedAt: { type: Date, default: Date.now },
  currentStreak: { type: Number, default: 0, min: 0 },
  longestStreak: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMemberSchema.index({ communityId: 1, role: 1 });

module.exports = mongoose.model('CommunityMember', communityMemberSchema);


