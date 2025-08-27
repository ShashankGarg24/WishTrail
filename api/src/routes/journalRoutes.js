const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const journalController = require('../controllers/journalController');

const router = express.Router();

// Get today's prompt
router.get('/prompt', protect, journalController.getPrompt);

// Create a journal entry
router.post('/', protect, journalController.createEntry);

// Get my entries
router.get('/me', protect, journalController.getMyEntries);

// Get user highlights (public/friends/private-aware)
router.get('/highlights/:userId', optionalAuth, journalController.getUserHighlights);

module.exports = router;


