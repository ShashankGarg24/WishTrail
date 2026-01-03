/**
 * PostgreSQL Services Index
 * Central export point for all PostgreSQL service modules
 */

const pgUserService = require('./pgUserService');
const pgGoalService = require('./pgGoalService');
const pgHabitService = require('./pgHabitService');
const pgHabitLogService = require('./pgHabitLogService');
const pgFollowService = require('./pgFollowService');
const pgLikeService = require('./pgLikeService');
const pgBlockService = require('./pgBlockService');

module.exports = {
  // User operations
  pgUserService,
  
  // Goal operations
  pgGoalService,
  
  // Habit operations
  pgHabitService,
  pgHabitLogService,
  
  // Social operations
  pgFollowService,
  pgLikeService,
  pgBlockService
};
