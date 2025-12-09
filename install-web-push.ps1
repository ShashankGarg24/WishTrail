# Web Push Notifications - Installation Script
# Run this after setting up your Firebase configuration

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    WishTrail Web Push Notifications Setup                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path ".\frontend\package.json")) {
    Write-Host "❌ Error: Please run this script from the WishTrail root directory" -ForegroundColor Red
    Write-Host "   (The directory containing 'frontend', 'api', and 'app' folders)`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Installing Firebase SDK..." -ForegroundColor Yellow
Set-Location frontend

try {
    npm install firebase
    Write-Host "✅ Firebase package installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install Firebase package" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Check for .env file
Write-Host "`n🔧 Checking Firebase configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".\frontend\.env")) {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
    Write-Host "`nCreating .env template..." -ForegroundColor Yellow
    
    $envTemplate = @"
# Firebase Web Push Configuration
# Get these values from Firebase Console: https://console.firebase.google.com/
# Project Settings → General → Your apps (Web)

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# VAPID Key from Firebase Console
# Project Settings → Cloud Messaging → Web Push certificates
VITE_FIREBASE_VAPID_KEY=

# Your existing API URL (if not already set)
# VITE_API_URL=https://your-api.com
"@
    
    $envTemplate | Out-File -FilePath ".\frontend\.env" -Encoding UTF8
    Write-Host "✅ Created frontend/.env template" -ForegroundColor Green
    Write-Host "`n⚠️  IMPORTANT: Please edit frontend/.env and add your Firebase configuration" -ForegroundColor Yellow
    Write-Host "   See WEB_PUSH_QUICK_START.md for instructions on getting these values`n" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Check if Firebase variables are set
    $envContent = Get-Content ".\frontend\.env" -Raw
    $requiredVars = @(
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_APP_ID",
        "VITE_FIREBASE_VAPID_KEY"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=.+") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "`n⚠️  Missing or empty Firebase configuration variables:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "   - $var" -ForegroundColor Red
        }
        Write-Host "`n   Please update frontend/.env with your Firebase configuration" -ForegroundColor Yellow
        Write-Host "   See WEB_PUSH_QUICK_START.md for instructions`n" -ForegroundColor Yellow
    } else {
        Write-Host "✅ All Firebase configuration variables are set" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Installation Summary                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ Files installed and configured" -ForegroundColor Green
Write-Host "✅ Firebase package added to frontend" -ForegroundColor Green

Write-Host "`n📁 Files created:" -ForegroundColor Yellow
Write-Host "   • frontend/src/services/webPush.js" -ForegroundColor Gray
Write-Host "   • frontend/src/components/WebPushSettings.jsx" -ForegroundColor Gray
Write-Host "   • frontend/src/components/TestNotification.jsx" -ForegroundColor Gray
Write-Host "   • frontend/src/config/firebase.example.js" -ForegroundColor Gray

Write-Host "`n📝 Files modified:" -ForegroundColor Yellow
Write-Host "   • frontend/src/App.jsx (added web push initialization)" -ForegroundColor Gray
Write-Host "   • frontend/src/services/api.js (added device registration)" -ForegroundColor Gray
Write-Host "   • frontend/public/sw.js (enhanced for FCM)" -ForegroundColor Gray

Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "   • WEB_PUSH_QUICK_START.md - Quick installation guide" -ForegroundColor Gray
Write-Host "   • WEB_PUSH_SUMMARY.md - Complete implementation summary" -ForegroundColor Gray
Write-Host "   • frontend/WEB_PUSH_SETUP.md - Detailed setup guide" -ForegroundColor Gray
Write-Host "   • WEB_PUSH_ARCHITECTURE.md - System architecture" -ForegroundColor Gray

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Get Firebase configuration from Firebase Console" -ForegroundColor White
Write-Host "      → https://console.firebase.google.com/" -ForegroundColor Gray
Write-Host "`n   2. Update frontend/.env with Firebase values" -ForegroundColor White
Write-Host "      → See WEB_PUSH_QUICK_START.md for details" -ForegroundColor Gray
Write-Host "`n   3. Start development server:" -ForegroundColor White
Write-Host "      → cd frontend" -ForegroundColor Gray
Write-Host "      → npm run dev" -ForegroundColor Gray
Write-Host "`n   4. Login and allow notifications when prompted" -ForegroundColor White
Write-Host "`n   5. Test by triggering a notification (like, comment, follow)" -ForegroundColor White

Write-Host "`n📖 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   WEB_PUSH_QUICK_START.md" -ForegroundColor Cyan

Write-Host "`n✨ Setup complete! Happy notifying! 🔔`n" -ForegroundColor Green
