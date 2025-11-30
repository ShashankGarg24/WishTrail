# Quick Start Guide - Error Handling & Maintenance Mode

## 🚀 Testing the New Features

### Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend running on `http://localhost:5173`
- MongoDB instance running
- Valid admin token (if testing admin features)

---

## ✅ Test Error Pages

### 1. Generic Error Page
Navigate to: `http://localhost:5173/error/generic`

**Expected:**
- Red-themed error screen
- "Oops! Something went wrong." message
- Try Again and Go Home buttons

### 2. Network Error Page
Navigate to: `http://localhost:5173/error/network`

**Expected:**
- Blue-themed error screen
- "Can't connect right now." message
- Internet connection message

### 3. 404 Page
Navigate to: `http://localhost:5173/any-invalid-url`

**Expected:**
- Purple-themed error screen
- "404" large code display
- "Page not found." message

### 4. Server Error (500) Page
Navigate to: `http://localhost:5173/error/500`

**Expected:**
- Orange-themed error screen
- "500" large code display
- "Our servers are taking a break." message

### 5. Permission Error Page
Navigate to: `http://localhost:5173/error/permission`

**Expected:**
- Amber-themed error screen
- "403" large code display
- "You don't have access to this." message

### 6. Auth Expired Page
Navigate to: `http://localhost:5173/error/auth`

**Expected:**
- Indigo-themed error screen
- "You've been logged out." message
- Sign In button

---

## 🔧 Test Maintenance Mode

### Method 1: Via API (Recommended)

#### Step 1: Enable Maintenance Mode
```bash
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "message": "Testing maintenance mode - Back in 5 minutes!"
  }'
```

#### Step 2: Reload Frontend
- Open `http://localhost:5173`
- Should see animated maintenance page
- Countdown timer shows 60 seconds
- Auto-retries every 60 seconds

#### Step 3: Disable Maintenance Mode
```bash
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

#### Step 4: Verify Normal Access
- Reload frontend
- Should now load normally

### Method 2: Via MongoDB

#### Enable Maintenance Mode
```javascript
// In MongoDB shell or Compass
use wishtrail

db.configs.insertOne({
  key: "maintenance_mode",
  value: true,
  description: "Testing maintenance mode",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

#### Disable Maintenance Mode
```javascript
db.configs.deleteOne({ key: "maintenance_mode" })
// OR
db.configs.updateOne(
  { key: "maintenance_mode" },
  { $set: { value: false } }
)
```

### Method 3: Via Admin UI (Future)

1. Navigate to `/settings` (when admin panel is added)
2. Find "Maintenance Mode" section
3. Click "Enable Maintenance Mode"
4. Enter custom message
5. Click "Disable" to turn off

---

## 🧪 Test Error Boundary

### Trigger React Error
Create a test component that throws an error:

```javascript
// In any component
const TestError = () => {
  throw new Error('Testing error boundary');
  return <div>This won't render</div>;
};
```

**Expected:**
- GlobalErrorBoundary catches error
- Shows generic error screen
- Try Again button resets boundary
- Error logged to console (dev mode)

---

## 🔍 Test API Error Handling

### Test Network Error
1. Stop backend server
2. Try to make any API call in frontend
3. Should redirect to `/error/network`

### Test 401 Error
1. Clear localStorage token
2. Try to access protected route
3. Should redirect to `/error/auth`

### Test 403 Error
1. Try to access admin-only endpoint
2. Should redirect to `/error/permission`

### Test 500 Error
1. Trigger server error (e.g., invalid MongoDB query)
2. Should redirect to `/error/500`

---

## 📊 Verify Database

### Check Config Collection
```javascript
// MongoDB shell
use wishtrail
db.configs.find().pretty()
```

**Expected:**
```json
{
  "_id": ObjectId("..."),
  "key": "maintenance_mode",
  "value": false,
  "description": "System maintenance flag",
  "updatedBy": null,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

---

## 🎨 Test Dark Mode

All error screens and maintenance page support dark mode:

1. Toggle dark mode in app settings
2. Visit each error page
3. Verify colors and contrast
4. Check animations work smoothly

---

## 📱 Test Responsive Design

Test on different screen sizes:

- **Desktop** (1920x1080)
- **Tablet** (768x1024)
- **Mobile** (375x667)

Verify:
- ✅ Text is readable
- ✅ Buttons are accessible
- ✅ Layout adjusts properly
- ✅ Icons scale correctly

---

## 🔐 Test Maintenance Middleware

### Test Blocked Requests During Maintenance

1. Enable maintenance mode
2. Try these API calls:

```bash
# Should be blocked (503)
curl http://localhost:5000/api/v1/users/me

# Should work (whitelisted)
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/config/maintenance
```

**Expected:**
- Non-whitelisted endpoints return 503
- Whitelisted endpoints work normally

---

## 🎯 Test Edge Cases

### Edge Case 1: Maintenance Check Timeout
- Set very short timeout in `configService.js`
- Should fail gracefully, allow app to load

### Edge Case 2: Invalid Maintenance Message
- Set maintenance message to empty string
- Should show default message

### Edge Case 3: Rapid Toggle
- Enable/disable maintenance mode rapidly
- Should handle gracefully without errors

### Edge Case 4: Multiple Error Types
- Navigate between different error pages
- Should transition smoothly

---

## ✅ Success Criteria

### Error Pages
- [ ] All 7 error types display correctly
- [ ] Dark mode works on all screens
- [ ] Animations are smooth
- [ ] Buttons navigate correctly
- [ ] Responsive on all devices

### Maintenance Mode
- [ ] Can enable via API
- [ ] Can disable via API
- [ ] Frontend detects maintenance status
- [ ] Countdown timer works
- [ ] Auto-retry functions
- [ ] Custom messages display
- [ ] Middleware blocks requests

### Integration
- [ ] Error boundary catches errors
- [ ] API errors route correctly
- [ ] 404 page shows for invalid routes
- [ ] Database config works
- [ ] No console errors (except test errors)

---

## 🐛 Troubleshooting

### Issue: Maintenance page not showing
**Solution:**
1. Check MongoDB connection
2. Verify maintenance_mode value in DB
3. Check browser console for errors
4. Clear browser cache

### Issue: Error pages not routing
**Solution:**
1. Check routes in App.jsx
2. Verify lazy imports
3. Check React Router setup
4. Clear browser cache

### Issue: API calls during maintenance
**Solution:**
1. Check middleware is loaded in server.js
2. Verify middleware order (before routes)
3. Check whitelist paths
4. Test with curl directly

### Issue: Dark mode not working
**Solution:**
1. Check Tailwind dark: classes
2. Verify dark mode toggle in settings
3. Check HTML class "dark"
4. Inspect CSS classes

---

## 📞 Getting Help

If you encounter issues:

1. **Check Logs**
   - Backend: Console output
   - Frontend: Browser console
   - MongoDB: Database logs

2. **Review Documentation**
   - `ERROR_HANDLING_GUIDE.md`
   - `IMPLEMENTATION_SUMMARY.md`
   - Component comments

3. **Test Isolation**
   - Test backend API separately
   - Test frontend components separately
   - Test database queries separately

4. **Contact Support**
   - Email: support@wishtrail.com
   - Create GitHub issue

---

## 🎉 You're Done!

If all tests pass, the error handling and maintenance mode system is working correctly!

**Next Steps:**
1. Deploy to staging environment
2. Test with real users
3. Monitor error logs
4. Add admin UI (optional)
5. Set up error tracking (Sentry, etc.)

---

**Happy Testing!** 🚀
