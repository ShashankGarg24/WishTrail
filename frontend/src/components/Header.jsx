import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun, Menu, X, Star, User, BarChart3, LogOut, Settings, Bell } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import useApiStore from '../store/apiStore'
import SettingsModal from './SettingsModal'

const Header = () => {
  const { isDarkMode, toggleTheme, isAuthenticated, logout, unreadNotifications, getNotifications } = useApiStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef(null)
  const navigate = useNavigate();

  // Main navigation tabs in specified order
  // Replace single Explore with standalone Feed and Discover pages
  const mainNavigation = [
    { name: 'Home', href: '/' },
    ...(isAuthenticated
      ? [
          { name: 'Feed', href: '/feed' },
          { name: 'Discover', href: '/discover' },
          { name: 'Leaderboard', href: '/leaderboard?tab=global' },
          { name: 'Dashboard', href: '/dashboard' },
        ]
      : []),
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setTimeout(() => {
          setIsMenuOpen(false);
        }, 200);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

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
    await logout()
    setIsMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    if (isAuthenticated) {
      // Prefetch first page to get unread count
      getNotifications({ page: 1, limit: 1 }).catch(() => {})
    }
  }, [isAuthenticated, getNotifications])

  // Listen for native push forwarded from the app WebView (wt_push) to refresh unread badge
  useEffect(() => {
    const handler = () => {
      try { getNotifications({ page: 1, limit: 1 }); } catch {}
    };
    window.addEventListener('wt_push', handler);
    return () => window.removeEventListener('wt_push', handler);
  }, [getNotifications]);

  // Global event to open settings from anywhere
  useEffect(() => {
    const handler = () => setIsSettingsOpen(true)
    window.addEventListener('wt_open_settings', handler)
    return () => window.removeEventListener('wt_open_settings', handler)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10 theme-transition">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2"
              >
                <Star className="h-8 w-8 text-primary-500" />
                <span className="text-xl font-bold text-gradient">
                  WishTrail
                </span>
              </motion.div>
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400'
                  }`}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                    />
                  )}
                </Link>
              ))}
            </nav>
          {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {isAuthenticated && (
                <button
                  onClick={() => navigate('/notifications')}
                  className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 dark:border-white/10 transition-all duration-300"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.1rem] h-5 px-1 text-[10px] font-semibold rounded-full bg-red-500 text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
              )}
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all duration-300 group"
              >
                <div className="relative w-5 h-5">
                  <Sun className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
                    isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                  }`} />
                  <Moon className={`absolute inset-0 h-5 w-5 text-blue-400 transition-all duration-300 ${
                    isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                  }`} />
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              {/* Auth Button for Desktop */}
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex btn-primary"
                >
                  Get Started
                </Link>
              )}
             {/* Hamburger menu (desktop only) */}
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="hidden md:inline-flex p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 dark:border-white/10 transition-all duration-300"
                >
                  {isMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </motion.button>
              )}
            </div>
          </div>
{/* Mobile/Hamburger Menu */}
          {isMenuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl overflow-hidden z-50"
            >
              <div className="p-4">
                <div className="flex flex-col space-y-2">
                  {/* Main Navigation for Mobile */}
                  <div className="md:hidden border-b border-white/10 pb-4 mb-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Navigation
                    </div>
                    {mainNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                 {/* User Menu */}
                  {isAuthenticated ? (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Account
                      </div>
                      <Link
                        to="/profile?tab=overview"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <BarChart3 className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 rounded-lg transition-colors w-full text-left"
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full text-left"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-primary"
                    >
                      Get Started
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}

export default Header 