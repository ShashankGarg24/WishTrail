const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  submitRating,
  getMyRating,
  getRatingStats,
  getAllRatings,
  deleteRating
} = require('../controllers/ratingController');

// @route   POST /api/v1/ratings
// @desc    Submit a rating
// @access  Private
router.post('/', protect, submitRating);

// @route   GET /api/v1/ratings/me
// @desc    Get user's own rating
// @access  Private
router.get('/me', protect, getMyRating);

// @route   GET /api/v1/ratings/stats
// @desc    Get rating statistics
// @access  Private
router.get('/stats', protect, getRatingStats);

// @route   GET /api/v1/ratings
// @desc    Get all ratings (paginated)
// @access  Private
router.get('/', protect, getAllRatings);

// @route   DELETE /api/v1/ratings/:id
// @desc    Delete a rating
// @access  Private
router.delete('/:id', protect, deleteRating);

module.exports = router;
