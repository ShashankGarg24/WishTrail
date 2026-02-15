import CategoryBadge from './CategoryBadge';
import { useEffect, useState, lazy, Suspense } from 'react'
import { Eye, BarChart3, Share2, CheckCircle, X } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
const ShareModal = lazy(() => import('./ShareModal'));

const THEME_COLOR = '#4c99e6'

export default function GoalDetailsModal({ goal, isOpen, onClose, onViewPost }) {
  const navigate = useNavigate()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const { user } = useApiStore()

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [isOpen])

  if (!isOpen || !goal) {
    return null
  }

  const goalId = goal?.id || goal?._id || ''
  
  const handleAnalytics = () => {
    if (!goalId) return
    onClose?.()
    navigate(`/goals/${goalId}/analytics`)
  }

  const handleViewPost = () => {
    if (!goalId) return
    if (onViewPost) {
      onViewPost(goalId)
    } else {
      onClose?.()
      navigate(`/goals/${goalId}`)
    }
  }

  const handleShare = (e) => {
    e?.stopPropagation()
    setIsShareModalOpen(true)
  }

  const handleMarkComplete = async () => {
    if (!goalId) return
    setIsCompleting(true)
    try {
      const res = await useApiStore.getState().toggleGoalCompletion(goalId, '')
      if (res?.success) {
        window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Goal updated', type: 'success' } }))
        // close modal and let store update reflect
        onClose?.()
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Failed to update', type: 'error' } }))
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} style={{ zIndex: 9998 }} />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui', maxHeight: '90vh', zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 pr-10">{goal.title}</h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <CategoryBadge category={goal.category} />
            {goal.priority && (
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                {goal.priority}
              </span>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto scrollbar-hide flex-1 min-h-0">
          {goal.description && (
            <div>
              <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Overview</h4>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{goal.description}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleAnalytics}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Analytics
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleViewPost}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Post
              </button>

              {goal.completedAt ? (
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Share
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isCompleting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {isCompleting ? 'Updating...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            goal={goal}
            user={user}
          />
        </Suspense>
      )}
    </div>
  )
}
