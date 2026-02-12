const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: Number, required: true }, // PostgreSQL user ID (integer)
  targetType: { type: String, enum: ['user', 'activity'], required: true },
  targetId: { type: mongoose.Schema.Types.Mixed, required: true }, // Mixed: can be ObjectId string (activity) or Number (user)
  reason: { type: String, enum: ['spam', 'harassment', 'nudity', 'hate', 'violence', 'self-harm', 'misinformation', 'other'], required: true },
  description: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open' }
}, { timestamps: true });


module.exports = mongoose.model('Report', reportSchema);


