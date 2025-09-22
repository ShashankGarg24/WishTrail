import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Edit2, Trash2, Calendar, Tag, Clock, Star, Heart, Lock, Share2, Wrench } from 'lucide-react'
import useApiStore from '../store/apiStore'
import CompletionModal from './CompletionModal'
import EditWishModal from './EditWishModal'
import ShareModal from './ShareModal'
import GoalDivisionEditor from './GoalDivisionEditor'

const WishCard = ({ wish, year, index, onToggle, onDelete, onComplete, isViewingOwnGoals = true, onOpenGoal }) => {
  const { 
    completeGoal, 
    deleteGoal, 
    likeGoal,
    user,
    isAuthenticated,
    loading,
    loadHabits
  } = useApiStore()
  
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isDivisionOpen, setIsDivisionOpen] = useState(false)

  const handleToggle = () => {
    if (wish.completed) {
      // Show confirmation before uncompleting
      if (window.confirm('Are you sure you want to mark this goal as incomplete? This will remove your completion note and achievements.')) {
        onToggle?.(wish._id)
      }
    } else if (wish.isLocked) {
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
    if (window.confirm('Are you sure you want to delete this goal?')) {
      // Use the onDelete prop which properly handles dashboard stats refresh
      if (onDelete) {
        onDelete(wish._id)
      } else {
        // Fallback to direct call if no onDelete prop provided
        deleteGoal(wish._id)
      }
    }
  }

  const handleEdit = () => {
    setIsEditModalOpen(true)
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low':
        return 'text-green-500 bg-green-50 dark:bg-green-900/20'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getDurationColor = (duration) => {
    switch (duration) {
      case 'short-term':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'medium-term':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
      case 'long-term':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getDurationLabel = (duration) => {
    switch (duration) {
      case 'short-term':
        return 'Short-term'
      case 'medium-term':
        return 'Medium-term'
      case 'long-term':
        return 'Long-term'
      default:
        return 'Unknown'
    }
  }

  const isOverdue = () => {
    if (!wish.targetDate) return false
    const today = new Date()
    const target = new Date(wish.targetDate)
    return target < today && !wish.completed
  }

  const canComplete = () => {
    // Check if goal is locked or completed
    return !wish.completed && !wish.isLocked
  }

  const progressPercent = typeof wish?.progress?.percent === 'number' ? Math.max(0, Math.min(100, wish.progress.percent)) : null
  const hasDivision = ((wish?.subGoals?.length || 0) + (wish?.habitLinks?.length || 0)) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={() => { if (!isDivisionOpen) onOpenGoal?.(wish?._id) }}
      className={`glass-card-hover p-6 rounded-xl theme-transition ${onOpenGoal ? 'cursor-pointer' : ''} ${
        wish.completed ? 'bg-green-50/50 dark:bg-green-900/10' : ''
      } ${isOverdue() ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className={`flex-shrink-0 transition-colors ${
              wish.isLocked && !wish.completed ? 'cursor-not-allowed' : ''
            }`}
            disabled={loading || (wish.isLocked && !wish.completed)}
            title={
              wish.completed 
                  ? 'Mark as incomplete' 
                : wish.isLocked 
                  ? (() => {
                      const ms = typeof wish.timeUntilCanComplete === 'number' ? wish.timeUntilCanComplete : (wish.canCompleteAfter ? (new Date(wish.canCompleteAfter) - new Date()) : 0)
                      const s = Math.max(0, Math.floor(ms / 1000))
                      const days = Math.floor(s / 86400)
                      const hours = Math.floor((s % 86400) / 3600)
                      const mins = Math.floor((s % 3600) / 60)
                      if (days > 0) return `Locked • unlocks in ${days}d ${hours}h`
                      if (hours > 0) return `Locked • unlocks in ${hours}h ${mins}m`
                      if (mins > 0) return `Locked • unlocks in ${mins}m`
                      return 'Locked • unlocks soon'
                    })()
                  : 'Mark as complete'
            }
          >
            {wish.completed ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : wish.isLocked ? (
              <Lock className="h-6 w-6 text-gray-400" />
            ) : (
              <Circle className="h-6 w-6 text-gray-400 hover:text-primary-500" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 onClick={() => onOpenGoal?.(wish?._id)} className={`font-semibold text-lg line-clamp-2 break-anywhere ${
              wish.completed 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : 'text-gray-900 dark:text-white'
            } ${onOpenGoal ? 'cursor-pointer hover:underline' : ''}`}>
              {wish.title}
            </h3>
          </div>
        </div>
        
        {/* Only show edit/delete for own goals */}
        {isViewingOwnGoals && (
        <div className="flex items-center space-x-2">
          {/* Only show edit button for uncompleted goals */}
          {!wish.completed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
                disabled={loading}
            >
              <Edit2 className="h-4 w-4 text-gray-400 hover:text-primary-500" />
            </button>
          )}
          {/* Division editor button */}
          {!wish.completed && (
            <button
              onClick={async (e) => { e.stopPropagation(); try { await loadHabits({}).catch(()=>{}) } catch {} setIsDivisionOpen(true); }}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              disabled={loading}
              title="Edit goal breakdown"
            >
              <Wrench className="h-4 w-4 text-gray-400 hover:text-primary-500" />
            </button>
          )}
          {isViewingOwnGoals && wish.completed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
                disabled={loading}
            >
              <Share2 className="h-4 w-4 text-gray-400 hover:text-primary-500" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
              disabled={loading}
          >
            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 line-clamp-4 break-anywhere ${
        wish.completed 
          ? 'text-gray-400 dark:text-gray-500' 
          : 'text-gray-600 dark:text-gray-300'
      }`}>
        {wish.description}
      </p>

      {/* Inline compact progress bar (incomplete goals) */}
      {!wish.completed && hasDivision && progressPercent !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercent * 100) / 100}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-2 rounded-full bg-primary-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Category */}
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
          <Tag className="h-3 w-3 mr-1" />
          {wish.category}
        </span>

        {/* Priority */}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(wish.priority)}`}>
          {wish.priority.charAt(0).toUpperCase() + wish.priority.slice(1)}
        </span>

        {/* Duration */}
        {wish.duration && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDurationColor(wish.duration)}`}>
            <Clock className="h-3 w-3 mr-1" />
            {getDurationLabel(wish.duration)}
          </span>
        )}

        {/* Points */}
        {(() => { const pts = (typeof wish.pointsEarned === 'number' ? wish.pointsEarned : wish.points) || 0; return pts > 0; })() && (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          wish.completed 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
        }`}>
          <Star className="h-3 w-3 mr-1" />
            {((typeof wish.pointsEarned === 'number' ? wish.pointsEarned : wish.points) || 0)} pts
        </span>
        )}

        {/* Locked indicator */}
        {wish.isLocked && !wish.completed && (
          <span
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            title={(function() {
              const ms = typeof wish.timeUntilCanComplete === 'number' ? wish.timeUntilCanComplete : (wish.canCompleteAfter ? (new Date(wish.canCompleteAfter) - new Date()) : 0);
              const s = Math.max(0, Math.floor(ms / 1000));
              const days = Math.floor(s / 86400);
              const hours = Math.floor((s % 86400) / 3600);
              const mins = Math.floor((s % 3600) / 60);
              if (days > 0) return `Unlocks in ${days}d ${hours}h`;
              if (hours > 0) return `Unlocks in ${hours}h ${mins}m`;
              if (mins > 0) return `Unlocks in ${mins}m`;
              return 'Unlocks soon';
            })()}
          >
            <Lock className="h-3 w-3 mr-1" />
            {(function() {
              const ms = typeof wish.timeUntilCanComplete === 'number' ? wish.timeUntilCanComplete : (wish.canCompleteAfter ? (new Date(wish.canCompleteAfter) - new Date()) : 0);
              const s = Math.max(0, Math.floor(ms / 1000));
              const days = Math.floor(s / 86400);
              const hours = Math.floor((s % 86400) / 3600);
              const mins = Math.floor((s % 3600) / 60);
              if (days > 0) return `Locked • ${days}d ${hours}h`;
              if (hours > 0) return `Locked • ${hours}h ${mins}m`;
              if (mins > 0) return `Locked • ${mins}m`;
              return 'Locked • soon';
            })()}
          </span>
        )}

        {/* Overdue indicator */}
        {isOverdue() && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <Clock className="h-3 w-3 mr-1" />
            Overdue
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>
            Created {formatDate(wish.createdAt)}
          </span>
        </div>
        
        {wish.targetDate && (
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span className={isOverdue() ? 'text-red-500' : ''}>
              Due {formatDate(wish.targetDate)}
            </span>
          </div>
        )}
      </div>

      {/* Completion state */}
      {wish.completed && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Completed!</span>
              {wish.completedAt && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  {new Date(wish.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {/* Like button and count - only show for other users' goals */}
            {!isViewingOwnGoals && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-full transition-all duration-200 transform hover:scale-110 ${
                    wish.userHasLiked
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                  }`}
                  disabled={!isAuthenticated || loading}
                >
                  <Heart 
                    className={`h-4 w-4 transition-colors ${
                      wish.userHasLiked ? 'fill-current' : ''
                    }`} 
                  />
                  <span className="text-sm font-medium">
                    {wish.likeCount || 0}
                  </span>
                </button>
              </div>
            )}
            
            {/* Like count only (for own goals) */}
            {isViewingOwnGoals && wish.likeCount > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Heart className="h-3 w-3" />
                <span>{wish.likeCount}</span>
              </div>
            )}
          </div>
          {wish.completionNote && (
            <div className="mt-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded text-xs text-gray-700 dark:text-gray-300">
              <strong>What I did:</strong> <span className="line-clamp-3 break-anywhere inline-block align-top">{wish.completionNote}</span>
            </div>
          )}
        </div>
      )}
      {/* Completion Modal - Rendered at document body level */}
      {isCompletionModalOpen && createPortal(
        <CompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          onComplete={handleComplete}
          goalTitle={wish.title}
          goal={wish}
        />,
        document.body
      )}

      {/* Edit Modal - Rendered at document body level */}
      {isEditModalOpen && createPortal(
        <EditWishModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          goal={wish}
          year={year}
        />,
        document.body
      )}
      {/* Division Editor Modal */}
      {isDivisionOpen && createPortal(
        <GoalDivisionEditor
          goal={wish}
          habits={useApiStore.getState().habits}
          onClose={() => setIsDivisionOpen(false)}
        />,
        document.body
      )}
      {/* Share Modal - Rendered at document body level */}
      {isShareModalOpen && createPortal(
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          goal={wish}
          user={user}
        />,
        document.body
      )}
    </motion.div>
  )
}

export default WishCard 