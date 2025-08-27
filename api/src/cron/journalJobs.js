const cron = require('node-cron');
const { notifyDailyPrompt, notifyPeriodSummary } = require('../services/journalService');

// Daily at 8 PM UTC - gentle journal prompt
cron.schedule('0 20 * * *', async () => {
  try {
    console.log('[Cron] Sending daily journal prompt...');
    await notifyDailyPrompt();
    console.log('[Cron] Daily journal prompt sent.');
  } catch (e) {
    console.error('[Cron] Daily journal prompt failed:', e);
  }
});

// Weekly on Monday 9 AM UTC
cron.schedule('0 9 * * 1', async () => {
  try {
    console.log('[Cron] Generating weekly emotional summaries...');
    await notifyPeriodSummary('week');
    console.log('[Cron] Weekly emotional summaries generated.');
  } catch (e) {
    console.error('[Cron] Weekly summary failed:', e);
  }
});

// Monthly on the 1st at 9 AM UTC
cron.schedule('0 9 1 * *', async () => {
  try {
    console.log('[Cron] Generating monthly emotional summaries...');
    await notifyPeriodSummary('month');
    console.log('[Cron] Monthly emotional summaries generated.');
  } catch (e) {
    console.error('[Cron] Monthly summary failed:', e);
  }
});


