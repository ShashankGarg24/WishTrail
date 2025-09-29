const mongoose = require('mongoose');

let feedConnection = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wishtrail', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Initialize secondary (feed) connection
    try {
      const feedUri = process.env.MONGODB_URI_FEED || process.env.MONGODB_URI || 'mongodb://localhost:27017/wishtrail';
      if (!feedConnection) {
        feedConnection = await mongoose.createConnection(feedUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }).asPromise();
        console.log(`Feed MongoDB Connected: ${feedConnection.host || feedUri}`);
        feedConnection.on('error', (err) => {
          console.error('Feed MongoDB connection error:', err);
        });
        feedConnection.on('disconnected', () => {
          console.log('Feed MongoDB disconnected');
        });
      }
    } catch (e) {
      console.error('Failed to initialize feed DB connection:', e?.message || e);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      try { if (feedConnection) { await feedConnection.close(); console.log('Feed MongoDB connection closed'); } } catch {}
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('⚠️  Server will continue running without database connection');
    console.log('📝 Please ensure MongoDB is running or update MONGODB_URI in .env file');
    // Don't exit process - allow server to run without database for development
  }
};

const getFeedConnection = () => {
  if (!feedConnection || feedConnection.readyState !== 1) {
    throw new Error('Feed DB not initialized. Verify MONGODB_URI_FEED (URL-encode credentials and include a database name).');
  }
  return feedConnection;
};

module.exports = connectDB;
module.exports.getFeedConnection = getFeedConnection;