/**
 * Migration script to add search optimization indexes and update existing data
 * Run this script once to optimize search performance
 * 
 * Usage: node scripts/add-search-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Goal = require('../src/models/Goal');
const User = require('../src/models/User');
const Community = require('../src/models/Community');

async function migrateSearchIndexes() {
  try {
    console.log('🚀 Starting search optimization migration...\n');

    // Connect to database
    const dbUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!dbUri) {
      throw new Error('MONGO_URI or DATABASE_URL not found in environment variables');
    }

    await mongoose.connect(dbUri);
    console.log('✅ Connected to database\n');

    // 1. Update goals without titleLower
    console.log('📝 Updating goals with missing titleLower field...');
    const goalsToUpdate = await Goal.find({ 
      $or: [
        { titleLower: { $exists: false } },
        { titleLower: null },
        { titleLower: '' }
      ]
    }).countDocuments();

    console.log(`Found ${goalsToUpdate} goals to update`);

    if (goalsToUpdate > 0) {
      const result = await Goal.updateMany(
        { 
          $or: [
            { titleLower: { $exists: false } },
            { titleLower: null },
            { titleLower: '' }
          ]
        },
        [
          { $set: { titleLower: { $toLower: '$title' } } }
        ]
      );
      console.log(`✅ Updated ${result.modifiedCount} goals with titleLower\n`);
    } else {
      console.log('✅ All goals already have titleLower\n');
    }

    // 2. Verify and create indexes
    console.log('🔍 Creating/verifying indexes...\n');

    // Goal indexes
    console.log('Creating Goal indexes...');
    await Goal.createIndexes();
    console.log('✅ Goal indexes created\n');

    // User indexes
    console.log('Creating User indexes...');
    await User.createIndexes();
    console.log('✅ User indexes created\n');

    // Community indexes
    console.log('Creating Community indexes...');
    await Community.createIndexes();
    console.log('✅ Community indexes created\n');

    // 3. Display index information
    console.log('📊 Current indexes:\n');
    
    const goalIndexes = await Goal.collection.getIndexes();
    console.log('Goal indexes:', Object.keys(goalIndexes).join(', '));
    
    const userIndexes = await User.collection.getIndexes();
    console.log('User indexes:', Object.keys(userIndexes).join(', '));
    
    const communityIndexes = await Community.collection.getIndexes();
    console.log('Community indexes:', Object.keys(communityIndexes).join(', '));
    
    console.log('\n✅ Search optimization migration completed successfully!');
    console.log('\n💡 Tips:');
    console.log('  - User search: Fast lookup by name, username, and interests');
    console.log('  - Goal search: Fast lookup by title, category, and completion status');
    console.log('  - Community search: Full-text search on name and description');
    console.log('  - All searches use compound indexes for optimal performance\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
}

// Run migration
migrateSearchIndexes();
