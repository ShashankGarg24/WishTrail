const mongoose = require('mongoose');
const { getFeedConnection } = require('../config/database');

const communityActivitySchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  sourceActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: String,
  avatar: String,
  type: { type: String, required: true, index: true },
  data: {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    goalTitle: String,
    goalCategory: String,
    pointsEarned: Number,
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetUserName: String,
    newLevel: String,
    oldLevel: String,
    streakCount: Number,
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    achievementName: String,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: mongoose.Schema.Types.ObjectId }] }, { _id: false }),
    default: {}
  },
  isActive: { type: Boolean, default: true, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

communityActivitySchema.index({ communityId: 1, createdAt: -1 });
communityActivitySchema.index({ communityId: 1, sourceActivityId: 1 }, { unique: true, sparse: true });
communityActivitySchema.index({ 'data.goalId': 1, createdAt: -1 });

communityActivitySchema.virtual('message').get(function() {
  const messages = {
    'goal_completed': `completed "${this.data.goalTitle}"`,
    'goal_created': `created a new goal "${this.data.goalTitle}"`,
    'user_followed': `started following ${this.data.targetUserName}`,
    'level_up': `leveled up to ${this.data.newLevel}`,
    'streak_milestone': (() => {
      const name = this?.data?.metadata?.habitName;
      return name ? `achieved a ${this.data.streakCount}-day streak on "${name}"` : `achieved a ${this.data.streakCount}-day streak`;
    })(),
    'achievement_earned': `earned the "${this.data.achievementName}" achievement`,
    'goal_liked': `liked "${this.data.goalTitle}"`,
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


