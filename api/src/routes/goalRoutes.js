const express = require('express');
const { body } = require('express-validator');
const goalController = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

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
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('duration')
    .isIn(['short-term', 'medium-term', 'long-term'])
    .withMessage('Duration must be short-term, medium-term, or long-term'),
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

// All routes are protected
router.use(protect);

// Goal routes
router.get('/', goalController.getGoals);
router.post('/', goalValidation, goalController.createGoal);
router.get('/yearly/:year', goalController.getYearlyGoalsSummary);
router.get('/:id', goalController.getGoal);
router.put('/:id', goalValidation, goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.patch('/:id/toggle', goalController.toggleGoalCompletion);
router.patch('/:id/like', goalController.toggleGoalLike);

module.exports = router; 