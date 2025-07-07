# WishTrail Backend API

Backend API for WishTrail - Dreams. Goals. Progress.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v8.0.0 or higher)
- MongoDB (v4.4 or higher)

### Installation

1. **Clone the repository and navigate to backend**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/wishtrail
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name wishtrail-mongo mongo:latest
   ```

6. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/             # Configuration files
│   │   └── database.js     # Database connection
│   ├── controllers/        # Route controllers
│   │   └── authController.js
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── errorHandler.js # Global error handler
│   │   └── notFoundHandler.js
│   ├── models/             # Mongoose models
│   │   ├── User.js         # User model with gamification
│   │   └── Goal.js         # Goal model with points system
│   ├── routes/             # API routes
│   │   ├── authRoutes.js   # Authentication routes
│   │   ├── userRoutes.js   # User management routes
│   │   ├── goalRoutes.js   # Goal CRUD routes
│   │   ├── socialRoutes.js # Social features routes
│   │   ├── activityRoutes.js # Activity feed routes
│   │   ├── leaderboardRoutes.js # Leaderboard routes
│   │   └── uploadRoutes.js # File upload routes
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── validation/         # Input validation schemas
│   └── server.js           # Express app setup
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── docs/                  # API documentation
├── package.json
└── README.md
```

## 🔧 Technology Stack

### Core Framework
- **Express.js** - Web application framework
- **Node.js** - JavaScript runtime

### Database
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Authentication & Security
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request rate limiting

### File Upload & Storage
- **Multer** - File upload handling
- **Cloudinary** - Cloud image storage (optional)

### Validation & Testing
- **express-validator** - Input validation
- **Jest** - Testing framework
- **Supertest** - HTTP testing

### Development Tools
- **Nodemon** - Development auto-reload
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Morgan** - HTTP request logging

## 🛠 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /signup` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile
- `PUT /change-password` - Change password

### Users (`/api/v1/users`)
- `GET /` - Get all users (with search/pagination)
- `GET /:id` - Get user by ID
- `GET /:id/goals` - Get user's goals
- `GET /:id/activities` - Get user's activities

### Goals (`/api/v1/goals`)
- `GET /` - Get user's goals (with filters)
- `POST /` - Create new goal
- `GET /:id` - Get goal by ID
- `PUT /:id` - Update goal
- `DELETE /:id` - Delete goal
- `PATCH /:id/complete` - Mark goal as complete
- `PATCH /:id/like` - Like/unlike goal

### Social (`/api/v1/social`)
- `POST /follow/:userId` - Follow user
- `DELETE /follow/:userId` - Unfollow user
- `GET /followers` - Get user's followers
- `GET /following` - Get users that user is following

### Activities (`/api/v1/activities`)
- `GET /` - Get activity feed
- `GET /recent` - Get recent activities

### Leaderboard (`/api/v1/leaderboard`)
- `GET /` - Get leaderboard

### Upload (`/api/v1/upload`)
- `POST /avatar` - Upload user avatar

## 🎮 Gamification System

### User Levels
- **🎯 Novice** (0-49 points)
- **🌱 Beginner** (50-99 points)
- **🚀 Intermediate** (100-199 points)
- **💎 Advanced** (200-499 points)
- **⭐ Expert** (500-999 points)
- **🏆 Master** (1000+ points)

### Points Calculation
- **Base Points**: Short-term (10), Medium-term (25), Long-term (50)
- **Priority Multipliers**: High (1.5x), Medium (1.0x), Low (0.7x)
- **Category Bonuses**: Education (+8), Career (+7), Finance (+7), etc.
- **Early Completion Bonus**: +20% if completed before target date
- **Note Quality Bonuses**: 50+ words (+10), 25+ words (+5)

### Goal Duration Enforcement
- **Short-term goals**: 1 day minimum before completion
- **Medium-term goals**: 3 days minimum before completion
- **Long-term goals**: 7 days minimum before completion

### Daily Completion Limit
- Users can complete maximum 3 goals per day
- Tracked per user with localStorage persistence

## 📊 Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  bio: String,
  location: String,
  socialLinks: {
    website: String,
    youtube: String,
    instagram: String
  },
  gamification: {
    totalPoints: Number,
    level: String,
    totalGoals: Number,
    completedGoals: Number,
    currentStreak: Number
  },
  social: {
    followers: [ObjectId],
    following: [ObjectId]
  },
  timestamps: true
}
```

### Goal Model
```javascript
{
  title: String,
  description: String,
  category: String (enum),
  priority: String (enum: low, medium, high),
  duration: String (enum: short-term, medium-term, long-term),
  targetDate: Date,
  year: Number,
  completed: Boolean,
  completedAt: Date,
  completionNote: String,
  canCompleteAfter: Date,
  userId: ObjectId (ref: User),
  likes: [{ userId: ObjectId, likedAt: Date }],
  pointsEarned: Number,
  timestamps: true
}
```

## 🔒 Security Features

- **JWT Authentication** with secure HTTP-only cookies
- **Password Hashing** using bcryptjs with configurable salt rounds
- **Rate Limiting** to prevent abuse
- **Input Validation** using express-validator
- **Security Headers** using Helmet
- **CORS Configuration** for cross-origin requests
- **MongoDB Injection Prevention** through Mongoose

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- authController.test.js
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `FRONTEND_URL` | Frontend application URL | Required |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | `12` |
| `DAILY_COMPLETION_LIMIT` | Daily goal completion limit | `3` |

## 🚀 Deployment

### Using PM2 (Production)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name wishtrail-api

# Monitor
pm2 monit

# Restart
pm2 restart wishtrail-api
```

### Using Docker
```bash
# Build image
docker build -t wishtrail-backend .

# Run container
docker run -d -p 5000:5000 --name wishtrail-api wishtrail-backend
```

## 📚 API Documentation

Once the server is running, visit:
- Health Check: `http://localhost:5000/health`
- API Base: `http://localhost:5000/api/v1`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔮 Future Enhancements

- [ ] Real-time notifications using Socket.io
- [ ] Email notifications for goal reminders
- [ ] Advanced analytics and insights
- [ ] Goal templates and suggestions
- [ ] Team goals and collaboration
- [ ] Integration with third-party apps
- [ ] Mobile push notifications
- [ ] Advanced search and filtering
- [ ] Data export functionality
- [ ] Admin dashboard

## 📞 Support

For support, email support@wishtrail.com or create an issue in this repository. 