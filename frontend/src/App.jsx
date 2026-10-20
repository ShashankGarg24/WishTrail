import { reconcileNativeNotifications } from './services/nativeNotifications'
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import ScrollMemory from './components/ScrollMemory'
import BottomTabBar from './components/BottomTabBar'
import Footer from './components/Footer'
import PrivateRoute from './components/PrivateRoute'
import StartupSkeleton from './components/StartupSkeleton'
import NativeStartupReady from './components/NativeStartupReady'
import ContextualSidebar from './components/navigation/ContextualSidebar'
import { configService } from './services/configService'
import { initializeWebPush } from './services/webPush'
import { notificationsAPI } from './services/api'
import { FEATURES } from './config/features'
import { ADMIN_BASE } from './admin/config'
const HomePage = lazy(() => import('./pages/HomePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPageNew = lazy(() => import('./pages/DashboardPage'))
const WeeklyTrailPage = lazy(() => import('./pages/WeeklyTrailPage'))
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
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'))
const CopyrightPolicy = lazy(() => import('./pages/CopyrightPolicy'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const LeaderboardPageNew = lazy(() => import('./pages/LeaderboardPage'))
const WhatsNewPage = lazy(() => import('./pages/WhatsNewPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

const RouteLoadingScreen = StartupSkeleton

function App() {
  const isDarkMode = useApiStore(state => state.isDarkMode)
  const initializeAuth = useApiStore(state => state.initializeAuth)
  const isAuthenticated = useApiStore(state => state.isAuthenticated)
  const [authReady, setAuthReady] = useState(false)
  const location = useLocation()
  const isAdminRoute = location.pathname === ADMIN_BASE || location.pathname.startsWith(`${ADMIN_BASE}/`)
  const navigate = useNavigate()
  const [inNativeApp, setInNativeApp] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const hideFooterOnRoute = isAuthenticated && (
    location.pathname === '/home' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/feed' ||
    location.pathname === '/discover' ||
    location.pathname === '/notifications' ||
    location.pathname.startsWith('/weekly-trail') ||
    location.pathname === '/settings' ||
    location.pathname === '/leaderboard' ||
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/goal/') ||
    location.pathname.startsWith('/habits/') ||
    location.pathname.startsWith('/goals/')
  )

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
    if (isAdminRoute) return;
    let cancelled = false;
    Promise.resolve(initializeAuth()).catch(error => { console.error('Session bootstrap failed', error); }).finally(() => { if (!cancelled) setAuthReady(true); });
    return () => { cancelled = true; };
  }, [initializeAuth, isAdminRoute]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

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

  // Handle native foreground notifications and notification taps.
  useEffect(() => {
    const onPush = ({ detail = {} }) => {
      const { title, body, url } = detail;
      // Foreground arrivals show a banner; notification taps contain only a URL.
      if (title || body) {
        toast([title, body].filter(Boolean).join(': '));
        if (useApiStore.getState().isAuthenticated) {
          useApiStore.getState().getNotifications({ page: 1, limit: 15, scope: 'social' }, { force: true });
          useApiStore.getState().getFollowRequests({ page: 1, limit: 10 });
        }
      } else if (url) {
        try {
          const target = new URL(url, window.location.origin);
          if (target.origin === window.location.origin) navigate(target.pathname + target.search + target.hash);
        } catch { /* Ignore malformed notification links. */ }
      }
    };
    window.addEventListener('wt_push', onPush);
    return () => window.removeEventListener('wt_push', onPush);
  }, [navigate]);

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

  useEffect(() => {
    if (!authReady || !isAuthenticated || !inNativeApp) return;
    let busy = false;
    const sync = async (request = false) => {
      if (busy) return;
      busy = true;
      try { await reconcileNativeNotifications(request); }
      catch (error) { toast.error(error.message || 'Could not sync notification preferences.'); }
      finally { busy = false; }
    };
    sync(true);
    const resume = () => sync(false);
    window.addEventListener('wt_native_resume', resume);
    window.addEventListener('online', resume);
    return () => {
      window.removeEventListener('wt_native_resume', resume);
      window.removeEventListener('online', resume);
    };
  }, [authReady, isAuthenticated, inNativeApp]);

  useEffect(() => {
    if (!inNativeApp) return;
    const viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    const preventZoom = event => { if (event.type === 'gesturestart' || event.touches?.length > 1) event.preventDefault(); };
    document.documentElement.style.touchAction = 'pan-x pan-y';
    const nativeStyle = document.createElement('style');
    nativeStyle.textContent = 'input, select, textarea { font-size: max(16px, 1em) !important; }';
    document.head.appendChild(nativeStyle);
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    return () => {
      if (previous) viewport?.setAttribute('content', previous);
      document.documentElement.style.touchAction = '';
      nativeStyle.remove();
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
    };
  }, [inNativeApp]);

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

  // Admin has separate authentication and remains available during maintenance.
  if (isAdminRoute) return <><Toaster position="top-right" containerStyle={{ zIndex: 99999 }} /><Suspense fallback={<RouteLoadingScreen />}><AdminPage /></Suspense></>;

  // Show coming soon / maintenance pages if enabled
  if (!authReady) return <StartupSkeleton />


  if (maintenanceMode) {
    return (
      <Suspense fallback={null}>
        <MaintenancePage message={maintenanceMessage} />
        <NativeStartupReady allowAnyRoute />
      </Suspense>
    )
  }

  return (
    <>
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
          {isAuthenticated && !inNativeApp && <ContextualSidebar />}
          <main className={`flex-grow ${isAuthenticated ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0' : ''}`}>
            <Suspense fallback={<RouteLoadingScreen />}>
              <ScrollMemory />
              <NativeStartupReady />
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/inspiration" element={<InspirationPage />} />
              
              {/* Legal pages - Public */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/community-guidelines" element={<CommunityGuidelines />} />
              <Route path="/copyright-policy" element={<CopyrightPolicy />} />
              <Route path="/support" element={<SupportPage />} />
              
              {/* What's New page - Public */}
              <Route path="/whats-new" element={<WhatsNewPage />} />
              
              {/* Error pages - Public */}
              <Route path="/error/generic" element={<GenericErrorPage />} />
              <Route path="/error/network" element={<NetworkErrorPage />} />
              <Route path="/error/500" element={<ServerErrorPage />} />
              <Route path="/error/permission" element={<PermissionErrorPage />} />
              <Route path="/error/auth" element={<AuthExpiredPage />} />
              
              {/* Protected routes - Require authentication */}
              <Route path="/weekly-trail" element={<PrivateRoute><WeeklyTrailPage /></PrivateRoute>} />
              <Route path="/home" element={<PrivateRoute><DashboardPageNew /></PrivateRoute>} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/feed" element={<PrivateRoute><FeedPage /></PrivateRoute>} />
              <Route path="/discover" element={<PrivateRoute><DiscoverPageNew /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><NotificationsPageNew /></PrivateRoute>} />
              <Route path="/profile/:username" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPageNew /></PrivateRoute>} />
              <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPageNew /></PrivateRoute>} />
              <Route path="/communities" element={<PrivateRoute>{FEATURES.communities ? <Suspense fallback={null}><CommunitiesPage /></Suspense> : <Navigate to="/discover" replace />}</PrivateRoute>} />
              <Route path="/communities/:id" element={<PrivateRoute>{FEATURES.communities ? <Suspense fallback={null}><CommunityDetailPage /></Suspense> : <Navigate to="/discover" replace />}</PrivateRoute>} />
              <Route path="/habits/:id/analytics" element={<Navigate to="/home" replace />} />
              <Route path="/goals/:goalId/analytics" element={<Navigate to="/home" replace />} />
              
              {/* Goal deeplink opens modal within feed/discover - Protected */}
              <Route path="/goal/:goalId" element={<PrivateRoute><FeedPage /></PrivateRoute>} />
              
              {/* 404 - Public */}
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          {/* Bottom nav (web) */}
          {isAuthenticated && <BottomTabBar />}
          {/* Footer on web at all sizes; hide only inside native app */}
          {!inNativeApp && !hideFooterOnRoute && (
            <Footer />
          )}
          <Suspense fallback={null}><FeedbackButton /></Suspense>
        </div>
        <SpeedInsights />
      </div>
    </>
  )
}

export default App
