const cron = require('node-cron');
const { notifyDailyPrompt } = require('../services/journalService');
const { sendMorningQuotes, generateNightlyQuotes } = require('../services/motivationService');

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
    // Send at users' local 08:00; the service filters by hh:mm
    await sendMorningQuotes();
  } catch (e) {
    console.error('[Cron] Morning motivation failed:', e);
  }
});

// Nightly at 01:00 UTC: pre-generate per-user quotes in Redis via LLM
cron.schedule('0 1 * * *', async () => {
  try {
    console.log('[Cron] Generating nightly motivation quotes...');
    await generateNightlyQuotes();
    console.log('[Cron] Nightly motivation quotes generated.');
  } catch (e) {
    console.error('[Cron] Nightly motivation generation failed:', e);
  }
});


