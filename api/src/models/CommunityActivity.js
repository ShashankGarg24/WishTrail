const mongoose = require('mongoose');
const { getFeedConnection } = require('../config/database');

const communityActivitySchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  sourceActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity'},
  userId: { type: Number, required: true }, // PostgreSQL user ID (integer)
  name: String,
  avatar: String,
  type: { type: String, required: true },
  data: {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    goalTitle: String,
    goalCategory: String,
    targetUserId: { type: Number }, // PostgreSQL user ID (integer)
    targetUserName: String,
    streakCount: Number,
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    achievementName: String,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: Number }] }, { _id: false }), // PostgreSQL user IDs
    default: {}
  },
  isActive: { type: Boolean, default: true },
  // TTL for updates: 7 days
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
    index: { expireAfterSeconds: 0 } 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

communityActivitySchema.virtual('message').get(function() {
  const messages = {
    'goal_completed': `completed "${this.data.goalTitle}"`,
    'goal_created': `created a new goal "${this.data.goalTitle}"`,
    'goal_joined': (() => {
      const t = this?.data?.goalTitle || this?.data?.metadata?.habitName || '';
      return t ? `joined "${t}"` : 'joined a goal';
    })(),
    'user_followed': `started following ${this.data.targetUserName}`,
    'streak_milestone': (() => {
      const name = this?.data?.metadata?.habitName;
      return name ? `achieved a ${this.data.streakCount}-day streak on "${name}"` : `achieved a ${this.data.streakCount}-day streak`;
    })(),
    'achievement_earned': `earned the "${this.data.achievementName}" achievement`,
    'goal_liked': `liked "${this.data.goalTitle}"`,
    // Community-specific
    'community_member_joined': 'joined the community',
    'community_item_added': (() => {
      const t = this?.data?.itemTitle || this?.data?.goalTitle || this?.data?.metadata?.habitName || '';
      return t ? `added a new community item "${t}"` : 'added a new community item';
    })(),
  };
  return messages[this.type] || 'performed an activity';
});

// Real-time emit to the community room on save
communityActivitySchema.post('save', function(doc) {
  try {
    const io = (global && global.__io) ? global.__io : null;
    if (!io) return;
    io.to(`community:${doc.communityId}`).emit('community:update:new', { kind: 'update', ...doc.toObject({ virtuals: true }) });
  } catch (_) {}
});

module.exports = getFeedConnection().model('CommunityActivity', communityActivitySchema);


