const habitService = require('../services/habitService');

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
    const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === true;
    const habits = await habitService.listHabits(req.user.id || req.user._id, { includeArchived });
    res.status(200).json({ success: true, data: { habits } });
  } catch (error) { next(error); }
};

exports.getHabit = async (req, res, next) => {
  try {
    const habit = await habitService.getHabit(req.user.id || req.user._id, req.params.id);
    res.status(200).json({ success: true, data: { habit } });
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


