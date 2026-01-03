const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  promptKey: {
    type: String,
    enum: ['smile', 'helped', 'sacrifice', 'grateful', 'freeform'],
    default: 'freeform'
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
    enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'],
    default: 'neutral'
  },
  tags: [{ type: String, trim: true, maxlength: 32 }],
  visibility: {
    type: String,
    enum: ['private', 'friends', 'public'],
    default: 'private'
  },
  // For soft-deletion
  isActive: {
    type: Boolean,
    default: true
  },
  // Denormalized date key for quick daily lookups
  dayKey: {
    type: String
  },

  // AI generated motivation and signal extraction
  ai: {
    motivation: { type: String, default: '' },
    model: { type: String, default: '' }
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

journalEntrySchema.pre('save', function (next) {
  if (!this.dayKey) {
    const d = this.createdAt || new Date();
    const iso = new Date(d.getTime());
    iso.setUTCHours(0, 0, 0, 0);
    this.dayKey = iso.toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('JournalEntry', journalEntrySchema);


