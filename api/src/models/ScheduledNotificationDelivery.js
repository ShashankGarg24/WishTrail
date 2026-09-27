const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: Number, required: true },
  notificationType: { type: String, required: true },
  localDate: { type: String, required: true },
  status: { type: String, enum: ['CLAIMED', 'SENT', 'FAILED'], required: true },
  attemptCount: { type: Number, default: 1 },
  claimedAt: { type: Date, required: true },
  claimToken: { type: String, required: true },
  sentAt: Date,
  retryable: { type: Boolean, default: true },
  lastErrorCode: String
}, { timestamps: true });
schema.index({ userId: 1, notificationType: 1, localDate: 1 }, { unique: true, name: 'scheduled_delivery_daily_unique' });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 86400, name: 'scheduled_delivery_retention' });
module.exports = mongoose.model('ScheduledNotificationDelivery', schema);
