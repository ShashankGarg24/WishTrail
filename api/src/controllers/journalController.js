const journalService = require('../services/journalService');
const User = require('../models/User');
const JournalEntry = require('../models/JournalEntry');
const PDFDocument = require('pdfkit');
const axios = require('axios');

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

    // Validate date range
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (toDate < fromDate) {
        return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
      }
    }

    const filter = { userId, isActive: true };
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    const entries = await JournalEntry.find(filter).sort({ createdAt: 1 }).lean();
    
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'No journal entries found for the selected date range' });
    }

    if (String(format).toLowerCase() === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const lines = [];
      
      if (String(style).toLowerCase() === 'diary') {
        // Diary style - like an actual journal
        lines.push('═══════════════════════════════════════════════════════════════');
        lines.push(`                    ${user.name}'s Journal`);
        lines.push('═══════════════════════════════════════════════════════════════');
        lines.push('');
        lines.push('');
        
        for (const e of entries) {
          const dt = new Date(e.createdAt);
          const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
          lines.push('───────────────────────────────────────────────────────────────');
          lines.push(`  ${dateStr}`);
          lines.push(`  ${timeStr}`);
          lines.push('───────────────────────────────────────────────────────────────');
          lines.push('');
          
          if (e.promptText) {
            lines.push(`  Prompt: "${e.promptText}"`);
            lines.push('');
          }
          
          // Indent the content for diary feel
          const contentLines = e.content.split('\n');
          contentLines.forEach(line => {
            lines.push(`    ${line}`);
          });
          
          if (includeMot && e.ai?.motivation) {
            lines.push('');
            lines.push('  ✨ Motivation:');
            const motLines = e.ai.motivation.split('\n');
            motLines.forEach(line => {
              lines.push(`    ${line}`);
            });
          }
          
          lines.push('');
          lines.push('');
        }
        
        lines.push('═══════════════════════════════════════════════════════════════');
        lines.push('         This is your journey. Keep growing 🌱');
        lines.push('                    — WishTrail');
        lines.push('═══════════════════════════════════════════════════════════════');
      } else {
        // Simple style - clean and minimal
        lines.push(`${user.name}'s Journal`);
        lines.push(`Exported on ${new Date().toLocaleDateString()}`);
        lines.push('');
        lines.push('─────────────────────────────────────────────────');
        lines.push('');
        
        for (const e of entries) {
          const dt = new Date(e.createdAt).toLocaleString();
          lines.push(`Date: ${dt}`);
          
          if (e.promptText) {
            lines.push(`Prompt: ${e.promptText}`);
          }
          
          lines.push('');
          lines.push(e.content);
          
          if (includeMot && e.ai?.motivation) {
            lines.push('');
            lines.push(`💡 ${e.ai.motivation}`);
          }
          
          lines.push('');
          lines.push('─────────────────────────────────────────────────');
          lines.push('');
        }
        
        lines.push('This is your journey. Keep growing 🌱');
      }
      
      return res.status(200).send(lines.join('\n'));
    }

    // PDF export
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wishtrail-journal-${user.name.replace(/\s+/g, '_')}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const writeCover = async () => {
      const start = entries[0]?.createdAt ? new Date(entries[0].createdAt) : (user.createdAt ? new Date(user.createdAt) : new Date());
      const end = entries[entries.length - 1]?.createdAt ? new Date(entries[entries.length - 1].createdAt) : new Date();
      const range = `${start.toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      // Decorative top border
      if (style === 'diary') {
        doc.moveDown(2);
        const y1 = doc.y;
        doc.save();
        doc.roundedRect(doc.page.margins.left + 50, y1, doc.page.width - 100 - doc.page.margins.left - doc.page.margins.right, 4, 2).fill('#6366f1');
        doc.restore();
        doc.moveDown(3);
      }
      
      // Title & range with classic serif
      doc.font('Times-Bold').fontSize(28).fillColor('#1f2937').text(`${user.name}'s Journal`, { align: 'center' });
      doc.moveDown(0.4);
      doc.font('Times-Italic').fontSize(14).fillColor('#6b7280').text(range, { align: 'center' });
      
      if (style === 'diary') {
        doc.moveDown(0.8);
        doc.font('Times-Roman').fontSize(11).fillColor('#9ca3af').text(`${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}`, { align: 'center' });
      }
      
      doc.moveDown(2.5);
      // Avatar circle
      if (user.avatar) {
        try {
          const resp = await axios.get(user.avatar, { responseType: 'arraybuffer', timeout: 5000, validateStatus: () => true });
          const ctype = String(resp?.headers?.['content-type'] || '');
          if (!(/^image\/(jpeg|png)$/i.test(ctype))) throw new Error('unsupported image');
          const img = Buffer.from(resp.data || Buffer.alloc(0));
          const cx = doc.page.width / 2 - 45;
          const cy = doc.y;
          try { doc.save(); } catch (_) { }
          try {
            doc.circle(cx + 45, cy + 45, 45).clip();
            doc.image(img, cx, cy, { width: 90, height: 90 });
          } catch (_) { }
          try { doc.restore(); } catch (_) { }
          doc.moveDown(5);
        } catch (_) { /* ignore avatar errors */ }
      }
      // Decorative line
      const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const x = doc.page.margins.left;
      const y = doc.y;
      doc.save().lineWidth(2).strokeColor('#6366f1').moveTo(x, y).lineTo(x + w, y).stroke().restore();
      doc.moveDown(2);
    };

    const writeSignature = () => {
      doc.moveDown(5);
      
      if (style === 'diary') {
        // Decorative closing for diary
        const centerY = doc.y;
        doc.save();
        doc.strokeColor('#c7d2fe').lineWidth(2);
        doc.moveTo(doc.page.margins.left + 100, centerY).lineTo(doc.page.margins.left + 220, centerY).stroke();
        doc.restore();
        doc.moveDown(2);
        
        doc.font('Times-BoldItalic').fontSize(18).fillColor('#4338ca').text('Your Journey Continues...', { align: 'center' });
        doc.moveDown(1);
        doc.font('Times-Italic').fontSize(14).fillColor('#6b7280').text('Keep growing 🌱', { align: 'center' });
        doc.moveDown(3);
        doc.font('Times-Roman').fontSize(11).fillColor('#9ca3af').text('— WishTrail', { align: 'center' });
        
        doc.moveDown(2);
        doc.save();
        doc.strokeColor('#c7d2fe').lineWidth(2);
        doc.moveTo(doc.page.margins.left + 100, doc.y).lineTo(doc.page.margins.left + 220, doc.y).stroke();
        doc.restore();
      } else {
        // Simple closing
        doc.font('Times-Bold').fontSize(16).fillColor('#111').text('This is your journey. Keep growing 🌱', { align: 'center' });
        doc.moveDown(3);
        doc.font('Times-Roman').fontSize(11).fillColor('#6b7280').text('— WishTrail', { align: 'center' });
      }
    };

    const writeEntry = (e) => {
      const dt = new Date(e.createdAt);
      if (style === 'diary') {
        // Diary style - like an actual journal entry (full page per entry)
        const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Start from a consistent position
        doc.y = doc.page.margins.top + 60;
        
        // Decorative top border (centered)
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const centerX = doc.page.margins.left + pageWidth / 2;
        const lineY = doc.y;
        doc.save();
        doc.strokeColor('#c7d2fe').lineWidth(2);
        doc.moveTo(centerX - 240, lineY).lineTo(centerX + 240, lineY).stroke();
        doc.strokeColor('#818cf8').lineWidth(1);
        doc.moveTo(centerX - 240, lineY + 4).lineTo(centerX + 240, lineY + 4).stroke();
        doc.restore();
        doc.moveDown(1.2);
        
        // Date with handwritten style (centered)
        doc.font('Times-Bold').fontSize(14).fillColor('#4338ca').text(dateStr, { align: 'center' });
        doc.font('Times-Roman').fontSize(10).fillColor('#6b7280').text(timeStr, { align: 'center' });
        doc.moveDown(1.5);
        
        // Prompt in decorative box
        if (e.promptText) {
          const promptY = doc.y;
          doc.save();
          doc.roundedRect(doc.page.margins.left + 30, promptY - 2, pageWidth - 60, 35, 6).fillAndStroke('#fef3c7', '#fbbf24');
          doc.restore();
          doc.font('Times-Italic').fontSize(11).fillColor('#92400e').text(`"${e.promptText}"`, doc.page.margins.left + 40, promptY + 8, { width: pageWidth - 80, align: 'center' });
          doc.moveDown(2);
        }
        
        // Content with handwritten feel (better spacing for full page)
        const contentY = doc.y;
        doc.font('Times-Roman').fontSize(12).fillColor('#1f2937').text(e.content, { 
          align: 'justify', 
          lineGap: 4,
          width: pageWidth - 40,
          indent: 20
        });
        
        // Motivation section with decorative element
        if (includeMot && e.ai?.motivation) {
          doc.moveDown(1.5);
          const motY = doc.y;
          const motHeight = Math.min(80, doc.heightOfString(e.ai.motivation, { width: pageWidth - 100 }) + 20);
          
          // Decorative background box
          doc.save();
          doc.roundedRect(doc.page.margins.left + 20, motY, pageWidth - 40, motHeight, 8).fillAndStroke('#f3e8ff', '#c084fc');
          doc.restore();
          
          doc.font('Times-BoldItalic').fontSize(11).fillColor('#6d28d9').text('✨ Daily Motivation', doc.page.margins.left + 35, motY + 10);
          doc.moveDown(0.5);
          doc.font('Times-Italic').fontSize(11).fillColor('#4c1d95').text(e.ai.motivation, doc.page.margins.left + 35, doc.y, { 
            width: pageWidth - 70,
            lineGap: 2
          });
        }
        
        // Bottom decorative element (at bottom of page)
        const bottomY = doc.page.height - doc.page.margins.bottom - 40;
        doc.save();
        doc.strokeColor('#e0e7ff').lineWidth(0.8);
        for (let i = 0; i < 3; i++) {
          doc.moveTo(centerX - 50, bottomY + i * 3).lineTo(centerX + 50, bottomY + i * 3).stroke();
        }
        doc.restore();
      } else {
        // Simple style - clean and minimal
        const header = dt.toLocaleString();
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#111').text(`${header}`);
        doc.moveDown(0.3);
        
        if (e.promptText) {
          doc.font('Helvetica-Oblique').fontSize(10).fillColor('#6b7280').text(`Prompt: ${e.promptText}`);
          doc.moveDown(0.4);
        }
        
        doc.font('Helvetica').fontSize(11).fillColor('#374151').text(e.content);
        
        if (includeMot && e.ai?.motivation) {
          doc.moveDown(0.4);
          doc.font('Helvetica-Oblique').fontSize(10).fillColor('#059669').text(`💡 ${e.ai.motivation}`);
        }
        
        doc.moveDown(1.0);
        // Simple separator
        doc.save();
        doc.strokeColor('#e5e7eb').lineWidth(0.5);
        doc.moveTo(doc.x, doc.y).lineTo(doc.x + 450, doc.y).stroke();
        doc.restore();
        doc.moveDown(0.5);
      }
    };

    // Decorated content pages (header/footer/lines)
    let inContent = false;
    let pageNo = 0;
    const decoratePage = () => {
      if (!inContent) return;
      pageNo += 1;
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const top = doc.page.margins.top;
      const bottom = doc.page.height - doc.page.margins.bottom;
      doc.save();
      
      if (style === 'diary') {
        // Minimal header/footer for diary style to keep it clean
        doc.font('Times-Roman').fontSize(8).fillColor('#9ca3af').text(`${user.name}'s Journal`, left, top - 25, { width: right - left, align: 'center' });
        doc.font('Times-Roman').fontSize(8).fillColor('#d1d5db').text(`${pageNo}`, left, bottom + 8, { width: right - left, align: 'center' });
      } else {
        // Full decoration for simple style
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(`WishTrail Journal • ${user.name}`, left, top - 30, { width: right - left, align: 'left' });
        doc.font('Helvetica').fontSize(9).fillColor('#9ca3af').text(`${pageNo}`, left, bottom + 6, { width: right - left, align: 'center' });
        // Left margin rule
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(left + 20, top - 10).lineTo(left + 20, bottom - 10).stroke();
        // Lined paper effect
        doc.strokeColor('#eef2f7').lineWidth(0.5);
        for (let y = top + 30; y < bottom - 20; y += 18) {
          doc.moveTo(left, y).lineTo(right, y).stroke();
        }
      }
      
      doc.restore();
      if (style !== 'diary') {
        doc.moveDown(1);
      }
    };
    doc.on('pageAdded', () => { try { decoratePage(); } catch (_) { } });

    // Cover
    await writeCover();
    
    // Start content on new decorated page
    doc.addPage();
    inContent = true;
    
    // Content - each diary entry on its own page for diary style
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      writeEntry(e);
      
      // For diary style, each entry gets its own page
      // For simple style, add page only if content overflows
      if (style === 'diary') {
        // Add new page for next entry (unless it's the last entry)
        if (i < entries.length - 1) {
          doc.addPage();
        }
      } else {
        // Simple style: add page only if near bottom
        if (i < entries.length - 1 && doc.y > doc.page.height - doc.page.margins.bottom - 120) {
          doc.addPage();
        }
      }
    }
    
    // Signature on its own page
    inContent = false;
    doc.addPage();
    writeSignature();
    try { doc.end(); } catch (_) { }
  } catch (error) {
    next(error);
  }
};
