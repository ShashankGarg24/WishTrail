import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import ScrollMemory from './components/ScrollMemory'
import BottomTabBar from './components/BottomTabBar'
import Footer from './components/Footer'
import { configService } from './services/configService'
import { initializeWebPush } from './services/webPush'
import { notificationsAPI } from './services/api'
const HomePage = lazy(() => import('./pages/HomePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const InspirationPage = lazy(() => import('./pages/InspirationPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage'))
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'))
const GenericErrorPage = lazy(() => import('./pages/GenericErrorPage'))
const NetworkErrorPage = lazy(() => import('./pages/NetworkErrorPage'))
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage'))
const PermissionErrorPage = lazy(() => import('./pages/PermissionErrorPage'))
const AuthExpiredPage = lazy(() => import('./pages/AuthExpiredPage'))
import { SpeedInsights } from '@vercel/speed-insights/react';
const FeedbackButton = lazy(() => import('./components/FeedbackButton'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HabitAnalyticsPage = lazy(() => import('./pages/HabitAnalyticsPage'))
const GoalAnalyticsPage = lazy(() => import('./pages/GoalAnalyticsPage'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))

function App() {
  const { isDarkMode, initializeAuth, isAuthenticated} = useApiStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [inNativeApp, setInNativeApp] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [comingSoonMode, setComingSoonMode] = useState(null)
  const [comingSoonMessage, setComingSoonMessage] = useState('')

  // Check maintenance and coming-soon mode on app load
  useEffect(() => {
    const checkModes = async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          configService.checkMaintenanceMode(),
          configService.checkComingSoon()
        ]);
        setMaintenanceMode(mRes.isMaintenanceMode);
        setMaintenanceMessage(mRes.message || '');
        setComingSoonMode(cRes.isComingSoon);
        setComingSoonMessage(cRes.message || '');
      } catch (error) {
        console.error('Failed to check site modes:', error);
        setMaintenanceMode(false);
        setComingSoonMode(false);
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
  if (comingSoonMode === null || maintenanceMode === null) {
    // Still checking status
    return null
  }

  if (comingSoonMode) {
    return (
      <Suspense fallback={null}>
        <ComingSoonPage message={comingSoonMessage} />
      </Suspense>
    )
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
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-white dark:bg-gray-900 transition-colors duration-500" />
        </div>

        {/* Main content */}
        {/* <div className="relative min-h-screen pb-16 sm:pb-16"> */}
        <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex flex-col">
          <Header />
          <main className="flex-grow pt-16 pb-24 sm:pb-28">
            <ScrollMemory />
            <Routes>
              <Route path="/" element={<Suspense fallback={null}><HomePage /></Suspense>} />
              <Route path="/auth" element={<Suspense fallback={null}><AuthPage /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
              <Route path="/dashboard" element={<Suspense fallback={null}><DashboardPage /></Suspense>} />
              <Route path="/feed" element={<Suspense fallback={null}><FeedPage /></Suspense>} />
              <Route path="/discover" element={<Suspense fallback={null}><DiscoverPage /></Suspense>} />
              <Route path="/notifications" element={<Suspense fallback={null}><NotificationsPage /></Suspense>} />
              <Route path="/profile/:username" element={<Suspense fallback={null}><ProfilePage /></Suspense>} />
              <Route path="/inspiration" element={<Suspense fallback={null}><InspirationPage /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={null}><SettingsPage /></Suspense>} />
              <Route path="/leaderboard" element={<Suspense fallback={null}><LeaderboardPage /></Suspense>} />
              {/* <Route path="/communities" element={<Suspense fallback={null}><CommunitiesPage /></Suspense>} />
              <Route path="/communities/:id" element={<Suspense fallback={null}><CommunityDetailPage /></Suspense>} /> */}
              <Route path="/habits/:id/analytics" element={<Suspense fallback={null}><HabitAnalyticsPage /></Suspense>} />
              <Route path="/goals/:goalId/analytics" element={<Suspense fallback={null}><GoalAnalyticsPage /></Suspense>} />
              {/* Legal pages */}
              <Route path="/privacy-policy" element={<Suspense fallback={null}><PrivacyPolicy /></Suspense>} />
              <Route path="/terms-of-service" element={<Suspense fallback={null}><TermsOfService /></Suspense>} />
              {/* Goal deeplink opens modal within feed/discover */}
              <Route path="/goal/:goalId" element={<Suspense fallback={null}><FeedPage /></Suspense>} />
              {/* Error pages */}
              <Route path="/error/generic" element={<Suspense fallback={null}><GenericErrorPage /></Suspense>} />
              <Route path="/error/network" element={<Suspense fallback={null}><NetworkErrorPage /></Suspense>} />
              <Route path="/error/500" element={<Suspense fallback={null}><ServerErrorPage /></Suspense>} />
              <Route path="/error/permission" element={<Suspense fallback={null}><PermissionErrorPage /></Suspense>} />
              <Route path="/error/auth" element={<Suspense fallback={null}><AuthExpiredPage /></Suspense>} />
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