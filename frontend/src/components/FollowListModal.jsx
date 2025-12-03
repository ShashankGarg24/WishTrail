import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Loader2 } from 'lucide-react'

const ListItem = ({ user, onOpenProfile }) => {
  const name = user?.name || 'Unknown'
  const username = user?.username || ''
  const avatar = user?.avatar || ''

  return (
    <button onClick={() => onOpenProfile?.(user)} className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3 transition-colors">
      <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</div>
        {username && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{username}</div>}
      </div>
    </button>
  )
}

const FollowListModal = ({ isOpen, onClose, activeTab = 'followers', onTabChange, followers = [], following = [], followersCount = 0, followingCount = 0, loading = false, onOpenProfile, hasMore = false, onLoadMore, loadingMore = false }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const list = activeTab === 'followers' ? followers : following

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50" 
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div 
            initial={{ scale: 0.96, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.96, opacity: 0, y: 20 }} 
            transition={{ duration: 0.2 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col" 
            style={{ height: '600px', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
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

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && list.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No {activeTab} yet.</div>
            )}
            {!loading && list.length > 0 && (
              <div className="space-y-2">
                {list.map((item, idx) => {
                  // Backend populates followerId for followers and followingId for following
                  const user = activeTab === 'followers' ? item?.followerId : item?.followingId;
                  const key = (user && (user._id || user.id)) || item?._id || item?.id || idx
                  return <ListItem key={key} user={user} onOpenProfile={onOpenProfile} />
                })}
                {hasMore && (
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

export default FollowListModal
