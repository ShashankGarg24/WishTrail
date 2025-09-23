const express = require('express');
const controller = require('../controllers/featureFlagController');
const router = express.Router();

// Read-only public endpoint to fetch flags
router.get('/', controller.list);

module.exports = router;


