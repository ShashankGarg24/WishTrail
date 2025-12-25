import { lazy, Suspense, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Edit2, Trash2, Calendar, Tag, Clock, Star, Heart, Share2, FileText } from 'lucide-react'
import useApiStore from '../store/apiStore'
const CompletionModal = lazy(() => import('./CompletionModal'));
const ShareModal = lazy(() => import('./ShareModal'));
const GoalDivisionEditor = lazy(() => import('./GoalDivisionEditor'));
const CreateGoalWizard = lazy(() => import('./CreateGoalWizard'));
const DeleteConfirmModal = lazy(() => import('./DeleteConfirmModal'));

const WishCard = ({ wish, year, index, onToggle, onDelete, onComplete, isViewingOwnGoals = true, onOpenGoal, onOpenAnalytics, footer, isReadOnly = false }) => {
  const { 
    deleteGoal, 
    likeGoal,
    user,
    isAuthenticated,
    loading
  } = useApiStore()
  
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isDivisionOpen, setIsDivisionOpen] = useState(false)
  const [isEditWizardOpen, setIsEditWizardOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggle = () => {
    if (wish.completed) {
      // Completed goals cannot be uncompleted
      return;
    } else {
      setIsCompletionModalOpen(true);
    }
  }

  const handleComplete = (formDataOrNote, shareCompletionNoteParam = true) => {
    // Backward compatibility: if first arg is FormData, pass as-is. Else build FormData
    if (formDataOrNote instanceof FormData) {
      return onComplete?.(wish._id, formDataOrNote)
    }
    const form = new FormData()
    form.append('completionNote', String(formDataOrNote || ''))
    form.append('shareCompletionNote', String(shareCompletionNoteParam))
    return onComplete?.(wish._id, form)
  }

  const handleDelete = () => {
    // If parent provides onDelete handler, use it directly (parent will show its own modal with dependencies)
    if (onDelete) {
      onDelete(wish._id)
    } else {
      // Otherwise, show our own delete modal
      setIsDeleteModalOpen(true)
    }
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      // Direct API call (only used when no onDelete prop provided)
      await deleteGoal(wish._id)
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting goal:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setIsEditWizardOpen(true)
  }

  const handleLike = () => {
    if (!isAuthenticated) return
    likeGoal(wish._id)
  }

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }



  const isOverdue = () => {
    if (!wish.targetDate) return false
    const today = new Date()
    const target = new Date(wish.targetDate)
    return target < today && !wish.completed
  }

  const canComplete = () => {
    // Check if goal is completed
    return !wish.completed
  }

  const progressPercent = typeof wish?.progress?.percent === 'number' ? Math.max(0, Math.min(100, wish.progress.percent)) : null
  const hasDivision = ((wish?.subGoals?.length || 0) + (wish?.habitLinks?.length || 0)) > 0
  const isCommunityMirror = !!(wish?.communityInfo || (wish?.category === 'Community'))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={() => { if (!isDivisionOpen && !isReadOnly) onOpenAnalytics?.(wish?._id) }}
      className={`glass-card-hover p-4 rounded-lg theme-transition ${onOpenAnalytics ? 'cursor-pointer' : ''} ${
        wish.completed ? 'bg-green-50/50 dark:bg-green-900/10' : ''
      } ${isOverdue() ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); if (isReadOnly || wish.completed) return; handleToggle(); }}
            className={`flex-shrink-0 transition-colors ${
              isReadOnly ? 'cursor-not-allowed' : ''
            }`}
            disabled={loading || isReadOnly || wish.completed}
            title={
              wish.completed 
                  ? 'Goal completed permanently' 
                  : 'Mark as complete'
            }
          >
            {wish.completed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 hover:text-primary-500" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base line-clamp-2 break-anywhere ${
              wish.completed 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {wish.title}
            </h3>
          </div>
        </div>
        
        {/* Only show edit/delete for own goals */}
        {isViewingOwnGoals && (
        <div className="flex items-center gap-1 ml-2">
          {/* Only show edit button for uncompleted goals (not for community goals) */}
          {!wish.completed && !isCommunityMirror && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={loading}
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 hover:text-primary-500" />
            </button>
          )}
          {/* Removed wrench button; flow uses edit wizard */}
          {isViewingOwnGoals && wish.completed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={loading}
            >
              <Share2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 hover:text-primary-500" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={loading}
          >
            <Trash2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 hover:text-red-500" />
          </button>
        </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-xs mb-3 line-clamp-4 break-anywhere ${
        wish.completed 
          ? 'text-gray-400 dark:text-gray-500' 
          : 'text-gray-600 dark:text-gray-300'
      }`}>
        {wish.description}
      </p>

      {/* Inline compact progress bar (incomplete goals) */}
      {!wish.completed && hasDivision && progressPercent !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercent * 100) / 100}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Category */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
          <Tag className="h-2.5 w-2.5 mr-1" />
          {wish.category}
        </span>

        {/* Overdue indicator */}
        {isOverdue() && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Overdue
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-2">
        <div className="flex items-center space-x-1">
          <Calendar className="h-2.5 w-2.5" />
          <span>
            Created {formatDate(wish.createdAt)}
          </span>
        </div>
        
        {wish.targetDate && (
          <div className="flex items-center space-x-1">
            <Calendar className="h-2.5 w-2.5" />
            <span className={isOverdue() ? 'text-red-500' : ''}>
              Due {formatDate(wish.targetDate)}
            </span>
          </div>
        )}
      </div>

      {/* Completion state */}
      {wish.completed && (
        <div className="mt-3 p-2.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Completed!</span>
              {wish.completedAt && (
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  {new Date(wish.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {/* Like button and count - only show for other users' goals */}
            {!isViewingOwnGoals && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-all duration-200 transform hover:scale-110 ${
                    wish.userHasLiked
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                  }`}
                  disabled={!isAuthenticated || loading}
                >
                  <Heart 
                    className={`h-3.5 w-3.5 transition-colors ${
                      wish.userHasLiked ? 'fill-current' : ''
                    }`} 
                  />
                  <span className="text-xs font-medium">
                    {Number(wish.likeCount) || 0}
                  </span>
                </button>
              </div>
            )}
            
            {/* Like count only (for own goals) */}
            {isViewingOwnGoals && Number(wish.likeCount) > 0 && (
              <div className="flex items-center space-x-1 text-[10px] text-gray-500 dark:text-gray-400">
                <Heart className="h-2.5 w-2.5" />
                <span>{Number(wish.likeCount) || 0}</span>
              </div>
            )}
          </div>
          {wish.completionNote && (
            <div className="mt-1.5 p-2 bg-white/50 dark:bg-gray-800/50 rounded text-[10px] text-gray-700 dark:text-gray-300">
              <strong>What I did:</strong> <span className="line-clamp-3 break-anywhere inline-block align-top">{wish.completionNote}</span>
            </div>
          )}
        </div>
      )}

      {/* View Post Button */}
      {!isReadOnly && onOpenGoal && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenGoal?.(wish?._id); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
        >
          <FileText className="h-3.5 w-3.5" />
          View Post
        </button>
      )}
      
      {/* Optional footer slot for extra actions (e.g., community link) */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
      {/* Completion Modal - Rendered at document body level */}
      {isCompletionModalOpen && createPortal(
        <Suspense fallback={null}><CompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          onComplete={handleComplete}
          goalTitle={wish.title}
          goal={wish}
        /></Suspense>,
        document.body
      )}

      {/* Edit Wizard - Rendered at document body level */}
      {isEditWizardOpen && createPortal(
        <Suspense fallback={null}><CreateGoalWizard
          isOpen={isEditWizardOpen}
          onClose={() => setIsEditWizardOpen(false)}
          year={year}
          editMode={true}
          goalId={wish._id}
          initialData={{
            title: wish.title,
            description: wish.description,
            category: wish.category,
            targetDate: wish.targetDate || '',
            isPublic: wish.isPublic,
            createdAt: wish.createdAt,
            subGoals: wish.subGoals || [],
            habitLinks: wish.habitLinks || []
          }}
        /></Suspense>,
        document.body
      )}
      {/* Division Editor Modal - no longer opened via UI (kept for safety behind state) */}
      {isDivisionOpen && createPortal(
        <Suspense fallback={null}><GoalDivisionEditor
          goal={wish}
          habits={useApiStore.getState().habits}
          onClose={() => setIsDivisionOpen(false)}
        /></Suspense>,
        document.body
      )}
      {/* Share Modal - Rendered at document body level */}
      {isShareModalOpen && createPortal(
        <Suspense fallback={null}><ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          goal={wish}
          user={user}
        /></Suspense>,
        document.body
      )}
      {/* Delete Confirm Modal - Rendered at document body level */}
      {isDeleteModalOpen && createPortal(
        <Suspense fallback={null}><DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          goalTitle={wish.title}
          isDeleting={isDeleting}
        /></Suspense>,
        document.body
      )}
    </motion.div>
  )
}

export default WishCard 