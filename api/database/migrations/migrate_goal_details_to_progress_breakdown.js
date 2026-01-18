/**
 * Migration script to move subGoals and habitLinks into progress.breakdown
 * Run this once after deploying the updated code
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wishtrail';

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const GoalDetails = mongoose.connection.collection('goaldetails');
    
    // Find all documents with old structure (having subGoals or habitLinks at top level)
    const cursor = GoalDetails.find({
      $or: [
        { subGoals: { $exists: true } },
        { habitLinks: { $exists: true } }
      ]
    });

    let migratedCount = 0;
    let skippedCount = 0;

    for await (const doc of cursor) {
      try {
        // Skip if already migrated
        if (doc.progress?.breakdown?.subGoals || doc.progress?.breakdown?.habits) {
          console.log(`Skipping goalId ${doc.goalId} - already migrated`);
          skippedCount++;
          continue;
        }

        const subGoals = doc.subGoals || [];
        const habitLinks = doc.habitLinks || [];

        // Prepare new structure
        const updateData = {
          'progress.percent': doc.progress?.percent || 0,
          'progress.breakdown.subGoals': subGoals,
          'progress.breakdown.habits': habitLinks,
          'progress.lastCalculated': new Date()
        };

        // Update document
        await GoalDetails.updateOne(
          { _id: doc._id },
          {
            $set: updateData,
            $unset: {
              subGoals: '',
              habitLinks: ''
            }
          }
        );

        console.log(`Migrated goalId ${doc.goalId} - ${subGoals.length} subgoals, ${habitLinks.length} habits`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating goalId ${doc.goalId}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Migrated: ${migratedCount} documents`);
    console.log(`Skipped: ${skippedCount} documents`);
    console.log(`Total processed: ${migratedCount + skippedCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrate().then(() => {
    console.log('Migration script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = migrate;
