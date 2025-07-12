# WishTrail Project Directory Structure

## Root Structure
```
wishtrail/
├── backend/                    # Node.js/Express API server
├── frontend/                   # React/Vite frontend application
├── README.md                   # Project overview and setup instructions
├── vercel.json                 # vercel config for project 
└── .gitignore                  # Git ignore patterns
```

## Backend (API) Structure
```
backend/
├── docs/                       # API documentation
│   └── DATABASE_SCHEMAS.md     # Database schema documentation
├── src/                        # Source code
│   ├── config/                 # Configuration files
│   │   └── database.js         # Database connection configuration
│   ├── controllers/            # Request handlers
│   │   ├── activityController.js    # Activity management endpoints
│   │   ├── authController.js        # Authentication endpoints
│   │   ├── goalController.js        # Goal management endpoints
│   │   ├── leaderboardController.js # Leaderboard endpoints
│   │   ├── socialController.js      # Social features endpoints
│   │   └── userController.js        # User management endpoints
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # Authentication middleware
│   │   ├── errorHandler.js     # Global error handling
│   │   └── notFoundHandler.js  # 404 error handling
│   ├── models/                 # Database models (MongoDB/Mongoose)
│   │   ├── Achievement.js      # Achievement model
│   │   ├── Activity.js         # Activity model
│   │   ├── Follow.js           # Follow relationship model
│   │   ├── Goal.js             # Goal model
│   │   ├── Like.js             # Like model
│   │   ├── Notification.js     # Notification model
│   │   ├── User.js             # User model
│   │   └── UserAchievement.js  # User achievement junction model
│   ├── routes/                 # API route definitions
│   │   ├── activityRoutes.js   # Activity-related routes
│   │   ├── authRoutes.js       # Authentication routes
│   │   ├── goalRoutes.js       # Goal management routes
│   │   ├── leaderboardRoutes.js # Leaderboard routes
│   │   ├── socialRoutes.js     # Social features routes
│   │   ├── uploadRoutes.js     # File upload routes
│   │   └── userRoutes.js       # User management routes
│   ├── services/               # Business logic services
│   ├── utils/                  # Utility functions
│   ├── validation/             # Input validation schemas
│   ├── uploads/                # File upload storage
│   │   ├── avatars/            # User avatar uploads
│   │   └── temp/               # Temporary file storage
│   └── server.js               # Main server entry point
├── tests/                      # Test files
│   ├── integration/            # Integration tests
│   └── unit/                   # Unit tests
├── package.json                # Node.js dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── env.example                 # Environment variable template
└── README.md                   # Backend setup instructions
```

## Frontend Structure
```
frontend/
├── src/                        # Source code
│   ├── components/             # Reusable React components
│   │   ├── ActivityFeed.jsx    # Activity feed component
│   │   ├── BlogBanner.jsx      # Blog banner component
│   │   ├── CelebrationModal.jsx # Celebration modal
│   │   ├── CompletionModal.jsx  # Task completion modal
│   │   ├── CreateWishModal.jsx  # Wish creation modal
│   │   ├── EditWishModal.jsx    # Wish editing modal
│   │   ├── Footer.jsx          # Site footer
│   │   ├── Header.jsx          # Site header/navigation
│   │   ├── ProfileEditModal.jsx # Profile editing modal
│   │   ├── VideoEmbedGrid.jsx   # Video embedding grid
│   │   └── WishCard.jsx        # Wish display card
│   ├── pages/                  # Page components
│   │   ├── AuthPage.jsx        # Authentication page
│   │   ├── DashboardPage.jsx   # User dashboard
│   │   ├── ExplorePage.jsx     # Explore/discover page
│   │   ├── HomePage.jsx        # Landing page
│   │   ├── LeaderboardPage.jsx # Leaderboard page
│   │   ├── ProfilePage.jsx     # User profile page
│   │   ├── UserProfile.jsx     # Other user profile view
│   │   └── VideoPage.jsx       # Video content page
│   ├── services/               # API service layers
│   │   └── api.js              # API communication functions
│   ├── store/                  # State management
│   │   └── apiStore.js         # Zustand store for API state
│   ├── config/                 # Configuration files
│   │   └── api.js              # API configuration
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── package.json                # Dependencies and build scripts
├── package-lock.json           # Locked dependency versions
├── vite.config.js              # Vite build configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── index.html                  # HTML entry point
├── project_requirement.txt     # Project requirements
└── README.md                   # Frontend setup instructions
```

## Key Features by Directory

### Backend Services
- **Authentication**: JWT-based auth with password reset
- **User Management**: Profiles, achievements, notifications
- **Goals**: CRUD operations for user goals/wishes
- **Social Features**: Following, likes, activity feeds
- **Leaderboards**: User ranking and achievements
- **File Uploads**: Avatar and media file handling

### Frontend Components
- **Modals**: Create/edit wishes, celebrations, profile editing
- **Pages**: Authentication, dashboard, explore, leaderboard
- **Navigation**: Header with authentication state
- **Content**: Activity feeds, video embeds, wish cards
- **State Management**: Zustand for API state and user data

### Configuration Files
- **Backend**: Database connection, environment variables
- **Frontend**: API endpoints, build tools (Vite, Tailwind)
- **Shared**: Package management, testing setup

## Development Workflow
1. **Backend**: Start with `npm run dev` (Express server)
2. **Frontend**: Start with `npm run dev` (Vite development server)
3. **Database**: MongoDB connection via configured URI
4. **Testing**: Unit and integration tests in respective directories
5. **Deployment**: Vercel-ready configuration files 