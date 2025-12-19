# Google SSO Integration Guide

This guide explains how to set up and use Google Single Sign-On (SSO) for WishTrail.

## Overview

Google SSO allows users to sign in to WishTrail using their Google account, providing:
- **Easy onboarding** - No need to create a new password
- **Faster authentication** - One-click sign in
- **Secure authentication** - Leverages Google's security infrastructure
- **Automatic account creation** - New users are automatically registered

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add your authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - `https://yourdomain.com` (for production)
   - Add your authorized redirect URIs:
     - `http://localhost:5173` (for local development)
     - `https://yourdomain.com` (for production)
   - Click "Create"
5. Copy the **Client ID** that is generated

### 2. Configure Backend

1. Open `api/.env` (create from `api/env.example` if needed)
2. Add your Google Client ID:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
   ```

### 3. Configure Frontend

1. Open `frontend/.env` (create from `frontend/.env.example` if needed)
2. Add your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
   ```

### 4. Install Dependencies

Dependencies have already been installed:
- **Backend**: `google-auth-library` - For verifying Google tokens
- **Frontend**: `@react-oauth/google` - Google OAuth for React

If you need to reinstall:
```bash
# Backend
cd api
npm install google-auth-library

# Frontend
cd frontend
npm install @react-oauth/google
```

## How It Works

### User Flow

1. **User clicks "Continue with Google"** on the login/signup page
2. **Google authentication popup** appears
3. **User selects their Google account** and grants permission
4. **Frontend receives ID token** from Google
5. **Token is sent to backend** for verification
6. **Backend verifies token** with Google and:
   - **Existing user**: Logs them in
   - **New user**: Creates account automatically
7. **User is redirected** to dashboard

### Backend Implementation

The backend (`api/src/services/authService.js`) handles:
- **Token verification**: Uses `google-auth-library` to verify the ID token
- **User lookup**: Checks if user exists by email
- **Auto-registration**: Creates new user account if needed
- **JWT generation**: Issues access and refresh tokens
- **Avatar sync**: Updates user avatar from Google profile picture

### Frontend Implementation

The frontend uses:
- **GoogleOAuthProvider**: Wraps the app to provide Google OAuth context
- **GoogleSignInButton**: Custom component using `@react-oauth/google`
- **AuthPage**: Integrated Google sign-in button with email/password auth

## Features

### Automatic Account Creation
- New users are automatically registered when signing in with Google
- Username is generated from email (e.g., `john.doe@gmail.com` → `johndoe`)
- Profile picture is synced from Google account
- Email is automatically verified

### Security
- ID tokens are verified server-side using Google's public keys
- Random password is generated for Google users (not used for login)
- Same JWT token system used as regular authentication
- Refresh tokens stored securely

### User Experience
- One-click sign in for both new and existing users
- Seamless integration with existing email/password authentication
- Profile completion flow for new Google users
- Avatar automatically synced from Google

## API Endpoints

### POST `/api/v1/auth/google`

Authenticate or register a user using Google OAuth.

**Request Body:**
```json
{
  "token": "google_id_token_here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@gmail.com",
      "username": "johndoe",
      "avatar": "https://lh3.googleusercontent.com/...",
      "googleId": "google_user_id"
    },
    "token": "jwt_access_token",
    "isNewUser": false
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Failed to authenticate with Google. Please try again."
}
```

## Database Schema

The User model includes a `googleId` field:
```javascript
{
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values
  }
}
```

## Troubleshooting

### "Google sign-in failed"
- Verify your Google Client ID is correct in both frontend and backend `.env`
- Check that your domain is added to authorized JavaScript origins in Google Console
- Ensure the Google+ API is enabled in your Google Cloud project

### "Redirect URI mismatch"
- Add your redirect URI to authorized redirect URIs in Google Console
- Make sure the URI exactly matches your frontend URL

### "Token verification failed"
- Ensure `GOOGLE_CLIENT_ID` in backend `.env` matches the frontend
- Check that the token hasn't expired (tokens are short-lived)

### New users not being created
- Check backend logs for errors during user creation
- Verify MongoDB connection is working
- Ensure email service is configured (for welcome emails)

## Testing

### Local Testing
1. Start the backend: `cd api && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173/auth`
4. Click "Continue with Google"
5. Sign in with your Google account
6. Verify you're redirected to the dashboard

### Production Testing
1. Ensure production URLs are added to Google Console
2. Deploy both frontend and backend
3. Test with multiple Google accounts
4. Verify new user registration and existing user login

## Security Considerations

1. **Never commit** `.env` files with real credentials
2. **Use HTTPS** in production for secure token transmission
3. **Rotate secrets** periodically (JWT secret, etc.)
4. **Monitor** Google sign-in logs for suspicious activity
5. **Validate** all user input on the backend
6. **Rate limit** the Google OAuth endpoint to prevent abuse

## Future Enhancements

Potential improvements:
- Add Apple Sign-In for iOS users
- Implement Facebook Login
- Add LinkedIn authentication for professional users
- Support for Microsoft accounts
- Two-factor authentication for Google-authenticated users
- Account linking (connect Google to existing email/password account)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
3. Check backend logs for detailed error messages
4. Ensure all environment variables are set correctly
