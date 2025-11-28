import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import ScrollMemory from './components/ScrollMemory'
import BottomTabBar from './components/BottomTabBar'
import Footer from './components/Footer'
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
import { SpeedInsights } from '@vercel/speed-insights/react';
const FeedbackButton = lazy(() => import('./components/FeedbackButton'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function App() {
  const { isDarkMode, initializeAuth, isAuthenticated, loadFeatures, isFeatureEnabled } = useApiStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [inNativeApp, setInNativeApp] = useState(false)

  useEffect(() => {
    // Initialize authentication state
    initializeAuth();
    // Load feature flags early
    loadFeatures();

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

  return (
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
            {isFeatureEnabled('leaderboard') && <Route path="/leaderboard" element={<Suspense fallback={null}><LeaderboardPage /></Suspense>} />}
            {isFeatureEnabled('community') && <Route path="/communities" element={<Suspense fallback={null}><CommunitiesPage /></Suspense>} />}
            {isFeatureEnabled('community') && <Route path="/communities/:id" element={<Suspense fallback={null}><CommunityDetailPage /></Suspense>} />}
            {/* Goal deeplink opens modal within feed/discover */}
            <Route path="/goal/:goalId" element={<Suspense fallback={null}><FeedPage /></Suspense>} />
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
  )
}

export default App 