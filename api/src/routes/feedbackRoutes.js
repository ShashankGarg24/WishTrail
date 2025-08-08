const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const cloudinaryService = require('../services/cloudinaryService');
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

// POST /api/v1/feedback
router.post('/', protect, upload.single('screenshot'), async (req, res, next) => {
  try {
    const { title, description, status: statusRaw } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
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
      description: description || '',
      status: (statusRaw || 'Open'),
      screenshotUrl,
      userEmail: req.user?.email || '',
      createdAt: new Date().toISOString(),
    };

    const webhookUrl = process.env.FEEDBACK_SHEET_WEBHOOK_URL || '';

    if (webhookUrl) {
      try {
        const resp = await axios.post(webhookUrl, feedbackPayload, { timeout: 10000 });
        console.log('Feedback webhook POST', { status: resp?.status, ok: resp?.status >= 200 && resp?.status < 300 });
      } catch (err) {
        console.error('Failed to post feedback to sheet webhook:', err?.response?.status || err.message);
        // Continue; still acknowledge receipt
      }
    } else {
      console.warn('FEEDBACK_SHEET_WEBHOOK_URL not set. Skipping Google Sheet append.');
    }

    return res.status(201).json({ success: true, message: 'Feedback submitted', data: feedbackPayload });
  } catch (error) {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' });
    }
    next(error);
  }
});

module.exports = router; 