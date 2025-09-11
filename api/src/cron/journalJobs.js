const cron = require('node-cron');
const { notifyDailyPrompt, notifyPeriodSummary } = require('../services/journalService');
const { sendMorningQuotes } = require('../services/motivationService');

// Daily at 8 PM local-equivalent using user's timezone handled in service (still run hourly)
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[Cron] Hourly check for daily journal prompt...');
    await notifyDailyPrompt();
    console.log('[Cron] Hourly journal prompt pass done.');
  } catch (e) {
    console.error('[Cron] Daily journal prompt failed:', e);
  }
});

// Hourly: send morning motivation quotes at users' local 08:00
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[Cron] Hourly check for morning motivation quotes...');
    await sendMorningQuotes();
    console.log('[Cron] Morning motivation run done.');
  } catch (e) {
    console.error('[Cron] Morning motivation failed:', e);
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


