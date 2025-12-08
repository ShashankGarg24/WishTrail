# Web Push Notifications Setup Guide

This guide explains how to set up web browser push notifications for WishTrail using Firebase Cloud Messaging (FCM).

## Overview

Your application now supports web push notifications that work similarly to your mobile notifications. Users will receive browser notifications for:
- Likes (activity, comment, goal)
- Comments and replies
- Follow requests and new followers
- Mentions
- Habit reminders
- Journal prompts
- Community updates
- And more...

## Prerequisites

1. A Firebase project (can use the same one as your mobile app)
2. Access to Firebase Console
3. Your backend already has FCM configured (service account JSON)

## Setup Steps

### 1. Configure Firebase for Web

#### A. Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one if needed)
3. Click the gear icon ⚙️ next to "Project Overview" and select **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app, click **Add app** and select the web icon `</>`
6. If you already have a web app, click on it to see the config

You'll see a config object like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd..."
};
```

#### B. Get VAPID Key (Web Push Certificate)

1. Still in Firebase Console > Project Settings
2. Go to the **Cloud Messaging** tab
3. Scroll down to **Web configuration**
4. Under **Web Push certificates**, you should see a key pair
5. If you don't have one, click **Generate key pair**
6. Copy the key (it starts with something like `BN...`)

### 2. Update Environment Variables

Create or update your `frontend/.env` file with the Firebase configuration:

```env
# Firebase Web Push Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd...
VITE_FIREBASE_VAPID_KEY=BN...your_vapid_key_here

# Your existing API URL
VITE_API_URL=https://your-api.com
```

**Important Notes:**
- All environment variables for Vite must start with `VITE_`
- Don't commit the `.env` file to git (it should be in `.gitignore`)
- For production, set these variables in your hosting platform (Vercel, Netlify, etc.)

### 3. Install Dependencies

Install Firebase SDK for web:

```bash
cd frontend
npm install firebase
```

### 4. Verify Backend Configuration

Your backend should already have FCM configured for mobile. Ensure these environment variables are set in `api/.env`:

```env
# Option 1: Service Account JSON (as base64 or raw JSON)
FIREBASE_SERVICE_ACCOUNT_B64=your_base64_encoded_service_account_json

# OR Option 2: Path to service account file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# OR Option 3: Raw JSON in env variable
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

The backend already supports web push - it treats web tokens the same as mobile FCM tokens with `platform: 'web'`.

### 5. Test the Setup

#### A. Start Your Development Server

```bash
cd frontend
npm run dev
```

#### B. Test Notifications

1. Open your app in a browser (Chrome, Firefox, Edge - Safari requires additional setup)
2. Log in to your account
3. You should see a browser permission prompt asking to allow notifications
4. Click **Allow**
5. Check the browser console - you should see logs like:
   ```
   [WebPush] Firebase Messaging initialized successfully
   [WebPush] FCM token obtained: ...
   [WebPush] Device registered with backend successfully
   ```

#### C. Trigger a Test Notification

To test if notifications work:

1. Have another user like your activity, comment, or follow you
2. You should receive a browser notification
3. Clicking the notification should navigate to the relevant page

**Manual Test via Backend:**
You can also manually trigger a notification using your backend API or database by creating a notification document for your user.

### 6. Deploy to Production

#### For Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add all the `VITE_FIREBASE_*` variables
4. Redeploy your application

#### For Other Platforms:

Set the environment variables in your platform's dashboard (Netlify, Railway, etc.).

## How It Works

### Architecture Flow

1. **Initialization**: When a user logs in on the web, the app:
   - Initializes Firebase Messaging
   - Requests notification permission
   - Gets an FCM token from Firebase
   - Registers this token with your backend (API)

2. **Receiving Notifications**: When your backend sends a notification:
   - Backend calls FCM with the user's device tokens
   - FCM sends the push notification to the browser
   - If the app is open: Foreground handler shows the notification
   - If the app is closed: Service worker shows the notification

