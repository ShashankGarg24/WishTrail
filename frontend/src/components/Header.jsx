import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Star, User, BarChart3, LogOut, Settings, Bell, CheckCircle, Search, MessageSquarePlus } from 'lucide-react'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import useApiStore from '../store/apiStore'
const SettingsModal = lazy(() => import('./SettingsModal'));
const FeedbackButton = lazy(() => import('./FeedbackButton'));
const RatingModal = lazy(() => import('./RatingModal'));

const Header = () => {
  const { isAuthenticated, logout, unreadNotifications, getNotifications, user: currentUser } = useApiStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isRatingOpen, setIsRatingOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef(null)
  const navigate = useNavigate();
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // Main navigation tabs in specified order
  // Replace single Explore with standalone Feed and Discover pages
  const mainNavigation = [
    ...(isAuthenticated
      ? [
        { name: 'Feed', href: '/feed' },
        // { name: 'Communities', href: '/communities' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Leaderboard', href: '/leaderboard?tab=global' },
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

  const handleLogout = () => {
    setIsMenuOpen(false)
    // Small delay to ensure menu closes before modal opens
    setTimeout(() => {
      setIsLogoutModalOpen(true)
    }, 100)
  }

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false)
    await logout()
    navigate('/')
  }

  // Global toast listener (use window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message, type } })))
  useEffect(() => {
    const handler = (evt) => {
      try {
        const d = evt?.detail || {};
        const message = d.message || 'Link copied to clipboard';
        const type = d.type || 'success';
        setToast({ message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), Math.max(1500, Math.min(5000, d.duration || 2600)));
      } catch { }
    };
    window.addEventListener('wt_toast', handler);
    return () => {
      window.removeEventListener('wt_toast', handler);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [])

  // Listen for native push forwarded from the app WebView (wt_push) to refresh unread badge
  useEffect(() => {
    const handler = (evt) => {
      // evt.detail may contain { url, type, id }
      try {
        const d = evt?.detail || {};
        // Refresh unread count
        getNotifications({ page: 1, limit: 1 }, { force: true });
        // If a deep link URL is provided, navigate to it (in-app routing)
        if (d.url && typeof d.url === 'string') {
          const u = new URL(d.url, window.location.origin);
          if (u.origin === window.location.origin) {
            navigate(u.pathname + u.search);
          }
        }
      } catch { }
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

  // Global event to open settings from anywhere
  useEffect(() => {
    const handler = () => setIsFeedbackOpen(true)
    window.addEventListener('wt_open_feedback', handler)
    return () => window.removeEventListener('wt_open_feedback', handler)
  }, [])

  // Global event to open rating modal from anywhere
  useEffect(() => {
    const handler = () => setIsRatingOpen(true)
    window.addEventListener('wt_open_rating', handler)
    return () => window.removeEventListener('wt_open_rating', handler)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 theme-transition">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/#" className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="flex items-center"
              >
                <Star className="h-7 w-7 text-purple-600 dark:text-purple-400 fill-purple-600 dark:fill-purple-400" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                WishTrail
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              {/* Search */}
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/discover')}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    isActive('/discover')
                      ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-800'
                  }`}
                  aria-label="Discover"
                >
                  <Search className="h-5 w-5" />
                </motion.button>
              )}
              
              {/* Notifications */}
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/notifications')}
                  className={`relative p-2.5 rounded-lg transition-all duration-200 ${
                    isActive('/notifications')
                      ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-800'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </motion.button>
              )}
              
              {/* Get Started Button */}
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Get Started
                </Link>
              )}
              
              {/* User Menu - Desktop Only */}
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="hidden md:flex p-2.5 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              )}
              
              {/* Mobile Get Started Button */}
              {!isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden flex p-2.5 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>
          
          {/* User Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-4 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Mobile Navigation */}
                <div className="md:hidden p-2 border-b border-gray-200 dark:border-gray-700">
                  {mainNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        isActive(item.href)
                          ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                
                {/* User Menu Items */}
                {isAuthenticated ? (
                  <div className="p-2">
                    <Link
                      to={`/profile/@${currentUser?.username}?tab=overview`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all w-full text-left"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsFeedbackOpen(true);
                      }}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all w-full text-left"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      <span>Feedback</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRatingOpen(true);
                      }}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all w-full text-left"
                    >
                      <Star className="h-4 w-4" />
                      <span>Rate Us</span>
                    </button>
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2">
                    <Link
                      to="/auth"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Settings Modal */}
      <Suspense fallback={null}><SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      /></Suspense>
      <Suspense fallback={null}><FeedbackButton
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      /></Suspense>
      <Suspense fallback={null}><RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
      /></Suspense>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsLogoutModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Confirm Logout
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to logout? You'll need to sign in again to access your goals and progress.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-sm"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
            className="fixed top-6 right-6 z-[11000]"
          >
            <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 ${toast.type === 'success' ? 'bg-white text-gray-800 border-green-200 dark:bg-gray-800 dark:text-gray-100 dark:border-green-700' : 'bg-white text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'}`}>
              <CheckCircle className={`h-4 w-4 ${toast.type === 'success' ? 'text-green-600' : 'text-gray-500'}`} />
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header 