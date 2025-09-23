const express = require('express');
const router = express.Router();

const { sendReminderNotifications } = require('../services/habitService');
const { notifyDailyPrompt } = require('../services/journalService');
const { isEnabled } = require('../services/featureFlagService');
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
    if (!(await isEnabled('habits', 'app'))) return res.json({ success: true, skipped: true, reason: 'habits disabled' });
    const windowMinutes = Math.max(1, Math.min(30, Number(req.query.window || 10)));
    const startedAt = Date.now();
    const result = await sendReminderNotifications({ windowMinutes });
    const durationMs = Date.now() - startedAt;
    try { console.log('[cron] habit-reminders', { windowMinutes, durationMs, count: result?.count }); } catch {}
    res.json({ success: true, data: result, durationMs });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/journal-prompts', verifyCronKey, async (req, res) => {
  try {
    if (!(await isEnabled('journal', 'app'))) return res.json({ success: true, skipped: true, reason: 'journal disabled' });
    const startedAt = Date.now();
    await notifyDailyPrompt();
    const durationMs = Date.now() - startedAt;
    try { console.log('[cron] journal-prompts', { durationMs }); } catch {}
    res.json({ success: true, durationMs });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/morning-quotes', verifyCronKey, async (req, res) => {
  try {
    const startedAt = Date.now();
    const r = await sendMorningQuotes();
    const durationMs = Date.now() - startedAt;
    try { console.log('[cron] morning-quotes', { durationMs, count: r?.count }); } catch {}
    res.json({ success: true, data: r, durationMs });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/nightly-quotes', verifyCronKey, async (req, res) => {
  try {
    const startedAt = Date.now();
    const r = await generateNightlyQuotes();
    const durationMs = Date.now() - startedAt;
    try { console.log('[cron] nightly-quotes', { durationMs }); } catch {}
    res.json({ success: true, data: r, durationMs });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

router.post('/inactivity-reminders', verifyCronKey, async (req, res) => {
  try {
    const startedAt = Date.now();
    const r = await sendDueInactivityReminders({ batchLimit: 2000 });
    const durationMs = Date.now() - startedAt;
    try { console.log('[cron] inactivity-reminders', { durationMs }); } catch {}
    res.json({ success: true, data: r, durationMs });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'failed' });
  }
});

module.exports = router;


