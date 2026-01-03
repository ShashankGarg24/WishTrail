const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: { type: Number, required: true }, // PostgreSQL user ID (integer)
  token: { type: String, required: true },
  platform: { type: String, enum: ['ios', 'android', 'web','unknown'], default: 'unknown' },
  provider: { type: String, enum: ['expo', 'fcm'], default: 'fcm' },
  timezone: { type: String, default: '' },
  timezoneOffsetMinutes: { type: Number, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);


