const mongoose = require('mongoose');

// Centralized feature flags with per-platform booleans
// Keep extensible for new features and platforms
const featureFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  // Platform-specific toggles
  app: { type: Boolean, default: true },
  web: { type: Boolean, default: true },

  // Optional rollout metadata
  rollout: {
    type: String,
    enum: ['off', 'beta', 'on'],
    default: 'on'
  },
  // Optional target groups (future use)
  audience: {
    type: String,
    enum: ['all', 'staff', 'beta', 'none'],
    default: 'all'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);


