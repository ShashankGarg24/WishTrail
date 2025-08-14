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

module.exports = mongoose.model('Block', blockSchema);


