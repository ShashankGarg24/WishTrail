const express = require('express');
const productUpdateController = require('../controllers/productUpdateController');
const { protect } = require('../middleware/auth');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Public routes
router.get('/', productUpdateController.getAllUpdates);
router.get('/type/:type', productUpdateController.getUpdatesByType);

// Protected routes (authenticated users)
router.get('/latest', protect, productUpdateController.getLatestMajorUpdate);
router.post('/seen', protect, productUpdateController.markUpdateAsSeen);

// Administrative write routes. The Admin Panel uses its separate admin token.
router.post('/', requireAdminAuth, productUpdateController.createUpdate);
router.delete('/:version', requireAdminAuth, productUpdateController.deleteUpdate);

module.exports = router;
