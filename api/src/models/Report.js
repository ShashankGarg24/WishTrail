const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['user', 'activity'], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, enum: ['spam', 'harassment', 'nudity', 'hate', 'violence', 'self-harm', 'misinformation', 'other'], required: true },
  description: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true }
}, { timestamps: true });

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);


