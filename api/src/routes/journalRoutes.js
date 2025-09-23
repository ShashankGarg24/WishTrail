const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const journalController = require('../controllers/journalController');
const { requireFeature } = require('../middleware/featureFlags');

const router = express.Router();

// Get today's prompt
router.get('/prompt', protect, requireFeature('journal'), journalController.getPrompt);

// Create a journal entry
router.post('/', protect, requireFeature('journal'), journalController.createEntry);

// Update a journal entry (e.g., mood or visibility)
router.patch('/:entryId', protect, requireFeature('journal'), journalController.updateEntry);

// Get my entries
router.get('/me', protect, requireFeature('journal'), journalController.getMyEntries);
// Export my journal
router.get('/export', protect, requireFeature('journal'), journalController.exportMyJournal);

// Get user highlights (public/friends/private-aware)
router.get('/highlights/:userId', optionalAuth, requireFeature('journal'), journalController.getUserHighlights);

// Get emotion stats for a profile
router.get('/stats/:userId', optionalAuth, requireFeature('journal'), journalController.getEmotionStats);

module.exports = router;


