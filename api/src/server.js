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

const apiVersion = process.env.API_VERSION || 'v1';
const apiBasePath = `/api/${apiVersion}`;

const createApp = async () => {

  await connectDB();       
  await bloomFilter.init();
  require('./cron/bloomFilterJob');
  console.log('✅ Initialization complete');

  const app = express();

  // --- SETUP ---
  app.set('trust proxy', 1);

  // --- MIDDLEWARE ---
  app.use(cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
      'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  }));
  app.options('*', cors());

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
    skip: (req) => req.path.endsWith('/health'),
    keyGenerator: (req) => req.ip || req.connection.remoteAddress
  });

  app.use('/api', createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'));
  app.use('/api/*/auth/login', createRateLimiter(15 * 60 * 1000, 5, 'Too many auth attempts'));
  app.use('/api/*/auth/signup', createRateLimiter(15 * 60 * 1000, 5, 'Too many signup attempts'));
  app.use('/api/*/users', createRateLimiter(60 * 1000, 30, 'Too many user searches'));
  app.use('/api/*/explore/search', createRateLimiter(60 * 1000, 30, 'Too many search requests'));

  app.use(compression());
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static('src/uploads'));

  const apiRouter = express.Router();

  apiRouter.get('/health', (req, res) => {
    console.log("✅ /health hit");
    res.status(200).json({
      status: 'success',
      message: 'WishTrail API is running!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: apiVersion
    });
  });

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/goals', goalRoutes);
  apiRouter.use('/social', socialRoutes);
  apiRouter.use('/activities', activityRoutes);
  apiRouter.use('/leaderboard', leaderboardRoutes);
  apiRouter.use('/explore', exploreRoutes);
  apiRouter.use('/upload', uploadRoutes);
  apiRouter.use('/location', locationRoutes);

  app.use(apiBasePath, apiRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
