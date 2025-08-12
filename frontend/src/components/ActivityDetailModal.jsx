import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { activitiesAPI } from '../services/api'

const ActivityDetailModal = ({ isOpen, onClose, activity, onOpenComments }) => {
  const { user } = useApiStore()

  const sharedNote = activity?.data?.metadata?.completionNote || activity?.data?.completionNote || ''
  const sharedImage = activity?.data?.metadata?.completionAttachmentUrl || activity?.data?.completionAttachmentUrl || ''
  const hasImage = Boolean(sharedImage)
  const hasNote = Boolean(sharedNote)

  const formatTimeAgo = (iso) => {
    const now = new Date()
    const date = new Date(iso)
    const diff = Math.max(0, Math.floor((now - date) / 1000))
    if (diff < 60) return `${diff}s ago`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
  }

  // Determine completion/creation time for header and info row
  const activityTime = activity?.data?.metadata?.completedAt || activity?.data?.completedAt || activity?.completedAt || activity?.createdAt
  const totalComments = activity?.commentCount || 0

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white truncate">{activity?.name || 'User'}</div>
              {activityTime && (
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatTimeAgo(activityTime)}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">❤ {activity?.likeCount ?? 0}</span>
              <button onClick={() => onOpenComments && onOpenComments(activity)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                <MessageCircle className="h-4 w-4" /> {totalComments}
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Details-only content */}
          <div className="flex-1 overflow-auto">
            {hasImage && (
              <div className="bg-black/5 dark:bg-black flex items-center justify-center p-2">
                <img src={sharedImage} alt="Attachment" className="max-h-[60vh] w-full object-contain rounded-lg" />
              </div>
            )}
            {hasNote && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{sharedNote}</div>
                {activity?.type === 'goal_completed' && activityTime && (
                  <div className="mt-2 text-xs text-gray-500">Completed {formatTimeAgo(activityTime)}</div>
                )}
              </div>
            )}
            {!hasNote && activity?.type === 'goal_completed' && activityTime && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                Completed {formatTimeAgo(activityTime)}
              </div>
            )}
          </div>

          {/* No comments UI here; handled by separate comments modal */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ActivityDetailModal 