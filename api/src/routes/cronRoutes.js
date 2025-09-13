const express = require('express');
const router = express.Router();

const { sendReminderNotifications } = require('../services/habitService');
const { notifyDailyPrompt } = require('../services/journalService');
const { sendMorningQuotes, generateNightlyQuotes } = require('../services/motivationService');
const { sendDueInactivityReminders } = require('../services/inactivityService');

function verifyCronKey(req, res, next) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return res.status(501).json({ success: false, error: 'CRON_SECRET not set' });
  const key = req.query.key || req.headers['x-cron-key'] || '';
  if (key && key === secret) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

router.post('/habit-reminders', verifyCronKey, async (req, res) => {
  try {
    const result = await sendReminderNotifications();
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/journal-prompts', verifyCronKey, async (req, res) => {
  try {
    await notifyDailyPrompt();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/morning-quotes', verifyCronKey, async (req, res) => {
  try {
    const r = await sendMorningQuotes();
    res.json({ success: true, data: r });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/nightly-quotes', verifyCronKey, async (req, res) => {
  try {
    const r = await generateNightlyQuotes();
    res.json({ success: true, data: r });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/inactivity-reminders', verifyCronKey, async (req, res) => {
  try {
    const r = await sendDueInactivityReminders({ batchLimit: 2000 });
    res.json({ success: true, data: r });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

module.exports = router;


