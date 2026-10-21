// Run from api/: node scripts/remove-activity-author-snapshots.js
// Idempotent: author identity remains in userId; profiles are read from PostgreSQL.
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('activities').updateMany(
    { $or: [{ name: { $exists: true } }, { username: { $exists: true } }, { avatar: { $exists: true } }] },
    { $unset: { name: '', username: '', avatar: '' } }
  );
  console.log(`Removed author snapshots from ${result.modifiedCount} activities.`);
})().catch(error => { console.error(error.code || error.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
