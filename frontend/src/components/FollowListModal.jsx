import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users } from 'lucide-react'

const ListItem = ({ user, onOpenProfile }) => {
  const name = user?.name || 'Unknown'
  const phone = user?.phone || user?.phoneNumber || '—'
  const avatar = user?.avatar || ''

  return (
    <button onClick={() => onOpenProfile?.(user)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 dark:text-white truncate">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{phone}</div>
      </div>
    </button>
  )
}

const FollowListModal = ({ isOpen, onClose, activeTab = 'followers', onTabChange, followers = [], following = [], followersCount = 0, followingCount = 0, loading = false, onOpenProfile }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const list = activeTab === 'followers' ? followers : following

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Connections</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500" /></button>
          </div>

          <div className="px-4">
            <div className="flex items-center gap-2">
              <button onClick={() => onTabChange?.('followers')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'followers' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                Followers ({followersCount})
              </button>
              <button onClick={() => onTabChange?.('following')} className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'following' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                Following ({followingCount})
              </button>
            </div>
          </div>

          <div className="p-4 max-h-[70vh] overflow-auto space-y-2">
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && list.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">No {activeTab} yet.</div>
            )}
            {!loading && list.length > 0 && (
              <div className="space-y-2">
                {list.map((item, idx) => {
                  const user = activeTab === 'followers'
                    ? (typeof item?.followerId === 'object' ? item?.followerId : item)
                    : (typeof item?.followingId === 'object' ? item?.followingId : item)
                  const key = (user && (user._id || user.id)) || item?._id || item?.id || idx
                  return <ListItem key={key} user={user} onOpenProfile={onOpenProfile} />
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default FollowListModal
