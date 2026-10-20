const express = require('express');
const { body } = require('express-validator');
const configController = require('../controllers/configController');
const { requireAdminAuth: protect } = require('../middleware/adminAuth');

const router = express.Router();

// Public route - Get maintenance status
router.get('/maintenance', configController.getMaintenanceStatus);

// Product users receive only the eligible rendering payload, never raw Config.
router.get('/active-promotion', require('../middleware/auth').protect, configController.getActivePromotion);

// Protected routes - Admin only (add admin check middleware if available)
router.get('', protect, configController.getAllConfigs);
router.get('/:key', protect, configController.getConfigByKey);

router.post(
  '/',
  protect,
  [
    body('key')
      .trim()
      .notEmpty()
      .withMessage('Key is required'),
    body('value')
      .exists()
      .withMessage('Value is required')
  ],
  configController.upsertConfig
);

router.put(
  '/maintenance',
  protect,
  [
    body('enabled')
      .isBoolean()
      .withMessage('Enabled must be a boolean'),
    body('message')
      .optional()
      .isString()
      .withMessage('Message must be a string')
  ],
  configController.toggleMaintenanceMode
);

router.delete('/:key', protect, configController.deleteConfig);

module.exports = router;
