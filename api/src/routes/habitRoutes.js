const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const habitController = require('../controllers/habitController');

// Public route (no auth)
router.get('/:id/og-image', habitController.generateStreakOGImage);

// Authenticated routes
router.use(protect);

// CRUD
router.get('/', habitController.listHabits);
router.post('/', habitController.createHabit);
router.get('/stats', habitController.getStats);
router.get('/:id', habitController.getHabit);
router.put('/:id', habitController.updateHabit);
router.patch('/:id/archive', habitController.archiveHabit);
router.delete('/:id', habitController.deleteHabit);

// Logging
router.post('/:id/log', habitController.toggleLog);
router.get('/:id/heatmap', habitController.getHeatmap);

module.exports = router;


