import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../../store/apiStore'
import { X, User, BarChart3, Settings, LogOut, Bell } from 'lucide-react'

const AccountMenuSheet = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { logout, unreadNotifications, isAuthenticated } = useApiStore()
  if (!open) return null

  return (
    <AnimatePresence>
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
            <button onClick={() => { navigate('/profile?tab=overview'); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <User className="h-5 w-5" /> Profile
            </button>
            <button onClick={() => { navigate('/dashboard'); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <BarChart3 className="h-5 w-5" /> Dashboard
            </button>
            <button onClick={() => { navigate('/notifications'); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Bell className="h-5 w-5" /> Notifications
              {unreadNotifications > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-full bg-red-500 text-white">{unreadNotifications}</span>
              )}
            </button>
            <button onClick={() => { navigate('/settings'); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Settings className="h-5 w-5" /> Settings
            </button>
            {isAuthenticated && (
              <button onClick={async () => { await logout(); onClose(); navigate('/auth'); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600">
                <LogOut className="h-5 w-5" /> Logout
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AccountMenuSheet


