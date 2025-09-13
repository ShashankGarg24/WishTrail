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
    const windowMinutes = Math.max(1, Math.min(30, Number(req.query.window || 10)));
    setImmediate(async () => {
      try { await sendReminderNotifications({ windowMinutes }); } catch (e) { console.error('[cron] habit-reminders error', e?.message || e); }
    });
    res.status(202).json({ success: true, accepted: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/journal-prompts', verifyCronKey, async (req, res) => {
  try {
    setImmediate(async () => {
      try { await notifyDailyPrompt(); } catch (e) { console.error('[cron] journal-prompts error', e?.message || e); }
    });
    res.status(202).json({ success: true, accepted: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/morning-quotes', verifyCronKey, async (req, res) => {
  try {
    setImmediate(async () => {
      try { await sendMorningQuotes(); } catch (e) { console.error('[cron] morning-quotes error', e?.message || e); }
    });
    res.status(202).json({ success: true, accepted: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/nightly-quotes', verifyCronKey, async (req, res) => {
  try {
    setImmediate(async () => {
      try { await generateNightlyQuotes(); } catch (e) { console.error('[cron] nightly-quotes error', e?.message || e); }
    });
    res.status(202).json({ success: true, accepted: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/inactivity-reminders', verifyCronKey, async (req, res) => {
  try {
    setImmediate(async () => {
      try { await sendDueInactivityReminders({ batchLimit: 2000 }); } catch (e) { console.error('[cron] inactivity-reminders error', e?.message || e); }
    });
    res.status(202).json({ success: true, accepted: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

module.exports = router;


