const express = require('express');
const { body } = require('express-validator');
const goalController = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');
const { GOAL_CATEGORIES } = require('../constants/category');

const router = express.Router();

// Validation rules
const goalValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .isIn(GOAL_CATEGORIES)
    .withMessage('Invalid category'),
  body('targetDate')
    .optional({ checkFalsy: true , nullable: true})
    .isISO8601()
    .withMessage('Target date must be a valid date'),
  body('year')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030')
];

const completeGoalValidation = [
  body('completionNote')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Completion note must be between 10 and 1000 characters')
];

// Multer for completion attachment (image only, 1MB)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg']
  if (!file || allowed.includes(file.mimetype)) return cb(null, true)
  return cb(new Error('Only JPG/JPEG/PNG images are allowed'))
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 1 * 1024 * 1024 } })

// Public routes (no authentication required)
router.get('/:id/share', goalController.getShareableGoal);
router.get('/:id/og-image', goalController.generateOGImage);

// All routes are protected
router.use(protect);

// Goal routes
router.get('/', goalController.getGoals);
router.get('/trending', goalController.getTrendingGoals);
router.get('/search', goalController.searchGoals);
router.get('/:id/analytics', goalController.getGoalAnalytics);
router.get('/:id/post', goalController.getGoalPost);
router.get('/:id/timeline', goalController.getGoalTimeline);
router.get('/:id/dependencies', goalController.checkGoalDependencies);
router.post('/', goalValidation, goalController.createGoal);
router.get('/yearly/:year', goalController.getYearlyGoalsSummary);
router.get('/:id', goalController.getGoal);
router.put('/:id', goalValidation, goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.patch('/:id/like', goalController.toggleGoalLike);

// Goal Division endpoints
router.get('/:id/progress', goalController.getProgress);
router.put('/:id/subgoals', goalController.setSubGoals);
router.patch('/:id/subgoals/:index', goalController.toggleSubGoal);
router.put('/:id/habits', goalController.setHabitLinks);

// Complete/uncomplete goal with optional image attachment
router.patch('/:id/toggle', upload.single('attachment'), async (req, res, next) => {
  try {
    // Enforce file type and size via multer (handled). If too big, multer throws with code LIMIT_FILE_SIZE.
    let attachmentUrl = ''
    if (req.file && req.file.buffer && cloudinaryService.isConfigured()) {
      const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'wishtrail/user/goals' })
      attachmentUrl = url || ''
    }

    // Pass through to controller
    req.body.attachmentUrl = attachmentUrl
    return goalController.toggleGoalCompletion(req, res, next)
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' })
    }
    if (err && /Only JPG|JPEG|PNG/.test(err.message)) {
      return res.status(400).json({ success: false, message: 'Only JPG/JPEG/PNG images are allowed' })
    }
    next(err)
  }
});

// Update goal completion data (note, image, feeling, isPublic)
router.patch('/:id/completion', upload.single('attachment'), async (req, res, next) => {
  try {
    let attachmentUrl = req.body.attachmentUrl || ''; // Default to existing or empty
    let oldImageUrl = '';
    
    // Get existing attachment URL before updating
    const goalDetails = await require('../models/extended/GoalDetails').findOne({ goalId: req.params.id }).lean();
    oldImageUrl = goalDetails?.completionAttachmentUrl || '';
    
    // If new file uploaded, upload to cloudinary
    if (req.file && req.file.buffer && cloudinaryService.isConfigured()) {
      // Upload new image
      const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'wishtrail/user/goals' })
      attachmentUrl = url || ''
    }
    
    // Delete old image from Cloudinary if:
    // 1. User uploaded a new image (different from old), OR
    // 2. User explicitly removed the image (attachmentUrl is empty and there was an old image)
    const shouldDeleteOld = oldImageUrl && 
                           oldImageUrl.includes('cloudinary.com') && 
                           (oldImageUrl !== attachmentUrl || attachmentUrl === '');
    
    if (shouldDeleteOld) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/cloud/image/upload/q_auto,f_auto/v123456/folder/image.jpg
        const urlParts = oldImageUrl.split('/upload/');
        if (urlParts.length > 1) {
          let pathAfterUpload = urlParts[1];
          
          // Remove transformations (q_auto,f_auto/ or similar)
          pathAfterUpload = pathAfterUpload.replace(/^q_auto,f_auto\//, '');
          
          // Remove version (v1234567/)
          pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
          
          // Remove file extension
          const publicId = pathAfterUpload.replace(/\.[^.]+$/, '');
          
          console.log('[updateGoalCompletion] Attempting to delete old image:', publicId);
          const result = await cloudinaryService.destroy(publicId);
          console.log('[updateGoalCompletion] Cloudinary deletion result:', result);
        }
      } catch (deleteError) {
        console.error('[updateGoalCompletion] Failed to delete old image:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    // Pass through to controller
    req.body.attachmentUrl = attachmentUrl
    return goalController.updateGoalCompletion(req, res, next)
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' })
    }
    if (err && /Only JPG|JPEG|PNG/.test(err.message)) {
      return res.status(400).json({ success: false, message: 'Only JPG/JPEG/PNG images are allowed' })
    }
    next(err)
  }
});

module.exports = router; 