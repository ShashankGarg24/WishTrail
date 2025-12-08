// Firebase Configuration for Web Push Notifications
// Copy this to your .env file and fill in your Firebase project details

// Get these values from your Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project (or create a new one)
// 3. Go to Project Settings (gear icon) > General
// 4. Scroll down to "Your apps" and select/add a Web app
// 5. Copy the config values

// Required environment variables for Vite (frontend/.env)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

// VAPID Key (Web Push Certificate)
// To get this:
// 1. Go to Project Settings > Cloud Messaging
// 2. Under "Web configuration", find "Web Push certificates"
// 3. Click "Generate key pair" if you don't have one
// 4. Copy the key pair value
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here

// Example .env file:
/*
VITE_FIREBASE_API_KEY=AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq
VITE_FIREBASE_AUTH_DOMAIN=wishtrail-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wishtrail-app
VITE_FIREBASE_STORAGE_BUCKET=wishtrail-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef
VITE_FIREBASE_VAPID_KEY=BNdX1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_
*/
