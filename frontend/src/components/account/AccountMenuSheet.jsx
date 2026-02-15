import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../../store/apiStore'
import { User, Settings, MessageSquare, LogOut, ChevronRight, Edit } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

const AccountMenuSheet = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { logout, isAuthenticated, user: currentUser } = useApiStore()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const logoutTimeoutRef = useRef(null)

  // Reset logout modal state when sheet opens and clear any pending timeouts
  useEffect(() => {
    if (open) {
      setIsLogoutModalOpen(false)
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current)
        logoutTimeoutRef.current = null
      }
    }
  }, [open])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    onClose()
    logoutTimeoutRef.current = setTimeout(() => {
      setIsLogoutModalOpen(true)
      logoutTimeoutRef.current = null
    }, 100)
  }

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <>
    <AnimatePresence>
      {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60]"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            {/* Profile Section */}
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {currentUser?.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-white" />
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {currentUser?.name || 'User'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{currentUser?.username || 'username'}
                </p>
              </div>
              <button
                onClick={() => { navigate('/settings?tab=personal'); onClose(); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Edit profile"
              >
                <Edit className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-2 space-y-1">
              <MenuItem 
                icon={User}
                label="My Profile"
                onClick={() => { navigate(`/profile/@${currentUser?.username}?tab=overview`); onClose(); }}
              />
              <MenuItem 
                icon={Settings}
                label="Settings"
                onClick={() => { navigate(`/settings`); onClose(); }}
              />
              <MenuItem 
                icon={MessageSquare}
                label="Feedback"
                onClick={() => { window.dispatchEvent(new CustomEvent('wt_open_feedback')); onClose(); }}
              />
            </div>

            {/* Sign Out */}
            <div className="px-4 py-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>

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
    </>
  )
}

// Menu Item Component
const MenuItem = ({ icon: Icon, label, badge, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
  >
    <div className="w-10 h-10 flex items-center justify-center">
      <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" strokeWidth={2} />
    </div>
    <span className="flex-1 text-left text-base font-medium text-gray-900 dark:text-white">
      {label}
    </span>
    {badge ? (
      <span className="w-6 h-6 flex items-center justify-center bg-[#4c99e6] text-white text-xs font-bold rounded-full">
        {badge}
      </span>
    ) : (
      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" strokeWidth={2} />
    )}
  </button>
)

export default AccountMenuSheet


