import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, LogOut, Settings, Star, MessageSquare } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import useApiStore from '../store/apiStore'
import FeedbackButton from './FeedbackButton'

const Header = () => {
  const { isAuthenticated, logout, unreadNotifications, getNotifications, user: currentUser } = useApiStore()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Main navigation links
  const mainNavigation = [
    { name: 'Feed', href: '/feed' },
    { name: 'Inspiration', href: '/inspiration' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Leaderboard', href: '/leaderboard' },
  ]

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    compute()
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
    setShowLogoutModal(false)
    setIsProfileMenuOpen(false)
    await logout()
    navigate('/')
  }

  useEffect(() => {
    if (isAuthenticated) {
      getNotifications()
    }
  }, [isAuthenticated])

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#4c99e6] fill-[#4c99e6]" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white font-manrope">
              WishTrail
            </span>
          </Link>

          {/* Navigation Links - Only for authenticated users */}
          {isAuthenticated && (
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
          )}

          {/* Public Navigation - Only for unauthenticated users */}
          {!isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6 sm:gap-8">
              <Link
                to="/inspiration"
                className="font-medium font-manrope text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm sm:text-base"
              >
                Inspiration
              </Link>
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated ? (
              <>
                {/* Search Icon */}
                {!isMobile && <button
                  onClick={() => navigate('/discover')}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>}

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

                {/* Separator */}
                {!isMobile && <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>}

                {/* User Avatar and Dropdown */}
                {!isMobile &&<div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg py-1.5 px-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  {currentUser?.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold font-manrope">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                  >
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md overflow-hidden">
                          {currentUser?.avatar ? (
                            <img 
                              src={currentUser.avatar} 
                              alt={currentUser.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-lg font-bold font-manrope">
                              {currentUser?.name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold text-gray-900 dark:text-white font-manrope truncate">
                            {currentUser?.name || 'User'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope truncate">
                            @{currentUser?.username || 'username'}
                          </div>
                          {currentUser?.premium && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full text-[10px] font-bold text-white uppercase tracking-wider mt-0.5">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              Pro Explorer
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          navigate(`/profile/@${currentUser?.username}`)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-manrope group"
                      >
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium">My Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          navigate('/settings')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-manrope group"
                      >
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium">Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          setShowFeedbackModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-manrope group"
                      >
                        <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium">Feedback</span>
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          setShowLogoutModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-manrope group"
                      >
                        <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>}
              </>
            ) : (
              <>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowLogoutModal(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
              >
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                    <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-manrope mb-2">
                    Sign Out
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope mb-6">
                    Are you sure you want to sign out of your account?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLogoutModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-manrope"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors font-manrope"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <FeedbackButton 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </header>
  )
}

export default Header
