const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  avatarUrl: {
    type: String,
    trim: true,
    default: ''
  },
  bannerUrl: {
    type: String,
    trim: true,
    default: ''
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public',
    index: true
  },
  interests: [{ type: String, trim: true }],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  joinCode: {
    type: String,
    trim: true,
    default: ''
  },
  settings: {
    membershipApprovalRequired: { type: Boolean, default: false },
    itemApprovalRequired: { type: Boolean, default: true },
    onlyAdminsCanAddItems: { type: Boolean, default: true },
    notifications: {
      milestones: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true }
    },
    memberLimit: { type: Number, default: 0, min: 0 } // 0 = unlimited (subject to server cap)
  },
  stats: {
    memberCount: { type: Number, default: 1, min: 0, index: true },
    totalPoints: { type: Number, default: 0, min: 0, index: true },
    weeklyActivityCount: { type: Number, default: 0, min: 0, index: true },
    completionRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

communitySchema.index({ name: 1 });
communitySchema.index({ visibility: 1, 'stats.memberCount': -1 });
communitySchema.index({ interests: 1, 'stats.memberCount': -1 });
communitySchema.index({ createdAt: -1 });

communitySchema.virtual('slug').get(function() {
  const base = (this.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return `${base}-${String(this._id).slice(-6)}`;
});

module.exports = mongoose.model('Community', communitySchema);


