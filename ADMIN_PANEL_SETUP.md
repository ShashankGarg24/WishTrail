# WishTrail Admin Panel Setup & Usage Guide

## 🎯 Quick Overview

The WishTrail admin panel is a lightweight, secure dashboard for managing users, goals, sending re-engagement emails, viewing analytics, and posting announcements. It requires:
- **Email/password login** (configured in ENV)
- **IP allowlist** for access control
- **Dedicated JWT admin tokens** with 8-hour expiry

All admin routes are protected at `/api/v1/admin/*` and return minimal, secure responses.

---

## 🔧 Backend Configuration

### Step 1: Set Admin Credentials & IP Allowlist in `.env`

Add these to your API `.env` file (copy from `api/env.example`):

```env
# Admin Panel Security
ADMIN_EMAIL=admin@wishtrail.in
ADMIN_PASSWORD=your_secure_password_here
ADMIN_ALLOWED_IPS=127.0.0.1,::1
# Optional: dedicated secret and expiry
ADMIN_JWT_SECRET=your_optional_admin_secret
ADMIN_JWT_EXPIRES=8h
```

**Notes:**
- `ADMIN_EMAIL` can be an email or username; login accepts either
- `ADMIN_ALLOWED_IPS` is comma-separated; defaults to localhost only if not set
- IPs are normalized (strips IPv6 prefix `::ffff:`)
- In production, allowlist your office/CI IP; never allow `0.0.0.0`

### Step 2: Restart Backend

```bash
cd api
npm run dev
# or: npm start
```

### Step 3: Test Admin Login

```bash
curl -X POST http://localhost:3001/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wishtrail.in",
    "password": "your_secure_password_here"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "email": "admin@wishtrail.in"
  }
}
```

---

## 🚀 Frontend Access

### Step 1: Navigate to Admin Panel

Visit `http://localhost:5173/admin` (or your production domain `/admin`).

### Step 2: Login

- Enter your admin email and password (from `.env`)
- Click "Sign in"
- Token is cached in `localStorage` (as `wishtrail_admin_token`)

### Step 3: Logout

Click "Logout" button in top right. Token is cleared.

---

## 📋 Admin Panel Features

### **Users Tab**
- Search by name, username, or email
- Filter by inactivity (e.g., inactive > 30 days)
- Select users for bulk email campaigns
- View goal completion stats

### **Goals Tab**
- Search goal title or owner username
- Filter by status: All / Active / Completed
- See goal ownership, category, and creation date

### **Email Tab**
1. **Audience modes:**
   - "Selected users" — emails only checked users from Users tab
   - "All users" — emails every active user
   - "Inactive users" — emails users inactive > X days

2. **Quick Templates:**
   - Inactive user re-engagement
   - Comeback nudge
   - Feature release announcement
   - Custom email (compose your own)

3. **Send Flow:**
   - Write subject and message
   - Select audience and click "Send Email"
   - Response shows count: `Broadcast completed: X sent, Y failed`

### **Analytics Tab**
4 simple cards (no charts):
- **Total Users**
- **Active Today**
- **Inactive Users** (> 30 days)
- **Total Goals**

### **Announcements Tab**
- **Create:** Add title, description, and toggle active status
- **List:** View all announcements paginated
- **Toggle:** Click "Active"/"Inactive" to toggle visibility
- All announcements are public (via `/api/v1/admin/announcements` GET, no auth required for public feeds)

---

## 🔐 Security Design

### Auth Flow
1. **Email + Password** → `/api/v1/admin/login` (no token needed)
2. Backend verifies IP is in `ADMIN_ALLOWED_IPS`
3. Returns signed JWT (scope: `admin-panel`, 8h expiry)
4. Frontend stores token in `localStorage`
5. All subsequent requests include token in `Authorization: Bearer <token>`

### IP Allowlist
- Checked on **every admin request** via middleware `requireAllowedAdminIp`
- Supports `X-Forwarded-For`, `X-Real-IP`, or direct connection IP
- Defaults to `127.0.0.1` and `::1` (localhost) if `ADMIN_ALLOWED_IPS` not set

### Input Sanitization
- All email subjects/messages are plain-text (HTML tags stripped)
- Control characters removed
- Max lengths enforced (subject 180, message 5000)
- Usernames/emails validated before database queries

