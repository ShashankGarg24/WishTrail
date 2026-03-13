const { logger } = require('./observability');
const mongoose = require('mongoose');

let feedConnection = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wishtrail', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.info('MongoDB disconnected');
    });

    // Initialize secondary (feed) connection
    try {
      const feedUri = process.env.MONGODB_URI_FEED || process.env.MONGODB_URI || 'mongodb://localhost:27017/wishtrail';
      if (!feedConnection) {
        feedConnection = await mongoose.createConnection(feedUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }).asPromise();
        logger.info(`Feed MongoDB Connected: ${feedConnection.host || feedUri}`);
        feedConnection.on('error', (err) => {
          logger.error('Feed MongoDB connection error:', err);
        });
        feedConnection.on('disconnected', () => {
          logger.info('Feed MongoDB disconnected');
        });
      }
    } catch (e) {
      logger.error('Failed to initialize feed DB connection:', e?.message || e);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      try { if (feedConnection) { await feedConnection.close(); logger.info('Feed MongoDB connection closed'); } } catch {}
      process.exit(0);
    });

  } catch (error) {
    logger.error('Database connection failed:', error.message);
    logger.info('⚠️  Server will continue running without database connection');
    logger.info('📝 Please ensure MongoDB is running or update MONGODB_URI in .env file');
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