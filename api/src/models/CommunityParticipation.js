const mongoose = require('mongoose');

// Tracks a user's participation on a community item (goal/habit)
const communityParticipationSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityItem', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['goal', 'habit'], required: true },
  status: { type: String, enum: ['joined', 'left'], default: 'joined', index: true },
  // For individual goals: user's own progress percent
  // For collaborative goals: user's contribution percent toward shared progress
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  lastUpdatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

communityParticipationSchema.index({ communityId: 1, itemId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityParticipation', communityParticipationSchema);


