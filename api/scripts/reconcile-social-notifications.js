// Run during rollout, with the normal API database environment:
// node scripts/reconcile-social-notifications.js --apply
// Retains superseded history, sends no pushes, and is safe to repeat.
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Use --apply to reconcile social notification history against current relationships.');
    return;
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const recipients = await require('../src/migrations/socialNotificationDeployment').backfill();
  console.log(`Reconciled ${recipients} recipients; no pushes sent.`);
}

main().catch(error => { console.error(error.code || error.name); process.exitCode = 1; })
  .finally(async () => {
    await mongoose.disconnect();
    // PostgreSQL is opened lazily by reconciliation.
    if (require.cache[require.resolve('../src/config/supabase')]) await require('../src/config/supabase').pool.end();
  });
