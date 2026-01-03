const mongoose = require('mongoose');

// Represents a goal or habit proposed/shared to a community
const communityItemSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  type: { type: String, enum: ['goal', 'habit'], required: true},
  participationType: { type: String, enum: ['individual', 'collaborative'], default: 'individual' }, // goals only
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Goal._id or Habit._id
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  createdBy: { type: Number, required: true }, // PostgreSQL user ID (integer)
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approverId: { type: Number }, // PostgreSQL user ID (integer)
  approvedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  stats: {
    participantCount: { type: Number, default: 0, min: 0 },
    totalCompletions: { type: Number, default: 0, min: 0 },
  }
}, { timestamps: true });

module.exports = mongoose.model('CommunityItem', communityItemSchema);


