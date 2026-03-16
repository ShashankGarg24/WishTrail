const express = require('express');
const productUpdateController = require('../controllers/productUpdateController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', productUpdateController.getAllUpdates);
router.get('/type/:type', productUpdateController.getUpdatesByType);

// Protected routes (authenticated users)
router.get('/latest', protect, productUpdateController.getLatestMajorUpdate);
router.post('/seen', protect, productUpdateController.markUpdateAsSeen);

// Admin routes (would need admin middleware in production)
// For now, using protect middleware - in production add admin check
router.post('/', protect, productUpdateController.createUpdate);
router.delete('/:version', protect, productUpdateController.deleteUpdate);

module.exports = router;
