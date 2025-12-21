const express = require('express');
const { body } = require('express-validator');
const goalController = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');

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
    .isIn(['Health & Fitness', 'Education & Learning', 'Career & Business', 'Personal Development', 'Financial Goals', 'Creative Projects', 'Travel & Adventure', 'Relationships', 'Family & Friends', 'Other'])
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

module.exports = router; 