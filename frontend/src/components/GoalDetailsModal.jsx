import CategoryBadge from './CategoryBadge';
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { Eye, BarChart3, X, Target, Heart, Smile, Meh, Frown, Sparkles, MoreHorizontal, ChevronDown, Send } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
import toast from 'react-hot-toast';
import ConfirmActionModal from './ConfirmActionModal';
const ShareModal = lazy(() => import('./ShareModal'));

const THEME_COLOR = '#4c99e6'

const EMOTIONS = [
  { id: 'great', label: 'GREAT', icon: Heart },
  { id: 'good', label: 'GOOD', icon: Smile },
  { id: 'okay', label: 'OKAY', icon: Meh },
  { id: 'challenging', label: 'TOUGH', icon: Frown },
  { id: 'neutral', label: 'SKIP', icon: Sparkles }
]

export default function GoalDetailsModal({ goal, isOpen, onClose, onViewPost }) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState(null)
  const [hasTodayUpdate, setHasTodayUpdate] = useState(false)
  const [isUpdatesPublic, setIsUpdatesPublic] = useState(true)
  const [isTogglingPublic, setIsTogglingPublic] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const moreMenuRef = useRef(null)
  const { user } = useApiStore()

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !goal) return

    const goalId = goal?.id || goal?._id
    const isCompleted = !!goal?.completedAt
    setIsMoreMenuOpen(false)
    setIsUpdatesPublic(goal?.isUpdatesPublic !== false)

    if (!goalId || isCompleted) {
      setUpdateText('')
      setSelectedEmotion(null)
      setHasTodayUpdate(false)
      return
    }

    let isMounted = true
    ;(async () => {
      setIsLoadingUpdate(true)
      const res = await useApiStore.getState().getGoalUpdateToday(goalId)
      if (!isMounted) return

      if (res?.success && res.goalUpdate) {
        setUpdateText(res.goalUpdate.text || '')
        setSelectedEmotion(res.goalUpdate.emotion || null)
        setHasTodayUpdate(true)
      } else {
        setUpdateText('')
        setSelectedEmotion(null)
        setHasTodayUpdate(false)
      }

      setIsLoadingUpdate(false)
    })()

    return () => {
      isMounted = false
    }
  }, [goal, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  if (!isOpen || !goal) {
    return null
  }

  const goalId = goal?.id || goal?._id || ''
  const isCompleted = !!goal?.completedAt
  const trimmedText = updateText.trim()
  const canSubmit = !isCompleted && !isSubmitting && (trimmedText.length > 0 || !!selectedEmotion)
  
  const handleAnalytics = () => {
    if (!goalId) return
    setIsMoreMenuOpen(false)
    onClose?.()
    navigate(`/goals/${goalId}/analytics`)
  }

  const handleViewPost = () => {
    if (!goalId) return
    setIsMoreMenuOpen(false)
    if (onViewPost) {
      onViewPost(goalId)
    } else {
      onClose?.()
      navigate(`/goals/${goalId}`)
    }
  }

  const handleShare = (e) => {
    e?.stopPropagation()
    setIsMoreMenuOpen(false)
    setIsShareModalOpen(true)
  }

  const handleToggleUpdatesPublic = async () => {
    if (!goalId || isTogglingPublic) return

    setIsTogglingPublic(true)
    const newValue = !isUpdatesPublic
    
    const res = await useApiStore.getState().updateGoal(goalId, {
      isUpdatesPublic: newValue
    })

    if (res?.success) {
      setIsUpdatesPublic(newValue)
      toast.success(`Updates are now ${newValue ? 'public' : 'private'}`)
    } else {
      toast.error(res?.error || 'Failed to update setting')
    }
    
    setIsTogglingPublic(false)
  }

  const handleSubmitUpdate = async () => {
    if (!canSubmit || !goalId) return

    setIsSubmitting(true)
    const res = await useApiStore.getState().upsertGoalUpdateToday(goalId, {
      text: trimmedText || null,
      emotion: selectedEmotion || null
    })
    setIsSubmitting(false)

    if (res?.success) {
      setHasTodayUpdate(true)
      toast.success('Update logged successfully')
      return
    }

    toast.error(res?.error || 'Failed to log update')
  }

  const handleClearToday = async () => {
    if (!goalId || isCompleted) return

    setIsClearConfirmOpen(true)
  }

  const confirmClearToday = async () => {
    if (!goalId || isCompleted) return

    setIsSubmitting(true)
    const res = await useApiStore.getState().clearGoalUpdateToday(goalId)
    setIsSubmitting(false)
    if (res?.success) {
      setUpdateText('')
      setSelectedEmotion(null)
      setHasTodayUpdate(false)
      setIsClearConfirmOpen(false)
      toast.success('Update cleared successfully')
      return
    }

    toast.error(res?.error || 'Failed to clear update')
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} style={{ zIndex: 9998 }} />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui', maxHeight: '90vh', zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 relative bg-gray-50/70 dark:bg-gray-900/20">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
            <Target className="h-4 w-4 text-[#4c99e6]" />
            <span>Update Goal</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5 overflow-y-auto scrollbar-hide flex-1 min-h-0">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.title}</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">What did you accomplish today?</label>
            <textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value.slice(0, 300))}
              placeholder="Share your progress, small wins, or lessons learned..."
              disabled={isCompleted || isLoadingUpdate || isSubmitting}
              rows={4}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#4c99e6]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{trimmedText.length}/300</span>
              {hasTodayUpdate && !isCompleted && (
                <button
                  type="button"
                  onClick={handleClearToday}
                  className="text-xs font-medium text-[#4c99e6] hover:underline"
                >
                  Clear today
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 text-center">How are you feeling about your progress?</p>
            <div className="grid grid-cols-5 gap-3">
              {EMOTIONS.map((emotion) => {
                const Icon = emotion.icon
                const isSelected = selectedEmotion === emotion.id
                return (
                  <button
                    key={emotion.id}
                    type="button"
                    disabled={isCompleted || isSubmitting}
                    onClick={() => setSelectedEmotion((prev) => prev === emotion.id ? null : emotion.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#4c99e6] border-[#4c99e6] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`text-[11px] font-medium ${isSelected ? 'text-[#4c99e6]' : 'text-gray-400'}`}>
                      {emotion.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Make updates public</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Share progress with the Growth Feed</p>
            </div>
            <button
              type="button"
              disabled={isTogglingPublic}
              onClick={handleToggleUpdatesPublic}
              aria-pressed={isUpdatesPublic}
              className={`relative inline-flex h-6 w-11 items-center overflow-hidden rounded-full transition-colors ${isUpdatesPublic ? 'bg-[#4c99e6]' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-60`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isUpdatesPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {isCompleted && (
            <p className="text-sm text-red-500">Cannot log updates on completed goal</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {hasTodayUpdate && !isCompleted ? (
              <button
                type="button"
                onClick={handleClearToday}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Clear today
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                More <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSubmitUpdate}
                disabled={!canSubmit || isLoadingUpdate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: THEME_COLOR }}
              >
                 {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>

          {isMoreMenuOpen && (
            <div ref={moreMenuRef} className="absolute right-6 bottom-20 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={handleAnalytics}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" /> Analytics
              </button>
              <button
                type="button"
                onClick={handleViewPost}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2"
              >
                <Eye className="h-4 w-4" /> View Post
              </button>
            </div>
          )}
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

      <ConfirmActionModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearToday}
        title="Clear today's update?"
        message="This will remove your goal update for today."
        confirmText="Clear today"
        isLoading={isSubmitting}
      />
    </div>
  )
}
