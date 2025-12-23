const habitService = require('../services/habitService');
const { sanitizeHabit, sanitizeHabitForProfile } = require('../utility/sanitizer');

exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, frequency, daysOfWeek, timezone, reminders, goalId, isPublic } = req.body;
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Habit name is required' });
    }
    const habit = await habitService.createHabit(req.user.id || req.user._id, { name, description, frequency, daysOfWeek, timezone, reminders, goalId, isPublic });
    res.status(201).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.listHabits = async (req, res, next) => {
  try {
    // If there's a search query, use search instead
    const searchQuery = req.query.q || req.query.search;
    if (searchQuery) {
      return exports.searchHabits(req, res, next);
    }

    const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === true;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    // Support viewing other users' habits via username query param
    const targetUsername = req.query.username;
    let targetUserId = req.user.id || req.user._id;
    const requestingUsername = req.user.username;
    const requestingUserId = req.user.id || req.user._id;
    
    // Check privacy if viewing another user's habits
    if (targetUsername && targetUsername !== requestingUsername) {
      const User = require('../models/User');
      const Follow = require('../models/Follow');

      const targetUser = await User.findOne({ username: targetUsername }).select('isPrivate areHabitsPrivate isActive _id');
      if (!targetUser || !targetUser.isActive) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if habits are private
      if (targetUser.areHabitsPrivate) {
        return res.status(403).json({
          success: false,
          message: 'This user\'s habits are private'
        });
      }
      
      // Check if profile is private and user is not following
      if (targetUser.isPrivate) {
        const isFollowing = await Follow.isFollowing(requestingUserId, targetUser._id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: 'This profile is private'
          });
        }
      }

      targetUserId = targetUser._id;
    }
    
    const result = await habitService.listHabits(targetUserId, { includeArchived, page, limit });
    
    // ✅ Sanitize habits - use minimal fields for profile view
    if (result.habits && Array.isArray(result.habits)) {
      result.habits = result.habits.map(h => sanitizeHabitForProfile(h));
    }
    
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.searchHabits = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 50 } = req.query;
    const userId = req.user.id || req.user._id;
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    const Habit = require('../models/Habit');
    
    // Build search query
    const searchQuery = {
      userId,
      isArchived: false,
      name: { $regex: q.trim(), $options: 'i' } // Case-insensitive search by name
    };
    
    const [habits, total] = await Promise.all([
      Habit.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Habit.countDocuments(searchQuery)
    ]);
    
    // Sanitize habits
    const sanitizedHabits = habits.map(h => sanitizeHabitForProfile(h));
    
    res.status(200).json({
      success: true,
      data: {
        habits: sanitizedHabits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) { next(error); }
};

exports.getHabit = async (req, res, next) => {
  try {
    const habit = await habitService.getHabit(req.user.id || req.user._id, req.params.id);
    
    // ✅ Sanitize habit - remove __v
    const sanitizedHabit = sanitizeHabit(habit);
    
    res.status(200).json({ success: true, data: { habit: sanitizedHabit } });
  } catch (error) { next(error); }
};

exports.updateHabit = async (req, res, next) => {
  try {
    const habit = await habitService.updateHabit(req.user.id || req.user._id, req.params.id, req.body || {});
    res.status(200).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.archiveHabit = async (req, res, next) => {
  try {
    const habit = await habitService.archiveHabit(req.user.id || req.user._id, req.params.id);
    res.status(200).json({ success: true, data: { habit } });
  } catch (error) { next(error); }
};

exports.checkHabitDependencies = async (req, res, next) => {
  try {
    const dependencies = await habitService.checkHabitDependencies(req.user.id || req.user._id, req.params.id);
    res.status(200).json({ success: true, data: dependencies });
  } catch (error) { next(error); }
};

exports.deleteHabit = async (req, res, next) => {
  try {
    await habitService.deleteHabit(req.user.id || req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Habit deleted' });
  } catch (error) { next(error); }
};

exports.toggleLog = async (req, res, next) => {
  try {
    const { status, note, mood, journalEntryId, date } = req.body || {};
    const log = await habitService.toggleLog(req.user.id || req.user._id, req.params.id, { status, note, mood, journalEntryId, date });
    res.status(200).json({ success: true, data: { log } });
  } catch (error) { next(error); }
};

exports.getHeatmap = async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 3, 12);
    const heatmap = await habitService.getHeatmap(req.user.id || req.user._id, req.params.id, { months });
    res.status(200).json({ success: true, data: { heatmap } });
  } catch (error) { next(error); }
};

exports.getStats = async (req, res, next) => {
  try {
    const stats = await habitService.getStats(req.user.id || req.user._id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) { next(error); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const analytics = await habitService.analytics(req.user.id || req.user._id, { days });
    res.status(200).json({ success: true, data: { analytics } });
  } catch (error) { next(error); }
};

exports.getHabitAnalytics = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 90, 365);
    const analytics = await habitService.getHabitAnalytics(req.user.id || req.user._id, req.params.id, { days });
    res.status(200).json({ success: true, data: { analytics } });
  } catch (error) { next(error); }
};

// Simple OG image for 30-day streak share
exports.generateStreakOGImage = async (req, res, next) => {
  try {
    const { createCanvas } = require('canvas');
    const habitId = req.params.id;
    const count = parseInt(req.query.count) || 30;
    const width = 1200, height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${count}-Day Streak!`, width/2, height/2 - 20);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '32px Arial';
    ctx.fillText('Keep the momentum going', width/2, height/2 + 40);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(canvas.toBuffer('image/png'));
  } catch (e) { next(e); }
};


