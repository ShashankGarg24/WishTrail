const express = require('express');
const { protect } = require('../middleware/auth');
const moderationController = require('../controllers/moderationController');

const router = express.Router();

router.use(protect);

router.post('/report', moderationController.reportContent);
router.post('/block/:userId', moderationController.blockUser);
router.delete('/block/:userId', moderationController.unblockUser);

module.exports = router;

