const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', adminController.login);

router.use(requireAdminAuth);

router.get('/users', adminController.getUsers);
router.get('/goals', adminController.getGoals);
router.get('/habits', adminController.getHabits);
router.get('/analytics', adminController.getAnalytics);
router.post('/email/send', adminController.sendEmail);
router.get('/product-updates', adminController.getProductUpdates);
router.post('/product-updates', adminController.createProductUpdate);
router.put('/product-updates/:version', adminController.updateProductUpdate);
router.delete('/product-updates/:version', adminController.deleteProductUpdate);

module.exports = router;
