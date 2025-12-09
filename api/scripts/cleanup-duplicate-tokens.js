/**
 * One-time script to clean up duplicate device tokens
 * Run with: node scripts/cleanup-duplicate-tokens.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DeviceToken = require('../src/models/DeviceToken');

async function cleanupDuplicates() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database');

    // Find all tokens grouped by userId and token
    const duplicates = await DeviceToken.aggregate([
      {
        $group: {
          _id: { userId: '$userId', token: '$token' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Found ${duplicates.length} sets of duplicate tokens`);

    let totalRemoved = 0;
    for (const dup of duplicates) {
      // Keep the most recently updated one, delete the rest
      const sorted = dup.docs.sort((a, b) => 
        new Date(b.lastSeenAt || b.updatedAt) - new Date(a.lastSeenAt || a.updatedAt)
      );
      
      const keepId = sorted[0]._id;
      const removeIds = sorted.slice(1).map(d => d._id);
      
      console.log(`Keeping ${keepId}, removing ${removeIds.length} duplicates for user ${dup._id.userId}`);
      
      await DeviceToken.deleteMany({ _id: { $in: removeIds } });
      totalRemoved += removeIds.length;
    }

    console.log(`✅ Cleanup complete! Removed ${totalRemoved} duplicate tokens`);
    
    // Show summary
    const total = await DeviceToken.countDocuments();
    const active = await DeviceToken.countDocuments({ isActive: true });
    console.log(`\nCurrent stats:`);
    console.log(`  Total tokens: ${total}`);
    console.log(`  Active tokens: ${active}`);
    console.log(`  Inactive tokens: ${total - active}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

cleanupDuplicates();
