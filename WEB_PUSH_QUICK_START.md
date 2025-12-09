# Web Push Notifications - Quick Installation Guide

## What Was Added

Your application now supports **web browser push notifications** using Firebase Cloud Messaging (FCM). This works exactly like your mobile app notifications but for web browsers.

## Files Created/Modified

### ✅ Created Files:
1. **`frontend/src/services/webPush.js`** - Core web push service with FCM integration
2. **`frontend/src/components/WebPushSettings.jsx`** - UI component for users to enable notifications
3. **`frontend/src/config/firebase.example.js`** - Example Firebase configuration
4. **`frontend/WEB_PUSH_SETUP.md`** - Complete setup documentation

### ✅ Modified Files:
1. **`frontend/src/services/api.js`** - Added `registerDevice` and `unregisterDevice` endpoints
2. **`frontend/src/App.jsx`** - Added web push initialization on user login
3. **`frontend/public/sw.js`** - Enhanced service worker to handle FCM messages

### ✅ Backend (No Changes Needed):
Your backend already supports FCM for mobile, and the same system works for web! The `DeviceToken` model already accepts `platform: 'web'` and `provider: 'fcm'`.

## Installation Steps

### Step 1: Install Firebase Package

```bash
cd frontend
npm install firebase
```

### Step 2: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (use the same one as mobile app)
3. Go to **Project Settings** → **General**
4. Under "Your apps", find/add a web app
5. Copy the configuration values

### Step 3: Get VAPID Key

1. In Firebase Console → **Project Settings** → **Cloud Messaging**
2. Under "Web Push certificates"
3. Click "Generate key pair" if you don't have one
4. Copy the key

### Step 4: Create Environment File

Create `frontend/.env` (or update existing):

```env
# Firebase Web Push Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# Your existing API URL
VITE_API_URL=https://your-api.com
```

### Step 5: Restart Dev Server

```bash
npm run dev
```

### Step 6: Test It

1. Open the app in a browser
2. Log in
3. Allow notifications when prompted
4. Check console logs for success messages
5. Trigger a test notification (like, comment, follow)

## How to Add Settings UI (Optional)

You can add the `WebPushSettings` component to your settings page:

```jsx
// In frontend/src/components/SettingsModal.jsx or SettingsPage
import WebPushSettings from './WebPushSettings';

// Add this in your settings tabs under "Notifications" section:
<div className="space-y-4">
  <WebPushSettings />
  
  {/* Your existing notification settings */}
  <div>
    <h3>In-App notifications</h3>
    {/* ... existing controls ... */}
  </div>
</div>
```

## What Happens Now?

### When a User Logs In:
1. App initializes Firebase Messaging
2. Requests notification permission (if not already set)
3. Gets FCM token from Firebase
4. Registers token with your backend
5. Sets up foreground message listener

### When a Notification is Sent:
1. Backend creates notification in database
2. Backend calls FCM with user's tokens
3. FCM delivers to all user's devices (web + mobile)
4. Browser shows notification (even if app is closed)
5. Clicking notification opens the app to the relevant page

### Notification Types Supported:
- ✅ Likes (activity, comment, goal)
- ✅ Comments and replies
- ✅ Follow requests and acceptances
- ✅ New followers
- ✅ Mentions
- ✅ Habit reminders
- ✅ Journal prompts
- ✅ Community updates
- ✅ All other notification types in your system

## Browser Support

✅ **Fully Supported:**
- Chrome/Edge (Desktop & Android)
- Firefox (Desktop & Android)
- Opera

⚠️ **Limited Support:**
- Safari (macOS 16.4+, requires APNs)
- Safari iOS (requires PWA install)

❌ **Not Supported:**
- Internet Explorer
- Older browser versions

## Production Deployment

### Vercel:
1. Go to project settings → Environment Variables
2. Add all `VITE_FIREBASE_*` variables
3. Redeploy

### Other Platforms:
Add the environment variables to your platform's dashboard.

## Troubleshooting

### No permission prompt?
- User may have previously denied - check browser notification settings
- Running in mobile app WebView - web push is disabled there

### Notifications not arriving?
- Check browser console for errors
- Verify Firebase config is correct
- Check backend logs for FCM errors
- Ensure user allowed notifications

### Token not registering?
- Check API endpoint is accessible
- Verify user is authenticated
- Check network tab for failed requests

## Security Notes

✅ Safe to expose:
- Firebase API key (domain-restricted)
- VAPID key (it's a public key)
- All VITE_* environment variables

🔒 Keep secret:
- Firebase service account JSON (backend only)
- Don't commit `.env` file

## Next Steps

1. **Install** → `npm install firebase`
2. **Configure** → Add env variables
3. **Test** → Login and allow notifications
4. **Deploy** → Set env variables in production

## Need Help?

Check `frontend/WEB_PUSH_SETUP.md` for:
- Detailed troubleshooting
- Architecture explanation
- Best practices
- Advanced configuration

---

**That's it!** Your users can now receive browser notifications just like mobile app notifications. 🎉
