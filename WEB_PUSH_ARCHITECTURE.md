# Web Push Notifications Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NOTIFICATION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

1. USER LOGS IN
   │
   ├─> App.jsx initializes web push
   ├─> Request notification permission
   ├─> Get FCM token from Firebase
   └─> Register token with backend API
       │
       └─> DeviceToken { userId, token, platform: 'web', provider: 'fcm' }


2. NOTIFICATION CREATED
   │
   Backend creates notification (like, comment, follow, etc.)
   │
   ├─> Notification model save() hook triggered
   └─> pushService.sendFcmToUser(userId, notification)
       │
       ├─> Query DeviceToken collection for user
       │   (gets both mobile AND web tokens)
       │
       └─> Send to Firebase Cloud Messaging (FCM)


3. FCM DELIVERS NOTIFICATION
   │
   ├─> Mobile Devices (iOS/Android)
   │   └─> Expo/Native FCM handles display
   │
   └─> Web Browsers
       │
       ├─> App Open (Foreground)
       │   └─> onMessage() handler in webPush.js
       │       └─> Show notification via service worker
       │
       └─> App Closed (Background)
           └─> Service worker 'push' event in sw.js
               └─> Show notification automatically


4. USER CLICKS NOTIFICATION
   │
   └─> Service worker 'notificationclick' event
       │
       ├─> Extract deep link URL from notification data
       ├─> Find/open app window
       └─> Navigate to relevant page (goal, feed, profile, etc.)
```

---

## Component Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        FRONTEND COMPONENTS                         │
└───────────────────────────────────────────────────────────────────┘

App.jsx
  │
  ├─> On Authentication
  │   └─> initializeWebPush()
  │       │
  │       └─> webPush.js
  │           │
  │           ├─> initializeFirebaseMessaging()
  │           │   └─> Initialize Firebase app with config
  │           │
  │           ├─> requestNotificationPermission()
  │           │   └─> Browser Notification API
  │           │
  │           ├─> getFCMToken()
  │           │   └─> Firebase getToken() with VAPID key
  │           │
  │           ├─> registerDeviceWithBackend()
  │           │   └─> POST /api/v1/notifications/register-device
  │           │
  │           └─> setupForegroundMessageListener()
  │               └─> Firebase onMessage() handler
  │
  └─> Components
      │
      ├─> WebPushSettings.jsx
      │   └─> UI for enabling/managing notifications
      │
      └─> TestNotification.jsx
          └─> Dev tool for testing notifications


Service Worker (sw.js)
  │
  ├─> Import Firebase scripts
  │   ├─> firebase-app-compat.js
  │   └─> firebase-messaging-compat.js
  │
  ├─> Event: 'push'
  │   └─> Parse FCM payload
  │       └─> showNotification()
  │
  └─> Event: 'notificationclick'
      └─> Navigate to deep link URL
```

---

## Backend Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        BACKEND COMPONENTS                          │
└───────────────────────────────────────────────────────────────────┘

Notification Model
  │
  ├─> post('save') hook
  │   └─> If type in notifyTypes
  │       └─> sendFcmToUser(userId, notification)
  │
  └─> Store notification in MongoDB


pushService.js
  │
  ├─> sendFcmToUser(userId, notification)
  │   │
  │   ├─> Query DeviceToken.find({ userId, isActive: true })
  │   │   └─> Returns all user's devices (mobile + web)
  │   │
  │   ├─> Build notification payload
  │   │   ├─> Title: "ActorName : action"
  │   │   ├─> Body: Goal title or message
  │   │   └─> Data: { url, type, id }
  │   │
  │   ├─> Send via Firebase Admin SDK
  │   │   └─> admin.messaging().sendEachForMulticast()
  │   │
  │   └─> Handle errors & cleanup invalid tokens
  │
  └─> buildDeepLink(notification)
      └─> Generate URL based on notification type


notificationController.js
  │
  ├─> POST /notifications/register-device
  │   └─> DeviceToken.findOneAndUpdate({ userId, token })
  │       ├─> Set platform: 'web'
  │       ├─> Set provider: 'fcm'
  │       └─> Deactivate old tokens
  │
  └─> POST /notifications/unregister-device
      └─> DeviceToken.updateOne({ isActive: false })


DeviceToken Model
  {
    userId: ObjectId,
    token: String,              // FCM token
    platform: 'web',            // or 'ios', 'android'
    provider: 'fcm',            // or 'expo'
    timezone: String,
    timezoneOffsetMinutes: Number,
    lastSeenAt: Date,
    isActive: Boolean
  }
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Browser    │
│  (User A)    │
└──────┬───────┘
       │ 1. Login
       ├──────────────> App.jsx
       │                   │
       │ 2. Init FCM       │
       ├──────────────> webPush.js
       │                   │
       │ 3. Request        │
       │ permission        │
       │<──────────────────┤
       │                   │
       │ 4. Get token      │
       │ from Firebase     │
       ├──────────────> Firebase (FCM)
       │                   │
       │ 5. FCM token      │
       │<──────────────────┤
       │                   │
       │ 6. Register       │
       │ token             │
       ├──────────────> Backend API
       │                   │
       │                   ├──> MongoDB (DeviceToken)
       │                   │    { userId: A, token: xxx, platform: 'web' }
       │                   │
       │ 7. Success        │
       │<──────────────────┤
       │                   │
       │ ✅ Ready to receive notifications


