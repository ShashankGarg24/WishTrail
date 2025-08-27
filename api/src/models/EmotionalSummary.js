const mongoose = require('mongoose');

const emotionalSummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['week','month'],
    required: true,
    index: true
  },
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true,
    index: true
  },
  // Aggregated counts
  metrics: {
    helpedCount: { type: Number, default: 0, min: 0 },
    gratitudeCount: { type: Number, default: 0, min: 0 },
    sacrificeCount: { type: Number, default: 0, min: 0 },
    positiveMoments: { type: Number, default: 0, min: 0 },
    entriesCount: { type: Number, default: 0, min: 0 }
  },
  // Generated natural language summary to display
  summaryText: {
    type: String,
    default: ''
  },
  // Milestone badge awarded by this summary, if any
  badge: {
    code: { type: String, default: null },
    label: { type: String, default: null },
    icon: { type: String, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

emotionalSummarySchema.index({ userId: 1, period: 1, periodStart: 1 }, { unique: true });

module.exports = mongoose.model('EmotionalSummary', emotionalSummarySchema);


