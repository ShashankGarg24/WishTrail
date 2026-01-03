const mongoose = require('mongoose');

/**
 * Config model for system-wide settings
 * Stores application configuration flags like maintenance mode
 */
const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Static method to get a config value
configSchema.statics.getValue = async function(key, defaultValue = null) {
  const config = await this.findOne({ key: key.toLowerCase() });
  return config ? config.value : defaultValue;
};

// Static method to set a config value
configSchema.statics.setValue = async function(key, value, updatedBy = null, description = '') {
  const config = await this.findOneAndUpdate(
    { key: key.toLowerCase() },
    { 
      value, 
      updatedBy,
      description
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true 
    }
  );
  return config;
};

// Check if maintenance mode is enabled
configSchema.statics.isMaintenanceMode = async function() {
  return await this.getValue('maintenance_mode', false);
};

module.exports = mongoose.model('Config', configSchema);
