# 🚀 Google SSO Quick Start Guide

## Prerequisites
- Google Cloud Console account
- WishTrail project set up

## Setup Steps (5 minutes)

### Step 1: Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized origins:
   - `http://localhost:5173`
   - Your production domain
4. Copy the Client ID

### Step 2: Backend Configuration
```bash
cd api
```

Add to `api/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Step 3: Frontend Configuration
```bash
cd frontend
```

Add to `frontend/.env`:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Step 4: Start Servers
```bash
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Test
1. Go to http://localhost:5173/auth
2. Click "Continue with Google"
3. Sign in with Google account
4. Should redirect to dashboard ✅

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token verification failed" | Check Client ID matches in both .env files |
| "Redirect URI mismatch" | Add URL to authorized redirects in Google Console |
| Button not showing | Restart frontend after adding env variables |
| "Cannot read properties" | Verify VITE_GOOGLE_CLIENT_ID is set |

## What's Working?

✅ One-click Google sign-in  
✅ Automatic account creation  
✅ Profile picture sync  
✅ Secure authentication  
✅ JWT token management  
✅ Both light & dark mode  

## API Endpoint

```
POST /api/v1/auth/google
Body: { "token": "google_id_token" }
```

## Files Modified

**Backend:**
- `api/src/services/authService.js` - Auth logic
- `api/src/controllers/authController.js` - Controller
- `api/src/routes/authRoutes.js` - Route
- `api/src/models/User.js` - Schema

**Frontend:**
- `frontend/src/App.jsx` - OAuth Provider
- `frontend/src/pages/AuthPage.jsx` - UI integration
- `frontend/src/components/GoogleSignInButton.jsx` - Button component
- `frontend/src/store/apiStore.js` - State management
- `frontend/src/services/api.js` - API calls

## Need More Help?

See [GOOGLE_SSO_SETUP.md](./GOOGLE_SSO_SETUP.md) for detailed documentation.

---
**Ready to go!** 🎉 Just add your Google Client ID and test it out.
