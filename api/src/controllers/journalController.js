const journalService = require('../services/journalService');

exports.getPrompt = async (req, res, next) => {
  try {
    const prompt = journalService.getTodayPrompt();
    res.status(200).json({ success: true, data: { prompt } });
  } catch (error) {
    next(error);
  }
};

exports.createEntry = async (req, res, next) => {
  try {
    const { content, promptKey, visibility, mood, tags } = req.body;
    if (!content || String(content).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }
    const entry = await journalService.createEntry(req.user._id, { content, promptKey, visibility, mood, tags });
    res.status(201).json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
};

exports.updateEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { mood, visibility } = req.body;
    if (!entryId) return res.status(400).json({ success: false, message: 'entryId required' });
    const updated = await journalService.updateEntry(req.user._id, entryId, { mood, visibility });
    res.status(200).json({ success: true, data: { entry: updated } });
  } catch (error) {
    next(error);
  }
};

exports.getMyEntries = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = parseInt(req.query.skip) || 0;
    const entries = await journalService.listMyEntries(req.user._id, { limit, skip });
    // Ensure ai and aiSignals (motivation) are present in response
    res.status(200).json({ success: true, data: { entries } });
  } catch (error) {
    next(error);
  }
};

exports.getUserHighlights = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const limit = Math.min(parseInt(req.query.limit) || 12, 24);
    const viewerId = req.user?._id;
    const highlights = await journalService.getUserHighlights(targetUserId, viewerId, { limit });
    res.status(200).json({ success: true, data: { highlights } });
  } catch (error) {
    next(error);
  }
};

exports.getEmotionStats = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const viewerId = req.user?._id;
    const stats = await journalService.getEmotionStats(targetUserId, viewerId);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};