### Email Security
- Emails sent via nodemailer using SMTP config (from `.env`)
- Plain-text + HTML versions sent
- No sensitive data logged

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Admin login with correct credentials → token returned
- [ ] Admin login with wrong password → 401
- [ ] Admin login from non-allowlisted IP → 403
- [ ] GET `/api/v1/admin/users?page=1&limit=20` with token → users list
- [ ] GET `/api/v1/admin/analytics` → totals (users, goals, active, inactive)
- [ ] POST `/api/v1/admin/email/send` → broadcast counts
- [ ] GET `/api/v1/admin/announcements` → list
- [ ] POST `/api/v1/admin/announcements` → announcement created
- [ ] PATCH `/api/v1/admin/announcements/{id}` → toggled active state

### Frontend Tests
- [ ] Navigate to `/admin` → login form displayed
- [ ] Enter wrong password → error shown
- [ ] Login succeeds → token saved, tabs visible
- [ ] Users tab: load list, search, select users
- [ ] Goals tab: load list, filter by status
- [ ] Email tab: select template, compose custom, send
- [ ] Analytics tab: cards show correct totals
- [ ] Announcements tab: create, list, toggle
- [ ] Logout → token cleared, redirected to login

---

## 🛠️ Troubleshooting

### "Admin access denied for this IP"
- Check `ADMIN_ALLOWED_IPS` in `.env`
- Verify your actual IP via:
  ```bash
  curl http://localhost:3001/api/v1/admin/login -v
  # Look at "X-Forwarded-For" or request IP
  ```

### "Email service is not configured"
- Verify SMTP vars in `.env`:
  ```env
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASS=...
  FROM_EMAIL=support@wishtrail.in
  ```

### "Invalid or expired admin token"
- Token expires after 8 hours (or `ADMIN_JWT_EXPIRES` value)
- Re-login to get a fresh token

### "Invalid admin credentials"
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` match in `.env`
- Login accepts either email or username as the identity field

---

## 📚 API Reference

All endpoints require `Authorization: Bearer <admin_token>` header and IP allowlist check.

### Authentication
- `POST /api/v1/admin/login` — login (no auth required, IP checked)

### Users
- `GET /api/v1/admin/users?page=1&limit=20&search=name&inactiveDays=30`

### Goals
- `GET /api/v1/admin/goals?page=1&limit=20&search=title&status=all|active|completed`

### Analytics
- `GET /api/v1/admin/analytics?inactiveDays=30`

### Email
- `POST /api/v1/admin/email/send`
  ```json
  {
    "mode": "selected|all|inactive",
    "userIds": [1, 2, 3],
    "inactiveDays": 30,
    "subject": "Subject line",
    "message": "Email body"
  }
  ```

### Announcements
- `GET /api/v1/admin/announcements?page=1&limit=10`
- `POST /api/v1/admin/announcements`
  ```json
  {
    "title": "New feature",
    "description": "Description",
    "isActive": true
  }
  ```
- `PATCH /api/v1/admin/announcements/{id}`
  ```json
  {
    "title": "...",
    "description": "...",
    "isActive": true
  }
  ```

---

## 🎯 Product Usage Tips

### Re-engage Inactive Users
1. Go to **Email** tab
2. Select "Inactive users" → set days threshold (e.g., 30)
3. Choose "Comeback nudge" template or write custom
4. Click "Send Email"

### Announce New Features
1. Go to **Announcements** tab
2. Create title + description (e.g., "New goal division feature")
3. Toggle "Active" ON
4. Users will see it on the next app load

### Monitor Growth
1. Check **Analytics** tab daily
2. Track:
   - **Total Users** — cumulative signups
   - **Active Today** — engagement health
   - **Inactive Users** — re-engagement pool size
   - **Total Goals** — platform activity

---

## 🚀 Production Deployment

1. **Set strong credentials:**
   ```env
   ADMIN_EMAIL=your-secure-email@company.com
   ADMIN_PASSWORD=<128-char-random-string>
   ```

2. **Restrict IPs to your team only:**
   ```env
   ADMIN_ALLOWED_IPS=203.0.113.10,203.0.113.11
   ```

3. **Use HTTPS** for all admin traffic

4. **Rotate credentials** every 90 days

5. **Monitor admin logs** for unauthorized attempts:
   ```
   grep "Admin access denied" /var/log/wishtrail-api.log
   ```

---

## 📝 Notes

- Admin announcements are **separate from product updates** (Whats New page uses `/api/v1/product-updates`)
- Email drafts are **not saved**; compose and send in one go
- Pagination defaults to 20 items/page, max 100
- All timestamps are in UTC server time

---

End of guide. 🎉
