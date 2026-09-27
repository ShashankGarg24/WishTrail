const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId: Number, localDate: String, count: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } });
schema.index({ userId: 1, localDate: 1 }, { unique: true });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 86400 });
module.exports = mongoose.model('NotificationPushBudget', schema);
