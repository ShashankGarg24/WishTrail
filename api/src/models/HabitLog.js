const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
    index: true
  },
  // YYYY-MM-DD (UTC) for on-time tracking independent of local time
  dateKey: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['done', 'missed', 'skipped'],
    default: 'done',
    index: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: 400
  },
  mood: {
    type: String,
    enum: ['very_negative','negative','neutral','positive','very_positive'],
    default: 'neutral'
  },
  // Optional journaling link
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  // Track multiple completions per day
  completionCount: {
    type: Number,
    default: 0
  },
  // Timestamps for each completion done on this day
  completionTimes: [{
    type: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

habitLogSchema.index({ userId: 1, habitId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('HabitLog', habitLogSchema);


