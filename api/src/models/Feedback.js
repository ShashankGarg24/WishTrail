const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  emotion: {
    type: String,
    required: [true, 'Emotion rating is required'],
    enum: ['poor', 'fair', 'good', 'great', 'excellent']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message must be 500 characters or less'],
    default: ''
  },
  screenshotUrl: {
    type: String,
    default: ''
  },
  user: {
    id: { type: Number, required: true },
    email: { type: String, default: '' },
    name: { type: String, default: '' }
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Feedback', feedbackSchema);
