# Error Handling & Maintenance Mode System

This document explains the comprehensive error handling and maintenance mode system implemented in WishTrail.

## 📋 Table of Contents

- [Error Screens](#error-screens)
- [Maintenance Mode](#maintenance-mode)
- [Backend Setup](#backend-setup)
- [Frontend Implementation](#frontend-implementation)
- [Usage Examples](#usage-examples)
- [API Endpoints](#api-endpoints)

---

## 🎨 Error Screens

The application includes dedicated error screens for different scenarios:

### Available Error Types

1. **Generic Error** (`/error/generic`)
   - For unexpected errors
   - Shows: "Oops! Something went wrong."
   - Actions: Try Again, Go Home

2. **Network Error** (`/error/network`)
   - For connection issues
   - Shows: "Can't connect right now."
   - Actions: Try Again, Go Home

3. **404 Not Found** (`/404` or catch-all route)
   - For missing pages
   - Shows: "Page not found."
   - Actions: Go Home, Go Back

4. **500 Server Error** (`/error/500`)
   - For server crashes
   - Shows: "Our servers are taking a break."
   - Actions: Try Again, Go Home

5. **503 Service Unavailable** (Auto-detected)
   - For temporary outages
   - Shows: "Service temporarily unavailable."
   - Actions: Try Again, Go Home

6. **403 Permission Error** (`/error/permission`)
   - For access denied scenarios
   - Shows: "You don't have access to this."
   - Actions: Go Home, Go Back

7. **401 Auth Expired** (`/error/auth`)
   - For expired sessions
   - Shows: "You've been logged out."
   - Actions: Sign In, Go Home

### Using Error Screens

#### Direct Navigation
```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigate to specific error page
navigate('/error/network');
navigate('/error/500');
navigate('/error/permission');
```

#### Using the ErrorScreen Component
```javascript
import ErrorScreen from '../components/ErrorScreen';

// Custom error screen
<ErrorScreen 
  type="generic"
  title="Custom Error Title"
  message="Custom error message"
  showHomeButton={true}
  showRetryButton={true}
  showBackButton={false}
  onRetry={() => console.log('Retry clicked')}
  customAction={{
    label: 'Contact Support',
    onClick: () => window.location.href = 'mailto:thewishtrail@gmail.com',
    icon: MailIcon
  }}
/>
```

#### Using Error Handler Utility
```javascript
import { handleApiError } from '../utils/errorHandler';
import { useNavigate } from 'react-router-dom';

try {
  const response = await api.get('/some-endpoint');
} catch (error) {
  handleApiError(error, navigate); // Automatically routes to appropriate error page
}
```

---

## 🔧 Maintenance Mode

Maintenance mode allows you to temporarily disable the application while performing updates or maintenance.

### How It Works

1. **Backend Middleware**: Checks the database for maintenance mode status
2. **Frontend Check**: App.jsx checks maintenance status on load
3. **Auto-retry**: The maintenance page automatically checks every 60 seconds
4. **Graceful Display**: Shows a beautiful animated maintenance screen

### Enabling Maintenance Mode

#### Via API (Recommended)
```bash
# Using cURL
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "message": "We are performing scheduled maintenance. We will be back online at 3:00 PM EST."
  }'
```

#### Via MongoDB Directly
```javascript
// In MongoDB shell or Compass
db.configs.insertOne({
  key: "maintenance_mode",
  value: true,
  description: "Scheduled maintenance in progress",
  updatedAt: new Date(),
  createdAt: new Date()
});
```

### Disabling Maintenance Mode

```bash
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

---

## 🗄️ Backend Setup

### Database Model

The `Config` model stores system-wide configuration:

```javascript
// api/src/models/Config.js
{
  key: String,           // Config key (e.g., "maintenance_mode")
  value: Mixed,          // Config value (can be any type)
  description: String,   // Human-readable description
  updatedBy: ObjectId,   // User who last updated
  timestamps: true       // createdAt, updatedAt
}
```

### Static Methods

```javascript
// Get config value
const value = await Config.getValue('maintenance_mode', false);

// Set config value
await Config.setValue('maintenance_mode', true, userId, 'Maintenance in progress');

// Check maintenance mode
const isDown = await Config.isMaintenanceMode();
```

### Middleware

The maintenance mode middleware runs on every request:

```javascript
// api/src/middleware/maintenanceMode.js
// Automatically blocks requests during maintenance
// Whitelists: /health, /config/maintenance
```

### Controller Endpoints

Located in `api/src/controllers/configController.js`:

- `getAllConfigs()` - Get all configs (Admin)
- `getConfigByKey()` - Get specific config (Admin)
- `upsertConfig()` - Create/update config (Admin)
- `deleteConfig()` - Delete config (Admin)
- `getMaintenanceStatus()` - Check maintenance mode (Public)
- `toggleMaintenanceMode()` - Enable/disable maintenance (Admin)

---

## 💻 Frontend Implementation

### Components

1. **ErrorScreen Component** (`frontend/src/components/ErrorScreen.jsx`)
   - Reusable error display component
   - Supports multiple error types
   - Animated with Framer Motion
   - Dark mode support

2. **Error Page Components**
   - `GenericErrorPage.jsx`
   - `NetworkErrorPage.jsx`
   - `ServerErrorPage.jsx`
   - `PermissionErrorPage.jsx`
   - `AuthExpiredPage.jsx`
   - `MaintenancePage.jsx`

3. **Enhanced GlobalErrorBoundary**
   - Catches unhandled React errors
   - Shows ErrorScreen instead of white screen
   - Provides retry functionality

### Services

**Config Service** (`frontend/src/services/configService.js`):
```javascript
import { configService } from './services/configService';

// Check maintenance mode
const { isMaintenanceMode, message } = await configService.checkMaintenanceMode();

// Admin: Toggle maintenance mode
await configService.toggleMaintenanceMode(true, 'Maintenance message', token);
```

**Error Handler Utility** (`frontend/src/utils/errorHandler.js`):
```javascript
import { handleApiError, getErrorMessage } from './utils/errorHandler';

// Handle errors automatically
handleApiError(error, navigate);

// Get user-friendly error message
const message = getErrorMessage(error);
```

### App Integration

`App.jsx` includes:
- Maintenance mode check on startup
- Automatic maintenance page display
- Error page routes
- Global error boundary

---

## 📚 Usage Examples

### Example 1: Handling API Errors in Components

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleApiError, getErrorMessage } from '../utils/errorHandler';
import api from '../services/api';

function MyComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await api.get('/some-endpoint');
      // Handle success
    } catch (error) {
      // Option 1: Navigate to error page
      handleApiError(error, navigate);
      
      // Option 2: Show error message inline
      setError(getErrorMessage(error));
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={fetchData}>Load Data</button>
    </div>
  );
}
```

### Example 2: Custom Error Screen

```javascript
import ErrorScreen from '../components/ErrorScreen';

function CustomErrorPage() {
  const handleContactSupport = () => {
    window.location.href = 'mailto:thewishtrail@gmail.com';
  };

  return (
    <ErrorScreen
      type="generic"
      title="Payment Failed"
      message="We couldn't process your payment. Please try again or contact support."
      showHomeButton={true}
      showRetryButton={true}
      customAction={{
        label: 'Contact Support',
        onClick: handleContactSupport
      }}
    />
  );
}
```

### Example 3: Scheduled Maintenance

```javascript
// Admin script to schedule maintenance
import { configService } from './services/configService';

async function scheduleMaintenanceWindow() {
  const token = localStorage.getItem('adminToken');
  
  // Enable maintenance
  await configService.toggleMaintenanceMode(
    true,
    'Scheduled maintenance from 2:00 AM - 4:00 AM EST. We are upgrading our systems for better performance.',
    token
  );
  
  // Schedule to disable after 2 hours
  setTimeout(async () => {
    await configService.toggleMaintenanceMode(false, '', token);
  }, 2 * 60 * 60 * 1000);
}
```

---

## 🔌 API Endpoints

### Public Endpoints

#### GET `/api/v1/config/maintenance`
Check maintenance mode status

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenanceMode": false,
    "message": ""
  }
}
```

### Protected Endpoints (Admin Only)

#### GET `/api/v1/config`
Get all configuration settings

**Headers:** `Authorization: Bearer <token>`

#### GET `/api/v1/config/:key`
Get specific configuration by key

#### POST `/api/v1/config`
Create or update configuration

**Body:**
```json
{
  "key": "maintenance_mode",
  "value": true,
  "description": "System maintenance"
}
```

#### PUT `/api/v1/config/maintenance`
Toggle maintenance mode

**Body:**
```json
{
  "enabled": true,
  "message": "We'll be back soon!"
}
```

#### DELETE `/api/v1/config/:key`
Delete configuration

---

## 🎯 Best Practices

1. **Always use error boundaries** in production
2. **Test maintenance mode** in staging before production
3. **Provide clear messages** during maintenance
4. **Set estimated times** when possible
5. **Log errors** for debugging
6. **Use appropriate error types** for better UX
7. **Test all error scenarios** before deployment

---

## 🚀 Testing

### Test Maintenance Mode
```bash
# Enable
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "message": "Testing maintenance mode"}'

# Check status
curl http://localhost:5000/api/v1/config/maintenance

# Disable
curl -X PUT http://localhost:5000/api/v1/config/maintenance \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Test Error Pages
Simply navigate to:
- `/error/generic`
- `/error/network`
- `/error/500`
- `/error/permission`
- `/error/auth`
- `/invalid-page` (for 404)

---

## 📞 Support

For issues or questions about the error handling system, contact:
- Email: thewishtrail@gmail.com
- GitHub: Open an issue in the repository

---

**Last Updated:** November 30, 2025
**Version:** 1.0.0
