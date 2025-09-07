const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  token: { type: String, required: true, index: true },
  platform: { type: String, enum: ['ios', 'android', 'web','unknown'], default: 'unknown' },
  provider: { type: String, enum: ['expo'], default: 'expo' },
  lastSeenAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);


