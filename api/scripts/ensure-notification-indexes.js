// Run from api/: node scripts/ensure-notification-indexes.js
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  for (const name of ['ScheduledNotificationDelivery', 'NotificationPushBudget', 'Notification', 'DailyLogsEntry', 'DeviceToken']) {
    await require(`../src/models/${name}`).createIndexes();
    console.log(`Ensured indexes: ${name}`);
  }
})().catch(error => { console.error(error.code || error.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
