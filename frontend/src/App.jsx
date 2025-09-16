import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import BottomTabBar from './components/BottomTabBar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import InspirationPage from './pages/InspirationPage'
import FeedPage from './pages/FeedPage'
import DiscoverPage from './pages/DiscoverPage'
import NotificationsPage from './pages/NotificationsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import { SpeedInsights } from '@vercel/speed-insights/react';
import FeedbackButton from './components/FeedbackButton'

function App() {
  const { isDarkMode, initializeAuth, isAuthenticated } = useApiStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [inNativeApp, setInNativeApp] = useState(false)

  useEffect(() => {
    // Initialize authentication state
    initializeAuth();
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, initializeAuth])

  // Deep link bootstrap: allow ?url=... to redirect (for push taps)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const target = params.get('url')
      if (target && /^\/.+/.test(new URL(target, window.location.origin).pathname)) {
        navigate(new URL(target, window.location.origin).pathname + new URL(target, window.location.origin).search, { replace: true })
      }
    } catch {}
  }, [location.search, navigate])

  // Detect if running inside the mobile app WebView
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        setInNativeApp(true)
      }
    } catch {}
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-white dark:bg-gray-900 transition-colors duration-500" />
      </div>

      {/* Main content */}
      <div className="relative min-h-screen pb-20">
        <Header />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile/@:username" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/inspiration" element={<InspirationPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            {/* Goal deeplink opens modal within feed/discover */}
            <Route path="/goal/:goalId" element={<FeedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        {/* Bottom nav (web) */}
        {isAuthenticated && <BottomTabBar />}
        {/* Footer on web at all sizes; hide only inside native app */}
        {!inNativeApp && (
          <Footer />
        )}
        <div className="pointer-events-none">
          <div className="pointer-events-auto">
            <FeedbackButton />
          </div>
        </div>
      </div>
      <SpeedInsights />
    </div>
  )
}

export default App 