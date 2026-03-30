const express = require('express');
const syncController = require('../controllers/syncController');

const router = express.Router();

// Public no-auth endpoint for cron or external sync jobs
router.get('/latest', syncController.getLatestSyncData);

module.exports = router;
