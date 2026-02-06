import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Loader2 } from 'lucide-react'

const THEME_COLOR = '#4c99e6'

const ListItem = ({ user, onOpenProfile, actionType, onFollowBack, onRemove }) => {
  const name = user?.name || 'Unknown'
  const username = user?.username || ''
  const avatar = user?.avatar || ''
  const initials = name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="w-full flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => onOpenProfile?.(user)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors p-1 -m-1"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ backgroundColor: THEME_COLOR }}>
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</div>
          {username && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{username}</div>}
        </div>
      </button>
      {actionType === 'follow_back' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFollowBack?.(user); }}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: THEME_COLOR }}
        >
          Follow Back
        </button>
      )}
      {actionType === 'remove' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.(user); }}
          className="flex-shrink-0 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  )
}

const FollowListModal = ({ isOpen, onClose, activeTab = 'followers', onTabChange, followers = [], following = [], followersCount = 0, followingCount = 0, loading = false, onOpenProfile, hasMore = false, onLoadMore, loadingMore = false, getIsFollowingBack, onFollowBack, onRemove }) => {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col font-manrope"
            style={{ height: '600px', maxHeight: '85vh', fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: THEME_COLOR }} />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Connections</span>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 pt-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex gap-0">
                <button
                  type="button"
                  onClick={() => onTabChange?.('followers')}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'followers' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Followers ({followersCount})
                  {activeTab === 'followers' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: THEME_COLOR }} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange?.('following')}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'following' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Following ({followingCount})
                  {activeTab === 'following' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: THEME_COLOR }} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {loading && (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  ))}
                </div>
              )}
              {!loading && list.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No {activeTab} yet.</div>
              )}
              {!loading && list.length > 0 && (
                <div>
                  {list.map((item, idx) => {
                    const key = item?.username || item?._id || idx
                    const isFollowingBack = typeof getIsFollowingBack === 'function' ? getIsFollowingBack(item) : item?.isFollowingBack
                    const actionType = activeTab === 'followers' && getIsFollowingBack ? (isFollowingBack ? 'remove' : 'follow_back') : undefined
                    return (
                      <ListItem
                        key={key}
                        user={item}
                        onOpenProfile={onOpenProfile}
                        actionType={actionType}
                        onFollowBack={onFollowBack}
                        onRemove={onRemove}
                      />
                    )
                  })}
                  {hasMore && (
                    <div className="py-3">
                      <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!loading && list.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
                <button type="button" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                  {activeTab === 'followers' ? 'SHOWING ALL FOLLOWERS' : 'SHOWING ALL FOLLOWING'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

export default FollowListModal
