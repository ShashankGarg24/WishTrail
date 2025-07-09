const express = require('express');
const exploreController = require('../controllers/exploreController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Explore routes
router.get('/', exploreController.getExploreFeed);
router.get('/users', exploreController.getSuggestedUsers);
router.get('/categories', exploreController.getTrendingCategories);
router.get('/search', exploreController.searchExplore);

module.exports = router; 