┌──────────────┐
│   Browser    │
│  (User B)    │
└──────┬───────┘
       │ 1. Likes
       │ User A's goal
       ├──────────────> Backend API
       │                   │
       │                   ├──> Create Notification
       │                   │    { userId: A, type: 'goal_liked', data: {...} }
       │                   │
       │                   ├──> pushService.sendFcmToUser(A)
       │                   │       │
       │                   │       ├──> Query DeviceToken.find({ userId: A })
       │                   │       │    Returns: [web token, mobile token]
       │                   │       │
       │                   │       └──> Firebase Admin SDK
       │                   │            admin.messaging().sendEachForMulticast()
       │                   │
       │                   └──> Firebase (FCM)


┌──────────────┐
│   Firebase   │
│     FCM      │
└──────┬───────┘
       │ Push notification
       │
       ├──────────────> User A's Browser (Web)
       │                   │
       │                   ├─> If app open:
       │                   │   └─> onMessage() handler
       │                   │       └─> Show notification
       │                   │
       │                   └─> If app closed:
       │                       └─> Service Worker 'push' event
       │                           └─> Show notification
       │
       └──────────────> User A's Phone (Mobile)
                           └─> Expo/FCM native handler
                               └─> Show notification


┌──────────────┐
│   Browser    │
│  (User A)    │
└──────┬───────┘
       │ Click
       │ notification
       ├──────────────> Service Worker
       │                   │
       │                   ├─> Extract URL from notification.data
       │                   │   URL: /goal/123abc
       │                   │
       │                   ├─> Find/focus app window
       │                   │
       │                   └─> Navigate to URL
       │
       │ App opens
       │ to goal page
       └──────────────> ✅ Goal details shown
```

---

## Permission States

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION PERMISSION FLOW                  │
└─────────────────────────────────────────────────────────────────┘

Initial State: "default"
  │
  ├─> requestNotificationPermission()
  │
  ├─> User clicks "Allow"
  │   └─> State: "granted" ✅
  │       └─> FCM token obtained
  │           └─> Register with backend
  │               └─> User receives notifications
  │
  ├─> User clicks "Block"
  │   └─> State: "denied" ❌
  │       └─> No FCM token
  │           └─> Show browser settings instructions
  │
  └─> User closes prompt
      └─> State: "default"
          └─> Can request again later


Permission Check Flow:
  │
  ├─> "unsupported" → Browser doesn't support notifications
  ├─> "default" → Never asked or dismissed
  ├─> "denied" → User blocked (must change in browser settings)
  └─> "granted" → User allowed (ready for notifications)
```

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOKEN LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

1. TOKEN CREATION
   │
   User logs in → Permission granted → FCM generates token
   │
   └─> POST /notifications/register-device
       {
         token: "fcm-web-token-xxx",
         platform: "web",
         provider: "fcm",
         timezone: "America/New_York",
         timezoneOffsetMinutes: -300
       }
       │
       └─> DeviceToken.findOneAndUpdate()
           ├─> Create or update token
           ├─> Set isActive: true
           └─> Deactivate old tokens


2. TOKEN REFRESH
   │
   FCM automatically rotates tokens (rare)
   │
   └─> New token generated → Re-register


3. TOKEN INVALIDATION
   │
   ├─> User revokes permission
   ├─> User clears browser data
   ├─> Token expires/invalid
   └─> FCM returns error
       │
       └─> Backend marks isActive: false


4. TOKEN CLEANUP
   │
   Backend periodically cleans up
   │
   ├─> Invalid tokens (FCM errors)
   ├─> Expired tokens (old lastSeenAt)
   └─> User logout (optional cleanup)


Token Uniqueness:
  │
  ├─> One user can have multiple tokens (different browsers/devices)
  └─> Each (userId, token) pair is unique in DB
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERROR SCENARIOS                           │
└─────────────────────────────────────────────────────────────────┘

Frontend Errors:
  │
  ├─> Firebase not configured
  │   └─> Log warning, skip initialization
  │
  ├─> Permission denied
  │   └─> Show instructions to enable in browser settings
  │
  ├─> FCM token generation failed
  │   └─> Log error, user won't receive notifications
  │
  ├─> Backend registration failed
  │   └─> Retry on next login
  │
  └─> Service worker registration failed
      └─> Fallback to Notification API for foreground


