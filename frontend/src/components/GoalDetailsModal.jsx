import { useEffect, useState } from 'react'
import { Eye, BarChart3, Share2, CheckCircle, X } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'

const THEME_COLOR = '#4c99e6'

export default function GoalDetailsModal({ goal, isOpen, onClose, onViewPost }) {
  const navigate = useNavigate()
  const [isCompleting, setIsCompleting] = useState(false)

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
    try {
      if (navigator.share) {
        navigator.share({ 
          title: goal?.title || 'Goal', 
          text: goal?.description || '', 
          url: window.location.href 
        })
      }
    } catch (err) {
      // ignore
    }
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
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 pr-10">{goal.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {goal.category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[#23527a] bg-blue-50 dark:bg-blue-900/20">
                {goal.category}
              </span>
            )}
            {goal.priority && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                {goal.priority}
              </span>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {goal.description && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Overview</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{goal.description}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAnalytics}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BarChart3 className="h-4 w-4" /> View Analytics
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleViewPost}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Eye className="h-4 w-4" /> View Post
              </button>

              {goal.completed ? (
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-sm font-medium hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isCompleting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <CheckCircle className="h-4 w-4" /> {isCompleting ? 'Updating...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
