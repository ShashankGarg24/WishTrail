const { logger } = require('./../config/observability');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');

// Multer memory storage (serverless-friendly)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Only JPG/JPEG/PNG images are allowed'))
}

// Enforce 1 MB image size limit
const upload = multer({ storage, fileFilter, limits: { fileSize: 1 * 1024 * 1024 } });

const MAX_MESSAGE_CHARS = 500

// POST /api/v1/feedback
router.post('/', protect, upload.single('screenshot'), async (req, res, next) => {
  try {
    const { emotion, message } = req.body;

    if (!emotion) {
      return res.status(400).json({ success: false, message: 'Emotion rating is required' });
    }

    const validEmotions = ['poor', 'fair', 'good', 'great', 'excellent'];
    if (!validEmotions.includes(emotion)) {
      return res.status(400).json({ success: false, message: 'Invalid emotion value' });
    }

    if (message && message.trim().length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ success: false, message: `Message must be ${MAX_MESSAGE_CHARS} characters or less` });
    }

    let screenshotUrl = '';
    if (req.file && req.file.buffer && cloudinaryService.isConfigured()) {
      try {
        const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'wishtrail/feedback' });
        if (url) screenshotUrl = url;
      } catch (e) {
        logger.error('Cloudinary upload failed:', e.message);
      }
    }

    const feedbackPayload = {
      emotion,
      message: message || '',
      screenshotUrl,
      user: {
        id: req.user?.id,
        email: req.user?.email || '',
        name: req.user?.name || ''
      }
    };

    await Feedback.create(feedbackPayload);

    return res.status(201).json({ success: true, message: 'Feedback submitted'});
  } catch (error) {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' });
    }
    next(error);
  }
});

module.exports = router; 