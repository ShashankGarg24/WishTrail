import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster, toast } from 'react-hot-toast'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import ScrollMemory from './components/ScrollMemory'
import BottomTabBar from './components/BottomTabBar'
import Footer from './components/Footer'
import PrivateRoute from './components/PrivateRoute'
import { configService } from './services/configService'
import { initializeWebPush } from './services/webPush'
import { notificationsAPI } from './services/api'
const HomePage = lazy(() => import('./pages/HomePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPageNew = lazy(() => import('./pages/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const InspirationPage = lazy(() => import('./pages/InspirationPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const DiscoverPageNew = lazy(() => import('./pages/DiscoverPage'))
const NotificationsPageNew = lazy(() => import('./pages/NotificationsPage'))
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage'))
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const GenericErrorPage = lazy(() => import('./pages/GenericErrorPage'))
const NetworkErrorPage = lazy(() => import('./pages/NetworkErrorPage'))
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage'))
const PermissionErrorPage = lazy(() => import('./pages/PermissionErrorPage'))
const AuthExpiredPage = lazy(() => import('./pages/AuthExpiredPage'))
import { SpeedInsights } from '@vercel/speed-insights/react';
const FeedbackButton = lazy(() => import('./components/FeedbackButton'))
const SettingsPageNew = lazy(() => import('./pages/SettingsPage'))
const HabitAnalyticsPage = lazy(() => import('./pages/HabitAnalyticsPage'))
const GoalAnalyticsPage = lazy(() => import('./pages/GoalAnalyticsPage'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'))
const CopyrightPolicy = lazy(() => import('./pages/CopyrightPolicy'))
const LeaderboardPageNew = lazy(() => import('./pages/LeaderboardPage'))
const WhatsNewPage = lazy(() => import('./pages/WhatsNewPage'))
function App() {
  const { isDarkMode, initializeAuth, isAuthenticated} = useApiStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [inNativeApp, setInNativeApp] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  // Check maintenance and coming-soon mode on app load
  useEffect(() => {
    const checkModes = async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          configService.checkMaintenanceMode(),
        ]);
        setMaintenanceMode(mRes.isMaintenanceMode);
        setMaintenanceMessage(mRes.message || '');
      } catch (error) {
        console.error('Failed to check site modes:', error);
        setMaintenanceMode(false);
      }
    };
    checkModes();
  }, [])

  useEffect(() => {
    // Initialize authentication state
    initializeAuth();
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, initializeAuth])

  // Deep link bootstrap: allow ?url=... to redirect (for push taps) and feedback=1 to open feedback modal
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const target = params.get('url')
      const feedback = params.get('feedback')
      if (target && /^\/.+/.test(new URL(target, window.location.origin).pathname)) {
        navigate(new URL(target, window.location.origin).pathname + new URL(target, window.location.origin).search, { replace: true })
      }
      if (feedback === '1') {
        try { window.dispatchEvent(new CustomEvent('wt_open_feedback')); } catch { }
      }
    } catch { }
  }, [location.search, navigate])

  // Bridge wt_toast custom events to react-hot-toast
  useEffect(() => {
    const handler = (e) => {
      const { message, type } = e.detail || {}
      if (!message) return
      if (type === 'success') toast.success(message)
      else if (type === 'error') toast.error(message)
      else if (type === 'warning') toast(message, { icon: '⚠️' })
      else toast(message)
    }
    window.addEventListener('wt_toast', handler)
    return () => window.removeEventListener('wt_toast', handler)
  }, [])

  // Detect if running inside the mobile app WebView
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        setInNativeApp(true)
      }
    } catch { }
  }, [])

  // Initialize web push notifications for authenticated users
  useEffect(() => {
    // Only initialize for authenticated users on web (not in native app)
    if (!isAuthenticated || inNativeApp) {
      return;
    }

    let unsubscribe = null;
    let timeoutId = null;
    let hasInitialized = false;

    // Initialize web push with a small delay to avoid blocking initial render
    timeoutId = setTimeout(async () => {
      if (hasInitialized) return;
      hasInitialized = true;
      try {
        const result = await initializeWebPush(
          notificationsAPI.registerDevice,
          (payload) => {
            // Handle foreground notifications
            
            // Refresh notifications count when a new notification arrives
            try {
              const store = useApiStore.getState();
              if (store.getNotifications) {
                store.getNotifications({ page: 1, limit: 1 }, { force: true });
              }
            } catch (error) {
              console.error('[App] Error refreshing notifications:', error);
            }
          }
        );

        if (result && result.unsubscribe) {
          unsubscribe = result.unsubscribe;
        }
      } catch (error) {
        console.error('[App] Error setting up web push:', error);
      }
    }, 2000); // 2 second delay after authentication

    // Cleanup listener on unmount
    return () => {
      hasInitialized = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isAuthenticated, inNativeApp])

  // Show coming soon / maintenance pages if enabled
  if (maintenanceMode === null) {
    // Still checking status
    return null
  }


  if (maintenanceMode) {
    return (
      <Suspense fallback={null}>
        <MaintenancePage message={maintenanceMessage} />
      </Suspense>
    )
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-white dark:bg-gray-900 transition-colors duration-500" />
        </div>

        {/* Main content */}
        {/* <div className="relative min-h-screen pb-16 sm:pb-16"> */}
        <div className="relative min-h-screen bg-[#f5f5f5] dark:bg-gray-900 flex flex-col">
          <Header />
          <main className="flex-grow">
            <ScrollMemory />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Suspense fallback={null}><HomePage /></Suspense>} />
              <Route path="/auth" element={<Suspense fallback={null}><AuthPage /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
              <Route path="/inspiration" element={<Suspense fallback={null}><InspirationPage /></Suspense>} />
              
              {/* Legal pages - Public */}
              <Route path="/privacy-policy" element={<Suspense fallback={null}><PrivacyPolicy /></Suspense>} />
              <Route path="/terms-of-service" element={<Suspense fallback={null}><TermsOfService /></Suspense>} />
              <Route path="/community-guidelines" element={<Suspense fallback={null}><CommunityGuidelines /></Suspense>} />
              <Route path="/copyright-policy" element={<Suspense fallback={null}><CopyrightPolicy /></Suspense>} />
              
              {/* What's New page - Public */}
              <Route path="/whats-new" element={<Suspense fallback={null}><WhatsNewPage /></Suspense>} />
              
              {/* Error pages - Public */}
              <Route path="/error/generic" element={<Suspense fallback={null}><GenericErrorPage /></Suspense>} />
              <Route path="/error/network" element={<Suspense fallback={null}><NetworkErrorPage /></Suspense>} />
              <Route path="/error/500" element={<Suspense fallback={null}><ServerErrorPage /></Suspense>} />
              <Route path="/error/permission" element={<Suspense fallback={null}><PermissionErrorPage /></Suspense>} />
              <Route path="/error/auth" element={<Suspense fallback={null}><AuthExpiredPage /></Suspense>} />
              
              {/* Protected routes - Require authentication */}
              <Route path="/dashboard" element={<PrivateRoute><Suspense fallback={null}><DashboardPageNew /></Suspense></PrivateRoute>} />
              <Route path="/feed" element={<PrivateRoute><Suspense fallback={null}><FeedPage /></Suspense></PrivateRoute>} />
              <Route path="/discover" element={<PrivateRoute><Suspense fallback={null}><DiscoverPageNew /></Suspense></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Suspense fallback={null}><NotificationsPageNew /></Suspense></PrivateRoute>} />
              <Route path="/profile/:username" element={<PrivateRoute><Suspense fallback={null}><ProfilePage /></Suspense></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Suspense fallback={null}><SettingsPageNew /></Suspense></PrivateRoute>} />
              <Route path="/leaderboard" element={<PrivateRoute><Suspense fallback={null}><LeaderboardPageNew /></Suspense></PrivateRoute>} />
              {/* <Route path="/communities" element={<PrivateRoute><Suspense fallback={null}><CommunitiesPage /></Suspense></PrivateRoute>} />
              <Route path="/communities/:id" element={<PrivateRoute><Suspense fallback={null}><CommunityDetailPage /></Suspense></PrivateRoute>} /> */}
              <Route path="/habits/:id/analytics" element={<PrivateRoute><Suspense fallback={null}><HabitAnalyticsPage /></Suspense></PrivateRoute>} />
              <Route path="/goals/:goalId/analytics" element={<PrivateRoute><Suspense fallback={null}><GoalAnalyticsPage /></Suspense></PrivateRoute>} />
              
              {/* Goal deeplink opens modal within feed/discover - Protected */}
              <Route path="/goal/:goalId" element={<PrivateRoute><Suspense fallback={null}><FeedPage /></Suspense></PrivateRoute>} />
              
              {/* 404 - Public */}
              <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
            </Routes>
          </main>
          {/* Bottom nav (web) */}
          {isAuthenticated && <BottomTabBar />}
          {/* Footer on web at all sizes; hide only inside native app */}
          {!inNativeApp && (
            <Footer />
          )}
          <Suspense fallback={null}><FeedbackButton /></Suspense>
        </div>
        <SpeedInsights />
      </div>
    </GoogleOAuthProvider>
  )
}

export default App 