const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const journalController = require('../controllers/journalController');

const router = express.Router();

// Get today's prompt
router.get('/prompt', protect, journalController.getPrompt);

// Create a journal entry
router.post('/', protect, journalController.createEntry);

// Update a journal entry (e.g., mood or visibility)
router.patch('/:entryId', protect, journalController.updateEntry);

// Get my entries
router.get('/me', protect, journalController.getMyEntries);
// Export my journal
router.get('/export', protect, journalController.exportMyJournal);

// Get user highlights (public/friends/private-aware)
router.get('/highlights/:userId', optionalAuth, journalController.getUserHighlights);

// Get emotion stats for a profile
router.get('/stats/:userId', optionalAuth, journalController.getEmotionStats);

module.exports = router;


