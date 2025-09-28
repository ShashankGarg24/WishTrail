const mongoose = require('mongoose');

// Represents a goal or habit proposed/shared to a community
const communityItemSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  type: { type: String, enum: ['goal', 'habit'], required: true, index: true },
  participationType: { type: String, enum: ['individual', 'collaborative'], default: 'individual' }, // goals only
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // Goal._id or Habit._id
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  stats: {
    participantCount: { type: Number, default: 0, min: 0 },
    totalCompletions: { type: Number, default: 0, min: 0 },
  }
}, { timestamps: true });

communityItemSchema.index({ communityId: 1, status: 1, createdAt: -1 });
communityItemSchema.index({ communityId: 1, type: 1, 'stats.participantCount': -1 });

module.exports = mongoose.model('CommunityItem', communityItemSchema);


