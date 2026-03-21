const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const dailyLogsController = require('../controllers/dailyLogsController');

const router = express.Router();

// Get today's prompt
router.get('/prompt', protect, dailyLogsController.getPrompt);

// Create a daily log entry
router.post('/', protect, dailyLogsController.createEntry);

// Update a daily log entry (e.g., mood or visibility)
router.patch('/:entryId', protect, dailyLogsController.updateEntry);

// Delete a daily log entry by id
router.delete('/:entryId', protect, dailyLogsController.clearEntry);

// Get my entries
router.get('/me', protect, dailyLogsController.getMyEntries);
// Export my daily logs
router.get('/export', protect, dailyLogsController.exportMyDailyLogs);

module.exports = router;


