const Rating = require('../models/Rating');

// @desc    Submit a rating
// @route   POST /api/v1/ratings
// @access  Private
const submitRating = async (req, res, next) => {
  try {
    const { rating, feedback, platform, appVersion } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user has already rated (allow only one rating per user)
    const existingRating = await Rating.findOne({ userId, isActive: true });

    let result;
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.feedback = feedback || '';
      existingRating.platform = platform || 'web';
      existingRating.appVersion = appVersion || '';
      existingRating.userAgent = req.get('user-agent') || '';
      await existingRating.save();
      result = existingRating;
    } else {
      // Create new rating
      result = await Rating.create({
        userId,
        rating,
        feedback: feedback || '',
        platform: platform || 'web',
        appVersion: appVersion || '',
        userAgent: req.get('user-agent') || ''
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        rating: result.rating,
        feedback: result.feedback,
        createdAt: result.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's rating
// @route   GET /api/v1/ratings/me
// @access  Private
const getMyRating = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rating = await Rating.getUserRating(userId);

    res.status(200).json({
      success: true,
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get average rating and stats (Admin only)
// @route   GET /api/v1/ratings/stats
// @access  Private/Admin
const getRatingStats = async (req, res, next) => {
  try {
    const averageData = await Rating.getAverageRating();
    const distribution = await Rating.getRatingDistribution();

    res.status(200).json({
      success: true,
      data: {
        averageRating: averageData.averageRating,
        totalRatings: averageData.totalRatings,
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all ratings (Admin only)
// @route   GET /api/v1/ratings
// @access  Private/Admin
const getAllRatings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, rating: ratingFilter } = req.query;
    
    const query = { isActive: true };
    if (ratingFilter) {
      query.rating = parseInt(ratingFilter);
    }

    const ratings = await Rating.find(query)
      .populate('userId', 'name username email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Rating.countDocuments(query);

    res.status(200).json({
      success: true,
      data: ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a rating (Admin only)
// @route   DELETE /api/v1/ratings/:id
// @access  Private/Admin
const deleteRating = async (req, res, next) => {
  try {
    const rating = await Rating.findById(req.params.id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    rating.isActive = false;
    await rating.save();

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRating,
  getMyRating,
  getRatingStats,
  getAllRatings,
  deleteRating
};
