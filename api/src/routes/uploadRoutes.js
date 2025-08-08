const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinaryService');
const User = require('../models/User');

// Memory storage for serverless
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 1 * 1024 * 1024 } });

// POST /api/v1/upload/avatar - upload profile picture
router.post('/avatar', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    if (!cloudinaryService.isConfigured()) {
      return res.status(500).json({ success: false, message: 'Image service is not configured' });
    }

    const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'wishtrail/user/profile' });
    if (!url) {
      return res.status(500).json({ success: false, message: 'Failed to upload image' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, { avatar: url }, { new: true }).select('-password -refreshToken');

    return res.status(200).json({ success: true, message: 'Avatar updated', data: { url, user } });
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' });
    }
    next(err);
  }
});

module.exports = router; 