3. **Clicking Notifications**: When user clicks a notification:
   - Service worker handles the click
   - Opens/focuses the app window
   - Navigates to the relevant page (goal, feed, profile, etc.)

### Service Worker

The `frontend/public/sw.js` file is crucial for push notifications:
- Handles notifications when the app is closed/backgrounded
- Manages notification clicks and deep links
- Must be served from the root path (`/sw.js`)

## Notification Permission Flow

The app automatically requests notification permission when:
- User is authenticated
- Not running in the mobile app WebView
- Permission hasn't been previously denied

If the user denies permission, they can re-enable it in their browser settings.

## Browser Support

### Fully Supported:
- Chrome/Edge (Windows, Mac, Android)
- Firefox (Windows, Mac, Android)
- Opera

### Limited/Special Setup:
- Safari (macOS 16.4+, requires APNs certificate)
- Safari on iOS (requires home screen install for PWA)

### Not Supported:
- Internet Explorer
- Older browser versions

## Troubleshooting

### "Firebase not initialized" error

**Problem**: Service account or config is missing.

**Solution**:
1. Verify all `VITE_FIREBASE_*` env variables are set
2. Restart your dev server after adding env variables
3. Check browser console for specific error messages

### No notification permission prompt

**Possible causes**:
- Permission was previously denied - user needs to reset in browser settings
- Running in mobile app WebView (push is disabled there)
- Browser doesn't support notifications

**Solution**:
- Chrome: Settings > Privacy and security > Site Settings > Notifications
- Firefox: Settings > Privacy & Security > Permissions > Notifications

### Notifications not arriving

**Check**:
1. Backend logs - is FCM being called?
2. Browser console - any errors?
3. Token registered - check DeviceToken collection in MongoDB
4. FCM credentials correct on backend
5. Browser is online and has permission

### Service Worker not registering

**Check**:
1. Must be served over HTTPS (or localhost for dev)
2. `sw.js` must be at root path: `domain.com/sw.js`
3. Check for JavaScript errors in service worker (Chrome DevTools > Application > Service Workers)

### Production deployment issues

**Check**:
1. All env variables are set in production
2. Build completed successfully
3. Service worker file is included in the build
4. HTTPS is enabled (required for service workers)

## Best Practices

### 1. Testing in Development

Use Chrome DevTools:
- **Application tab** > Service Workers: See registration status
- **Console**: View push notification logs
- **Application tab** > Notifications: Test notification display

### 2. Rate Limiting

Be mindful of notification frequency:
- The backend already implements smart notification bundling
- Users can configure notification preferences in settings

### 3. Deep Linking

Notifications include deep link URLs that:
- Open specific goals, activities, or profiles
- Work even when the app is closed
- Are handled by the service worker

### 4. Privacy & Permissions

- Request permission at the right time (after user is engaged)
- Respect user's notification settings
- Allow users to disable notifications in app settings

## Security Notes

### Environment Variables

- Never commit `.env` files to git
- Firebase config API key is safe to expose (it's restricted by domain)
- VAPID key is public (it's a public key for web push)
- Keep your Firebase service account JSON secret (backend only)

### Token Management

- Device tokens are automatically refreshed
- Old/invalid tokens are automatically cleaned up
- Tokens are tied to specific users and can be revoked

## Additional Resources

- [Firebase Cloud Messaging Web Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all environment variables are set correctly
3. Test with a different browser
4. Check backend logs for FCM errors
5. Review Firebase Cloud Messaging logs in Firebase Console

---

## Quick Start Checklist

- [ ] Create/access Firebase project
- [ ] Get Firebase web config values
- [ ] Generate VAPID key in Firebase Console
- [ ] Add all `VITE_FIREBASE_*` variables to `.env`
- [ ] Install `firebase` package: `npm install firebase`
- [ ] Restart dev server
- [ ] Test in browser and allow notifications
- [ ] Verify token registration in backend
- [ ] Trigger a test notification
- [ ] Deploy with env variables set in production

That's it! Your web push notifications should now be working. 🎉
