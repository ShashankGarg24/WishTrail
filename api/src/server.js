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

// Route modules are required after DB initialization inside createApp
const bloomFilter = require('./utility/BloomFilterService');

const apiVersion = process.env.API_VERSION || 'v1';
const apiBasePath = `/api/${apiVersion}`;

const createApp = async () => {

  await connectDB();       
  await bloomFilter.init();
  require('./cron/bloomFilterJob');
  require('./cron/journalJobs');
  require('./cron/habitReminderJobs');
  require('./cron/inactivityJobs');
  require('./cron/notificationJobs');
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

  const regexEnv = (process.env.ALLOWED_ORIGIN_REGEX || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowedRegexes = regexEnv.map((pattern) => {
    try { return new RegExp(pattern); } catch { return null; }
  }).filter(Boolean);

  const corsOptions = {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true); // mobile apps / curl
      const isAllowedExact = allowedOrigins.includes(origin);
      const isAllowedRegex = allowedRegexes.some((re) => re.test(origin));
      if (isAllowedExact || isAllowedRegex) return callback(null, true);
      // Do not throw; respond without CORS headers (browser will block)
      return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
      'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers',
      'X-Client-Platform', 'X-Platform'
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

  // app.use('/api', createRateLimiter(15 * 60 * 1000, 500, 'Too many requests, please try again later.'));
  // app.use(/^\/api\/v\d+\/auth\/login$/, createRateLimiter(15 * 60 * 1000, 15, 'Too many login attempts, try again later.'));
  // app.use(/^\/api\/v\d+\/auth\/signup$/, createRateLimiter(15 * 60 * 1000, 15, 'Too many signup attempts, try again later.'));
  // app.use(/^\/api\/v\d+\/users/, createRateLimiter(60 * 1000, 30, 'Too many user requests, slow down.'));
  // // Explore rate limiter removed

  app.use(compression());
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static('src/uploads'));

  // Maintenance mode check
  // Coming soon check (blocks site when enabled)
  app.use(require('./middleware/comingSoon'));

  // Maintenance mode check
  app.use(require('./middleware/maintenanceMode'));

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

  // Lazy require routes after DB connections are ready
  apiRouter.use('/auth', require('./routes/authRoutes'));
  apiRouter.use('/users', require('./routes/userRoutes'));
  apiRouter.use('/goals', require('./routes/goalRoutes'));
  apiRouter.use('/social', require('./routes/socialRoutes'));
  apiRouter.use('/activities', require('./routes/activityRoutes'));
  apiRouter.use('/leaderboard', require('./routes/leaderboardRoutes'));
  // Explore routes removed
  apiRouter.use('/upload', require('./routes/uploadRoutes'));
  apiRouter.use('/location', require('./routes/locationRoutes'));
  apiRouter.use('/journals', require('./routes/journalRoutes'));
  apiRouter.use('/feedback', require('./routes/feedbackRoutes'));
  apiRouter.use('/habits', require('./routes/habitRoutes'));
  apiRouter.use('/moderation', require('./routes/moderationRoutes'));
  apiRouter.use('/notifications', require('./routes/notificationRoutes'));
  apiRouter.use('/communities', require('./routes/communityRoutes'));
  apiRouter.use('/settings', require('./routes/settingsRoutes'));
  // Config management
  apiRouter.use('/config', require('./routes/configRoutes'));
  // Cron endpoints for serverless environments; protect with CRON_SECRET
  apiRouter.use('/cron', require('./routes/cronRoutes'));

  app.use(apiBasePath, apiRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;


// If this file is executed directly (not imported), start the HTTP server.
if (require.main === module) {
  (async () => {
    try {
      const app = await createApp();
      const http = require('http').createServer(app);
      // Socket.IO setup with optional Redis adapter
      const { Server } = require('socket.io');
      const { createAdapter } = require('@socket.io/redis-adapter');
      const IORedis = require('ioredis');
      const allowedOrigins = (() => {
        try {
          const def = ['http://localhost:5173','http://127.0.0.1:5173'];
          const fromEnv = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
            .split(',').map(s => s.trim()).filter(Boolean);
          return Array.from(new Set([...def, ...fromEnv]));
        } catch { return ['*']; }
      })();
      const io = new Server(http, {
        cors: { origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }
      });
      // Redis adapter (optional, requires a TCP Redis URL, not Upstash REST)
      try {
        const redisSocketUrl = process.env.REDIS_SOCKET_URL || process.env.REDIS_URL_CHAT;
        if (redisSocketUrl && /^redis(s)?:\/\//i.test(redisSocketUrl)) {
          const pubClient = new IORedis(redisSocketUrl);
          const subClient = pubClient.duplicate();
          io.adapter(createAdapter(pubClient, subClient));
          console.log('✅ Socket.IO Redis adapter enabled');
        } else {
          console.log('ℹ️ Socket.IO using in-memory adapter (set REDIS_SOCKET_URL for clustering)');
        }
      } catch (e) {
        console.log('ℹ️ Redis adapter not enabled:', e?.message || e);
      }
      io.on('connection', (socket) => {
        socket.on('community:join', (communityId) => {
          try { socket.join(`community:${communityId}`); } catch {}
        });
        socket.on('community:leave', (communityId) => {
          try { socket.leave(`community:${communityId}`); } catch {}
        });
      });
      app.set('io', io);
      try { global.__io = io; } catch {}
      console.log('✅ Socket.IO initialized');

      const port = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);
      const host = '0.0.0.0';
      http.listen(port, host, () => {
        console.log(`🚀 WishTrail API listening on http://${host}:${port} (env=${process.env.NODE_ENV || 'development'})`);
        console.log(`   Health check: /api/${process.env.API_VERSION || 'v1'}/health`);
      });
    } catch (err) {
      console.error('❌ Failed to start server', err);
      process.exit(1);
    }
  })();
}