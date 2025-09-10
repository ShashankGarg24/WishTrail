import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import useApiStore from './store/apiStore'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import InspirationPage from './pages/InspirationPage'
import ExplorePage from './pages/ExplorePage'
import FeedPage from './pages/FeedPage'
import DiscoverPage from './pages/DiscoverPage'
import NotificationsPage from './pages/NotificationsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { SpeedInsights } from '@vercel/speed-insights/react';
import FeedbackButton from './components/FeedbackButton'

function App() {
  const { isDarkMode, initializeAuth } = useApiStore()
  const location = useLocation()
  const navigate = useNavigate()

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

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-white dark:bg-gray-900 transition-colors duration-500" />
      </div>

      {/* Main content */}
      <div className="relative min-h-screen">
        <Header />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Legacy route retained temporarily; will redirect in future */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile/@:username" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/inspiration" element={<InspirationPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            {/* Goal deeplink opens feed modal behavior within FeedPage via /feed or existing ExplorePage logic */}
            <Route path="/goal/:goalId" element={<FeedPage />} />
          </Routes>
        </main>
        <Footer />
        <FeedbackButton />
      </div>
      <SpeedInsights />
    </div>
  )
}

export default App 