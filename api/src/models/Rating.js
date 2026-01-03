const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  // User who submitted the rating (PostgreSQL user ID)
  userId: {
    type: Number,
    required: [true, 'User ID is required']
  },
  
  // Rating value (1-5 stars)
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5']
  },
  
  // Optional feedback text
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot be more than 1000 characters']
  },
  
  // Platform information
  platform: {
    type: String,
    enum: ['web', 'ios', 'android'],
    default: 'web'
  },
  
  // App version (optional)
  appVersion: {
    type: String
  },
  
  // User agent for web
  userAgent: {
    type: String
  },
  
  // Soft delete flag
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Get average rating
ratingSchema.statics.getAverageRating = async function() {
  const result = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { averageRating: 0, totalRatings: 0 };
};

// Get rating distribution
ratingSchema.statics.getRatingDistribution = async function() {
  const distribution = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Format as object { 1: count, 2: count, ... }
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach(item => {
    result[item._id] = item.count;
  });
  
  return result;
};

// Check if user has already rated
ratingSchema.statics.hasUserRated = async function(userId) {
  const rating = await this.findOne({ userId, isActive: true });
  return !!rating;
};

// Get user's rating
ratingSchema.statics.getUserRating = async function(userId) {
  return await this.findOne({ userId, isActive: true });
};

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
