const mongoose = require('mongoose');

const dailyLogsEntrySchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: false,
    trim: true,
    maxlength: 300,
    default: ''
  },
  mood: {
    type: String,
    enum: ['happy', 'motivated', 'okay', 'stressed', 'sad', 'angry', null],
    default: undefined
  },
  // Denormalized date key for quick daily lookups
  dayKey: {
    type: String
  },

  // AI generated motivation and signal extraction
  ai: {
    motivation: { type: String, default: undefined },
    model: { type: String, default: undefined }
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

dailyLogsEntrySchema.pre('save', function (next) {
  if (!this.dayKey) {
    const d = this.createdAt || new Date();
    const iso = new Date(d.getTime());
    iso.setUTCHours(0, 0, 0, 0);
    this.dayKey = iso.toISOString().split('T')[0];
  }
  next();
});

// Static method to delete notification
dailyLogsEntrySchema.statics.deleteDailyLogsEntry = async function(entryId, userId) {
  try {
    const entry = await this.findOneAndDelete({
      _id: entryId,
      userId
    });

    if (!entry) {
      throw new Error('Daily Log not found');
    }
    
    return entry;
  } catch (error) {
    throw error;
  }
};


module.exports = mongoose.model('dailyLogsEntry', dailyLogsEntrySchema);


