const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  promptKey: {
    type: String,
    enum: ['smile', 'helped', 'sacrifice', 'grateful', 'freeform'],
    default: 'freeform',
    index: true
  },
  promptText: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  wordCount: {
    type: Number,
    default: 0,
    min: 0
  },
  mood: {
    type: String,
    enum: ['very_negative','negative','neutral','positive','very_positive'],
    default: 'neutral',
    index: true
  },
  tags: [{ type: String, trim: true, maxlength: 32 }],
  visibility: {
    type: String,
    enum: ['private','friends','public'],
    default: 'private',
    index: true
  },
  // For soft-deletion
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Optional lightweight extracted signals for faster aggregation
  signals: {
    helpedSomeone: { type: Boolean, default: false, index: true },
    expressedGratitude: { type: Boolean, default: false, index: true },
    selfSacrifice: { type: Boolean, default: false, index: true },
    positivity: { type: Number, default: 0, min: -5, max: 5, index: true }
  },
  // Denormalized date key for quick daily lookups
  dayKey: {
    type: String,
    index: true
  },

  // AI generated motivation and signal extraction
  ai: {
    motivation: { type: String, default: '' },
    model: { type: String, default: '' }
  },
  aiSignals: {
    helpedCount: { type: Number, default: 0, min: 0 },
    gratitudeCount: { type: Number, default: 0, min: 0 },
    selfSacrificeCount: { type: Number, default: 0, min: 0 },
    positiveCount: { type: Number, default: 0, min: 0 },
    kindnessCount: { type: Number, default: 0, min: 0 },
    resilienceCount: { type: Number, default: 0, min: 0 },
    otherCount: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

journalEntrySchema.index({ userId: 1, createdAt: -1 });
journalEntrySchema.index({ userId: 1, dayKey: 1 }, { unique: false });

journalEntrySchema.pre('save', function(next) {
  if (!this.dayKey) {
    const d = this.createdAt || new Date();
    const iso = new Date(d.getTime());
    iso.setUTCHours(0,0,0,0);
    this.dayKey = iso.toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('JournalEntry', journalEntrySchema);


