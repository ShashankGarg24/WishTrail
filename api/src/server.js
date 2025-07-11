require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const globalErrorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const goalRoutes = require('./routes/goalRoutes');
const socialRoutes = require('./routes/socialRoutes');
const activityRoutes = require('./routes/activityRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const exploreRoutes = require('./routes/exploreRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const locationRoutes = require('./routes/locationRoutes');
const bloomFilter = require('./utility/BloomFilterService');

const app = express();
module.exports = app;

(async () => {
  try {
    // Connect to DB
    connectDB();

    // Initialize Bloom Filter
    await bloomFilter.init();
    // Register cron jobs after Bloom is ready
    require('./cron/bloomFilterJob');

    const app = express();

    app.set('trust proxy', 1);

    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'https://wishtrail.vercel.app/',
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // allow all in dev
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false
    }));

    const createRateLimiter = (windowMs, max, message) => rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      keyGenerator: (req) => req.ip || req.connection.remoteAddress
    });

    const generalLimiter = createRateLimiter(15 * 60 * 1000, process.env.NODE_ENV === 'production' ? 100 : 1000, 'Too many requests');
    const authLimiter = createRateLimiter(15 * 60 * 1000, process.env.NODE_ENV === 'production' ? 5 : 50, 'Too many auth attempts');
    const searchLimiter = createRateLimiter(60 * 1000, process.env.NODE_ENV === 'production' ? 30 : 100, 'Too many search requests');

    app.use('/api', generalLimiter);
    app.use('/api/*/auth/login', authLimiter);
    app.use('/api/*/auth/signup', authLimiter);
    app.use('/api/*/users', searchLimiter);
    app.use('/api/*/explore/search', searchLimiter);

    app.use(compression());

    if (process.env.NODE_ENV === 'development') {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }

    app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf);
        } catch (e) {
          res.status(400).json({ success: false, error: 'Invalid JSON format' });
        }
      }
    }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    app.use('/uploads', express.static('src/uploads'));

    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'WishTrail API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.API_VERSION || 'v1'
      });
    });

    const apiVersion = process.env.API_VERSION || 'v1';
    app.use(`/api/${apiVersion}/auth`, authRoutes);
    app.use(`/api/${apiVersion}/users`, userRoutes);
    app.use(`/api/${apiVersion}/goals`, goalRoutes);
    app.use(`/api/${apiVersion}/social`, socialRoutes);
    app.use(`/api/${apiVersion}/activities`, activityRoutes);
    app.use(`/api/${apiVersion}/leaderboard`, leaderboardRoutes);
    app.use(`/api/${apiVersion}/explore`, exploreRoutes);
    app.use(`/api/${apiVersion}/upload`, uploadRoutes);
    app.use(`/api/${apiVersion}/location`, locationRoutes);

    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(`
🚀 WishTrail API Server running!
📍 Environment: ${process.env.NODE_ENV}
🔗 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
📚 API Base: http://localhost:${PORT}/api/${apiVersion}
      `);
    });

    process.on('unhandledRejection', (err) => {
      console.log('Unhandled Promise Rejection:', err.message);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.log('Uncaught Exception:', err.message);
      process.exit(1);
    });

    module.exports = app;
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();

