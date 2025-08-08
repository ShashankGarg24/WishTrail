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
  const defaultAllowed = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const fromEnv = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultAllowed, ...fromEnv]));

  const corsOptions = {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true); // mobile apps / curl
      const isAllowed = allowedOrigins.includes(origin);
      if (isAllowed) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
      'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'
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
    skip: (req) => req.path.endsWith('/health'),
    keyGenerator: (req) => req.ip || req.connection.remoteAddress
  });

  app.use('/api', createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later.'));
  app.use(/^\/api\/v\d+\/auth\/login$/, createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts, try again later.'));
  app.use(/^\/api\/v\d+\/auth\/signup$/, createRateLimiter(15 * 60 * 1000, 5, 'Too many signup attempts, try again later.'));
  app.use(/^\/api\/v\d+\/users/, createRateLimiter(60 * 1000, 30, 'Too many user requests, slow down.'));
  app.use(/^\/api\/v\d+\/explore\/search$/, createRateLimiter(60 * 1000, 30, 'Too many explore searches, try again later.'));

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
  apiRouter.use('/feedback', require('./routes/feedbackRoutes'));

  app.use(apiBasePath, apiRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
