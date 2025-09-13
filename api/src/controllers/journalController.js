const journalService = require('../services/journalService');
const User = require('../models/User');
const JournalEntry = require('../models/JournalEntry');
const PDFDocument = require('pdfkit');

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

// @desc    Export my journal as PDF or text
// @route   GET /api/v1/journals/export?format=pdf|text&style=simple|diary&includeMotivation=true|false&from=&to=
// @access  Private
exports.exportMyJournal = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { format = 'pdf', style = 'diary', includeMotivation = 'true', from, to } = req.query;
    const includeMot = String(includeMotivation) !== 'false';

    const user = await User.findById(userId).select('name avatar createdAt').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const filter = { userId, isActive: true };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const entries = await JournalEntry.find(filter).sort({ createdAt: 1 }).lean();

    if (String(format).toLowerCase() === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const title = `WishTrail Journal of ${user.name}`;
      const lines = [];
      lines.push(`${title}`);
      lines.push('');
      for (const e of entries) {
        const dt = new Date(e.createdAt).toLocaleString();
        lines.push(`=== ${dt} ===`);
        if (e.promptText) lines.push(`[Prompt] ${e.promptText}`);
        lines.push(e.content);
        if (includeMot && e.ai?.motivation) lines.push(`Motivation: ${e.ai.motivation}`);
        lines.push('');
      }
      lines.push('');
      lines.push('This is your journey. Keep growing 🌱');
      return res.status(200).send(lines.join('\n'));
    }

    // PDF export
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wishtrail-journal-${user.name.replace(/\s+/g,'_')}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const writeCover = () => {
      const start = entries[0]?.createdAt ? new Date(entries[0].createdAt) : user.createdAt || new Date();
      const end = entries[entries.length - 1]?.createdAt ? new Date(entries[entries.length - 1].createdAt) : new Date();
      const range = `${start.toLocaleString('en-US', { month: 'short' })}–${end.toLocaleString('en-US', { month: 'short' })} ${end.getFullYear()}`;
      doc.fontSize(22).fillColor('#111').text(`WishTrail Journal of ${user.name}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#666').text(range, { align: 'center' });
      doc.moveDown(1.5);
      // Decorative line
      const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const x = doc.page.margins.left;
      const y = doc.y;
      doc.save().lineWidth(2).strokeColor('#6366f1').moveTo(x, y).lineTo(x + w, y).stroke().restore();
      doc.moveDown(2);
    };

    const writeSignature = () => {
      doc.addPage();
      doc.moveDown(6);
      doc.fontSize(18).fillColor('#111').text('This is your journey. Keep growing 🌱', { align: 'center' });
      doc.moveDown(4);
      doc.fontSize(12).fillColor('#555').text('— WishTrail', { align: 'center' });
    };

    const writeEntry = (e) => {
      const dt = new Date(e.createdAt);
      const header = dt.toLocaleString();
      if (style === 'diary') {
        // Date header box
        doc.roundedRect(doc.x, doc.y, 200, 22, 6).fill('#eef2ff');
        doc.fillColor('#3730a3').fontSize(11).text(header, doc.x + 8, doc.y - 16);
        doc.moveDown(0.8);
        if (e.promptText) {
          doc.fontSize(10).fillColor('#6b7280').text(e.promptText);
          doc.moveDown(0.3);
        }
        doc.fontSize(12).fillColor('#111').text(e.content, { align: 'left' });
        if (includeMot && e.ai?.motivation) {
          doc.moveDown(0.4);
          doc.fontSize(11).fillColor('#065f46').text(`Motivation: ${e.ai.motivation}`);
        }
        doc.moveDown(1.0);
      } else {
        // Simple style
        doc.fontSize(12).fillColor('#111').text(`=== ${header} ===`);
        if (e.promptText) doc.fontSize(10).fillColor('#6b7280').text(`[Prompt] ${e.promptText}`);
        doc.fontSize(12).fillColor('#111').text(e.content);
        if (includeMot && e.ai?.motivation) {
          doc.moveDown(0.3);
          doc.fontSize(11).fillColor('#065f46').text(`Motivation: ${e.ai.motivation}`);
        }
        doc.moveDown(0.8);
      }
    };

    // Cover
    writeCover();
    // Content
    for (const e of entries) {
      writeEntry(e);
      // If we are near page end, add a new page to avoid cutting content abruptly
      if (doc.y > doc.page.height - doc.page.margins.bottom - 120) doc.addPage();
    }
    // Signature
    writeSignature();
    doc.end();
  } catch (error) {
    next(error);
  }
};
