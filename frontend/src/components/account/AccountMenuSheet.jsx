import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../../store/apiStore'
import { X, User, BarChart3, Settings, LogOut, MessageSquarePlus, Star } from 'lucide-react'
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
        <div className="absolute inset-0 bg-black/40" />
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-2xl p-4 max-h-[75vh] overflow-auto"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Account</div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-2">
            <button onClick={() => { navigate(`/profile/@${currentUser?.username}?tab=overview`); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <User className="h-5 w-5" /> Profile
            </button>
            <button onClick={() => { navigate('/dashboard'); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <BarChart3 className="h-5 w-5" /> Dashboard
            </button>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('wt_open_settings')); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Settings className="h-5 w-5" /> Settings
            </button>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('wt_open_feedback')); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <MessageSquarePlus className="h-5 w-5" /> Feedback
            </button>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('wt_open_rating')); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Star className="h-5 w-5" /> Rate Us
            </button>
            {isAuthenticated && (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600">
                <LogOut className="h-5 w-5" /> Logout
              </button>
            )}
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

export default AccountMenuSheet


