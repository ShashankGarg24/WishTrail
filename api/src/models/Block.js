const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  blockedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

blockSchema.statics.blockUser = async function(blockerId, blockedId) {
  if (String(blockerId) === String(blockedId)) throw new Error('Cannot block yourself');
  const existing = await this.findOne({ blockerId, blockedId });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return existing;
  }
  const doc = new this({ blockerId, blockedId, isActive: true });
  return await doc.save();
};

blockSchema.statics.unblockUser = async function(blockerId, blockedId) {
  const existing = await this.findOne({ blockerId, blockedId });
  if (!existing) return null;
  if (existing.isActive) {
    existing.isActive = false;
    await existing.save();
  }
  return existing;
};

blockSchema.statics.isBlockedBetween = async function(userA, userB) {
  const [aBlocksB, bBlocksA] = await Promise.all([
    this.findOne({ blockerId: userA, blockedId: userB, isActive: true }).lean(),
    this.findOne({ blockerId: userB, blockedId: userA, isActive: true }).lean()
  ]);
  return !!(aBlocksB || bBlocksA);
};

// Returns two arrays of ObjectIds: users current user blocked (outgoing) and users who blocked current user (incoming)
blockSchema.statics.getBlockedSets = async function(userId) {
  const [outgoing, incoming] = await Promise.all([
    this.find({ blockerId: userId, isActive: true }).select('blockedId').lean(),
    this.find({ blockedId: userId, isActive: true }).select('blockerId').lean()
  ]);
  const blockedOut = outgoing.map(d => d.blockedId);
  const blockedIn = incoming.map(d => d.blockerId);
  return { blockedOut, blockedIn };
};

module.exports = mongoose.model('Block', blockSchema);


