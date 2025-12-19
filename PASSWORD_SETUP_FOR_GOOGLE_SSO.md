# Password Setup for Social Login Users

## Overview
Users who sign up via social login (Google SSO, etc.) don't have a password initially. This feature allows them to set a password through OTP verification, enabling traditional email/password login as an alternative to social login.

## Key Design Decision
**No Random Password Generation**: When users sign up via Google SSO, their password field is set to `null` in the database instead of generating a random password. This makes it clear that the user doesn't have a password and provides a clean way to detect SSO users.

## Implementation Summary

### Backend Changes

#### 1. User Model (`User.js`)
- Password field is now **optional** (`required: false`)
- Allows Google SSO users to be created without a password

#### 2. New Methods in `authService.js`
- `requestPasswordSetupOTP(userId)` - Sends OTP to user's email for password setup verification
  - Checks if user already has a password (if yes, rejects request)
- `setPasswordWithOTP(userId, otp, newPassword)` - Verifies OTP and sets new password
  - Checks if user already has a password (if yes, rejects request)

#### 3. User Response Enhancement
All authentication responses now include `hasPassword: boolean` field:
- `register()` - Returns `hasPassword: true` (regular signup)
- `login()` - Returns `hasPassword: true/false` based on user state
- `getCurrentUser()` - Returns `hasPassword: true/false`
- `googleAuth()` - Returns `hasPassword: false` for new Google users

#### 4. New Email Template in `emailService.js`
- `getPasswordSetupOTPTemplate(code)` - Email template for password setup OTP

#### 5. New Controllers in `authController.js`
- `requestPasswordSetupOTP` - POST `/api/v1/auth/password-setup/request-otp`
- `setPasswordWithOTP` - POST `/api/v1/auth/password-setup/verify`

#### 6. New Routes in `authRoutes.js`
```javascript
// Protected routes for password setup (users without password)
router.post('/password-setup/request-otp', protect, authController.requestPasswordSetupOTP);
router.post('/password-setup/verify', protect, [
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 6 })
], authController.setPasswordWithOTP);
```

### Frontend Changes

#### 1. Updated `api.js`
Added new API methods:
```javascript
requestPasswordSetupOTP: () => api.post('/auth/password-setup/request-otp'),
setPasswordWithOTP: (data) => api.post('/auth/password-setup/verify', data),
```

#### 2. Enhanced `PasswordSettings.jsx`
- Detects if user has a password via `user?.hasPassword`
- Shows two different UIs:
  - **Users without password** (Social login): "Set Password" flow with OTP verification
  - **Users with password** (Regular signup): "Change Password" flow with current password verification

## User Flow

### For Social Login Users (Setting Password)

1. **Step 1: Request OTP**
   - User clicks "Send Verification Code"
   - System checks if user already has a password (if yes, shows error)
   - System sends 6-digit OTP to user's email
   - OTP expires in 10 minutes

2. **Step 2: Verify OTP & Set Password**
   - User enters the 6-digit OTP received via email
   - User enters new password (must meet requirements)
   - User confirms new password
   - System verifies OTP and sets the password
   - All existing refresh tokens are invalidated for security

### For Regular Users (Changing Password)

1. User enters current password
2. User enters new password
3. User confirms new password
4. System verifies current password and updates to new one
5. All existing refresh tokens are invalidated for security

## Security Features

1. **OTP Verification**: Users without password must verify email ownership via OTP
2. **Time-Limited OTP**: OTP expires in 10 minutes
3. **Rate Limiting**: 30-60 second cooldown between OTP requests
4. **Token Invalidation**: All refresh tokens are cleared when password is set/changed
5. **Password Check**: Password setup endpoints verify user doesn't already have a password

## Password Requirements

- Minimum 8 characters
- Must contain letters (a-z, A-Z)
- Must contain numbers (0-9)
- Optional: Special characters for stronger passwords

## Technical Details

### Database Schema
```javascript
password: {
  type: String,
  required: false, // Not required for SSO users
  minlength: [6, 'Password must be at least 6 characters'],
  select: false
}
```

### User Detection Logic
```javascript
// Backend: Check if user needs password setup
const user = await User.findById(userId).select('+password');
if (user.password) {
  throw new Error('You already have a password');
}

// Frontend: Show appropriate UI
const hasPassword = user?.hasPassword;
if (!hasPassword) {
  // Show "Set Password" UI
} else {
  // Show "Change Password" UI
}
```

### Google SSO User Creation
```javascript
// No password is set for Google SSO users
user = await User.create({
  name,
  email,
  username,
  googleId,
  avatar: picture,
  // password is undefined/null
  isVerified: true,
  isActive: true
});
```

## Email Templates

### Password Setup OTP Email
- Subject: "Set Your WishTrail Password"
- Contains: 6-digit verification code
- Expiry: 10 minutes
- Purpose: Verify email ownership before allowing password setup

## Benefits

1. **Flexibility**: Social login users can add traditional login as backup
2. **Account Recovery**: Users aren't locked out if social login access is lost
3. **Security**: OTP verification ensures only the account owner can set password
4. **User Experience**: Clear, step-by-step process with helpful UI feedback
5. **Clean Implementation**: No random passwords stored, null password = SSO user

## Testing Checklist

- [ ] Google SSO user is created without password (password = null)
- [ ] `hasPassword: false` is returned for Google SSO users
- [ ] Settings page shows "Set Password" for users without password
- [ ] User can request OTP for password setup
- [ ] OTP email is delivered successfully
- [ ] OTP verification works correctly
- [ ] Password is set successfully after OTP verification
- [ ] User can login with newly set password
- [ ] `hasPassword: true` after setting password
- [ ] Regular users still see "Change Password" option
- [ ] Password strength indicator works correctly
- [ ] Error messages are clear and helpful
- [ ] OTP expiry timer displays correctly
- [ ] Resend OTP functionality works
- [ ] All refresh tokens are invalidated after password change
- [ ] Cannot set password if user already has one
