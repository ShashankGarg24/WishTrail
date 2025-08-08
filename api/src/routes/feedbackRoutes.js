const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const cloudinaryService = require('../services/cloudinaryService');
const { protect } = require('../middleware/auth');

// Multer memory storage (serverless-friendly)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

// Industry-standard 5MB image size limit
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/v1/feedback
router.post('/', protect, upload.single('screenshot'), async (req, res, next) => {
  try {
    const { title, description, status: statusRaw } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    let screenshotUrl = '';
    if (req.file && req.file.buffer && cloudinaryService.isConfigured()) {
      try {
        const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'wishtrail/feedback' });
        if (url) screenshotUrl = url;
      } catch (e) {
        console.error('Cloudinary upload failed:', e.message);
      }
    }

    const feedbackPayload = {
      title,
      description,
      status: (statusRaw || 'To Do'),
      screenshotUrl,
      userEmail: req.user?.email || '',
      createdAt: new Date().toISOString(),
    };

    const webhookUrl = process.env.FEEDBACK_SHEET_WEBHOOK_URL || '';

    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, feedbackPayload, { timeout: 10000 });
      } catch (err) {
        console.error('Failed to post feedback to sheet webhook:', err.message);
        // Continue; still acknowledge receipt
      }
    }

    return res.status(201).json({ success: true, message: 'Feedback submitted', data: feedbackPayload });
  } catch (error) {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 5 MB' });
    }
    next(error);
  }
});

module.exports = router; 