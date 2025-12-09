# Web Push Notifications - Quick Reference

## 🚀 Quick Install

```bash
# Run the installation script
./install-web-push.ps1

# Or manually:
cd frontend
npm install firebase
```

## 🔧 Configuration (frontend/.env)

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project_id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_VAPID_KEY=BNxxx...
```

Get from: [Firebase Console](https://console.firebase.google.com/) → Project Settings

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `frontend/src/services/webPush.js` | FCM integration & token management |
| `frontend/src/App.jsx` | Auto-initialize on login |
| `frontend/public/sw.js` | Background notification handler |
| `frontend/src/components/WebPushSettings.jsx` | Settings UI |

---

## 🧪 Testing

### 1. Quick Test
```bash
cd frontend
npm run dev
# → Login → Allow notifications → Check console
```

### 2. Add Test Button (Optional)
In `App.jsx`, add:
```jsx
import TestNotification from './components/TestNotification';
// ... in JSX:
<TestNotification />
```

### 3. Trigger Real Notification
- Have another user like/comment on your content
- Or create notification manually in MongoDB

---

## 🔍 Debugging

### Check Token Registration
```javascript
// MongoDB query
db.deviceTokens.find({ platform: 'web', isActive: true })
```

### Frontend Logs
Look for:
```
[WebPush] Firebase Messaging initialized successfully
[WebPush] FCM token obtained: ...
[WebPush] Device registered with backend successfully
```

### Backend Logs
Look for:
```
[push] tokens found { userId: ..., count: ... }
[push] fcm result { successCount: ..., failureCount: ... }
```

### Browser DevTools
- **Chrome**: DevTools → Application → Service Workers
- **Firefox**: DevTools → Storage → Service Workers
- Check for errors in Console

---

## ⚙️ Settings UI Integration

Add to your Settings page:

```jsx
import WebPushSettings from '../components/WebPushSettings';

// In your notification settings section:
<div className="space-y-4">
  <WebPushSettings />
  {/* Your existing settings */}
</div>
```

---

## 🌐 Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Desktop & mobile |
| Edge | ✅ Full | Desktop & mobile |
| Firefox | ✅ Full | Desktop & mobile |
| Safari | ⚠️ Limited | macOS 16.4+, iOS PWA only |
| Opera | ✅ Full | Desktop & mobile |

---

## 🔔 Notification Types

All existing types work on web:
- Activity/comment/goal likes
- Comments & replies
- Mentions
- Follows & follow requests
- Habit reminders
- Journal prompts
- Community updates

---

## 🚨 Common Issues

### No permission prompt?
- Already denied → Reset in browser settings
- Running in mobile app → Web push disabled there

### Notifications not arriving?
- Check Firebase config in .env
- Verify backend has FCM service account
- Check browser console for errors

### Token not registering?
- Check API endpoint is accessible
- Verify user is authenticated
- Check network tab for failed requests

### Service worker issues?
- Must be served over HTTPS (or localhost)
- Clear browser cache and re-register
- Check for JavaScript errors

---

## 🔐 Security

**Safe to expose (public):**
- ✅ All VITE_* variables
- ✅ Firebase config
- ✅ VAPID key

**Keep secret (backend only):**
- 🔒 Firebase service account JSON
- 🔒 Never commit .env files

---

## 📊 Monitoring Queries

```javascript
// Active web tokens
db.deviceTokens.count({ platform: 'web', isActive: true })

// Users with web notifications
db.deviceTokens.distinct('userId', { platform: 'web', isActive: true }).length

// Recent registrations (24h)
db.deviceTokens.find({ 
  platform: 'web', 
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
}).count()
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `WEB_PUSH_QUICK_START.md` | Quick installation guide |
| `WEB_PUSH_SUMMARY.md` | Complete implementation summary |
| `frontend/WEB_PUSH_SETUP.md` | Detailed setup & troubleshooting |
| `WEB_PUSH_ARCHITECTURE.md` | System architecture diagrams |

---

## 🎯 Deploy to Production

### Vercel
1. Project Settings → Environment Variables
2. Add all VITE_FIREBASE_* variables
3. Redeploy

### Other Platforms
Add environment variables in platform dashboard

### Verify
- ✅ HTTPS enabled (required)
- ✅ Service worker accessible at /sw.js
- ✅ All env variables set
- ✅ Test on production URL

---

## 💡 Pro Tips

1. **Delay asking for permission** - Wait until user is engaged (already implemented with 2s delay)
2. **Test in multiple browsers** - Different browsers have different behaviors
3. **Monitor invalid tokens** - Backend auto-cleans them
4. **Deep links work** - Notifications navigate to relevant pages
5. **Works offline** - Service worker handles background notifications

---

## 🆘 Support

**Need help?**
1. Check browser console for errors
2. Review backend logs for FCM issues
3. Verify all configuration in .env
4. Test with different browser
5. Check Firebase Console for FCM logs

**Firebase Resources:**
- [FCM Web Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

## ✅ Quick Checklist

Before going live:

- [ ] Firebase package installed (`npm install firebase`)
- [ ] Firebase config values in .env
- [ ] VAPID key configured
- [ ] Backend FCM service account configured
- [ ] Tested locally (login + allow notifications)
- [ ] Triggered test notification
- [ ] Clicked notification → verified navigation
- [ ] Deployed with env variables set
- [ ] Tested on production URL
- [ ] Verified HTTPS is enabled

---

## 🎉 That's It!

Your users can now receive browser notifications!

**Installation:** ~15 minutes  
**Testing:** ~5 minutes  
**Works with:** All existing notification types  
**Supported:** Chrome, Firefox, Edge, Safari (limited)

For more details, see the complete documentation files. Happy notifying! 🔔
