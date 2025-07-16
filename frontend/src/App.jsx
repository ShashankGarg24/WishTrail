import { Routes, Route } from 'react-router-dom'
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
import LeaderboardPage from './pages/LeaderboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const { isDarkMode, initializeAuth } = useApiStore()

  useEffect(() => {
    // Initialize authentication state
    initializeAuth();
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, initializeAuth])

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
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/inspiration" element={<InspirationPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <SpeedInsights />
    </div>
  )
}

export default App 