Backend Errors:
  │
  ├─> FCM credentials missing
  │   └─> Log error: "Firebase not initialized"
  │
  ├─> Invalid token
  │   └─> Mark token as inactive
  │
  ├─> Token not registered
  │   └─> FCM error: "registration-token-not-registered"
  │       └─> Auto-cleanup, remove from DB
  │
  └─> Network error
      └─> Log error, notification not delivered


User Recovery:
  │
  ├─> Permission denied → Manual browser settings
  ├─> Token invalid → Re-login to get new token
  └─> Not receiving → Check settings, re-enable
```

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────────┘

Client-Side (Public):
  │
  ├─> Firebase API Key
  │   └─> Domain-restricted in Firebase Console
  │
  ├─> VAPID Key
  │   └─> Public key for Web Push protocol
  │
  └─> Firebase Config
      └─> All values are safe to expose


Server-Side (Private):
  │
  ├─> Firebase Service Account JSON
  │   └─> Never expose to client
  │   └─> Used for FCM Admin SDK
  │
  └─> Environment Variables
      └─> Kept secure in .env


Token Security:
  │
  ├─> FCM tokens are user-specific
  ├─> Cannot be used to impersonate user
  ├─> Automatically rotated by FCM
  └─> Backend validates userId on registration


API Security:
  │
  ├─> Device registration requires authentication
  ├─> JWT token validated on all endpoints
  ├─> User can only register tokens for themselves
  └─> Rate limiting on API endpoints
```

---

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                        PERFORMANCE METRICS                       │
└─────────────────────────────────────────────────────────────────┘

Initial Load:
  │
  ├─> Firebase SDK: ~50KB gzipped
  ├─> Service Worker: ~2KB
  ├─> Web Push Service: ~5KB
  └─> Total Impact: <60KB (one-time)


Initialization Time:
  │
  ├─> Delayed by 2 seconds after login
  ├─> Async, non-blocking
  └─> User sees no delay


Token Registration:
  │
  ├─> One-time per browser/device
  ├─> ~100-300ms API call
  └─> Background process


Notification Delivery:
  │
  ├─> Direct from FCM (no app polling)
  ├─> Push delivery: <1 second
  ├─> Background: Works when app closed
  └─> No battery/resource impact


Service Worker:
  │
  ├─> Runs only when needed
  ├─> Minimal memory footprint
  ├─> Auto-managed by browser
  └─> No manual cleanup needed
```

---

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCALABILITY NOTES                         │
└─────────────────────────────────────────────────────────────────┘

User Scale:
  │
  ├─> 1 user = 1-5 tokens (mobile + web browsers)
  ├─> 10K users = ~30K tokens
  ├─> 100K users = ~300K tokens
  └─> DeviceToken collection scales linearly


Notification Volume:
  │
  ├─> FCM handles massive scale
  ├─> Backend batches multi-token sends
  ├─> Rate limits prevent spam
  └─> Automatic retry for failures


Database Impact:
  │
  ├─> DeviceToken: Small documents (~200 bytes)
  ├─> Indexes on userId, token, isActive
  ├─> Occasional cleanup queries
  └─> Minimal performance impact


FCM Quotas (Firebase Spark/Free):
  │
  ├─> No limit on message sends
  ├─> No limit on topics/subscriptions
  └─> May have rate limits (check Firebase)


Cost Considerations:
  │
  ├─> FCM: Free (Google Cloud Messaging)
  ├─> Firebase: Free tier sufficient for most apps
  ├─> Bandwidth: Minimal (notifications are tiny)
  └─> Storage: DeviceToken collection is small
```

---

## Monitoring Points

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONITORING CHECKLIST                      │
└─────────────────────────────────────────────────────────────────┘

Frontend Metrics:
  │
  ├─> Permission grant rate
  ├─> Token generation success rate
  ├─> Registration API success rate
  └─> Foreground notification display rate


Backend Metrics:
  │
  ├─> Active web tokens count
  ├─> FCM send success rate
  ├─> FCM send failure rate
  ├─> Invalid token cleanup rate
  └─> Notification types distribution


User Metrics:
  │
  ├─> Users with notifications enabled
  ├─> Notification click-through rate
  ├─> Notification dismiss rate
  └─> Time to click (engagement)


Error Tracking:
  │
  ├─> Firebase initialization failures
  ├─> Permission denials
  ├─> FCM send errors
  ├─> Service worker errors
  └─> Backend API errors


Queries for Monitoring:
  │
  // Active web tokens
  db.deviceTokens.count({ platform: 'web', isActive: true })
  
  // Users with web notifications
  db.deviceTokens.distinct('userId', { platform: 'web', isActive: true }).length
  
  // Recent registrations
  db.deviceTokens.find({ 
    platform: 'web', 
    createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
  })
```

This architecture diagram provides a comprehensive view of how the web push notification system works! 🎯
