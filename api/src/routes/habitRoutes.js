const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const habitController = require('../controllers/habitController');

// All routes require auth
router.use(auth);

// CRUD
router.get('/', habitController.listHabits);
router.post('/', habitController.createHabit);
router.get('/stats', habitController.getStats);
router.get('/analytics', habitController.getAnalytics);
router.get('/:id', habitController.getHabit);
router.put('/:id', habitController.updateHabit);
router.patch('/:id/archive', habitController.archiveHabit);
router.delete('/:id', habitController.deleteHabit);

// Logging
router.post('/:id/log', habitController.toggleLog);
router.get('/:id/heatmap', habitController.getHeatmap);
// Public OG image for milestone share (no auth)
router.get('/:id/og-image', habitController.generateStreakOGImage);

module.exports = router;


