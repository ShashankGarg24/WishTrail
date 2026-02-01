import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, LogOut, Settings, Star } from 'lucide-react'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import useApiStore from '../store/apiStore'
const SettingsModal = lazy(() => import('./SettingsModal'))

const HeaderNew = () => {
  const { isAuthenticated, logout, unreadNotifications, getNotifications, user: currentUser } = useApiStore()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Main navigation links
  const mainNavigation = [
    { name: 'Feed', href: '/feed' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Leaderboard', href: '/leaderboard' },
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileMenuOpen])

  const isActive = (href) => {
    try {
      const url = new URL(href, window.location.origin)
      const path = url.pathname
      return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    } catch (_) {
      if (href === '/' && location.pathname === '/') return true
      if (href !== '/' && location.pathname.startsWith(href)) return true
      return false
    }
  }

  const handleLogout = async () => {
    setIsProfileMenuOpen(false)
    await logout()
    navigate('/')
  }

  useEffect(() => {
    if (isAuthenticated) {
      getNotifications()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return null

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <Star className="w-6 h-6 text-[#4c99e6] fill-[#4c99e6]" />
            <span className="text-xl font-bold text-gray-900 dark:text-white font-manrope">
              WishTrail
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`relative font-medium font-manrope transition-colors ${
                  isActive(item.href)
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-5 left-0 right-0 h-0.5 bg-[#4c99e6]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search Icon */}
            <button
              onClick={() => navigate('/discover')}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#4c99e6] rounded-full"></span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold font-manrope">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white font-manrope">
                        {currentUser?.name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope">
                        @{currentUser?.username || 'username'}
                      </div>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          navigate(`/profile/@${currentUser?.username}`)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-manrope"
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          setIsSettingsOpen(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-manrope"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    </div>
                    <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-manrope"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </Suspense>
    </header>
  )
}

export default HeaderNew
