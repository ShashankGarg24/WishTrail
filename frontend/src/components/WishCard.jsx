import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Edit2, Trash2, Calendar, Tag, Clock, Star, Heart, Lock } from 'lucide-react'
import useApiStore from '../store/apiStore'
import CompletionModal from './CompletionModal'
import EditWishModal from './EditWishModal'

const WishCard = ({ wish, year, index, onToggle, onDelete, onComplete, isViewingOwnGoals = true }) => {
  const { 
    completeGoal, 
    deleteGoal, 
    likeGoal,
    user,
    isAuthenticated,
    loading
  } = useApiStore()
  
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleToggle = () => {
    if (wish.completed) {
      onToggle?.(wish._id)
    } else if (wish.isLocked) {
      return;
    } else {
      setIsCompletionModalOpen(true);
    }
  }

  const handleComplete = (completionNote) => {
    onComplete?.(wish._id, completionNote)
    setIsCompletionModalOpen(false)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(wish._id)
    }
  }

  const handleEdit = () => {
    setIsEditModalOpen(true)
  }

  const handleLike = () => {
    if (!isAuthenticated) return
    likeGoal(wish._id)
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`glass-card-hover p-6 rounded-xl theme-transition ${
        wish.completed ? 'bg-green-50/50 dark:bg-green-900/10' : ''
      } ${isOverdue() ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggle}
            className={`flex-shrink-0 transition-colors ${
              wish.isLocked && !wish.completed ? 'cursor-not-allowed' : ''
            }`}
            disabled={loading || (wish.isLocked && !wish.completed)}
            title={
              wish.completed 
                ? 'Mark as incomplete' 
                : wish.isLocked 
                  ? 'Goal is locked - wait for minimum duration'
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
            <h3 className={`font-semibold text-lg ${
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEdit}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              disabled={loading}
            >
              <Edit2 className="h-4 w-4 text-gray-400 hover:text-primary-500" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 ${
        wish.completed 
          ? 'text-gray-400 dark:text-gray-500' 
          : 'text-gray-600 dark:text-gray-300'
      }`}>
        {wish.description}
      </p>

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
        {wish.points && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            wish.completed 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
          }`}>
            <Star className="h-3 w-3 mr-1" />
            {wish.points} pts
          </span>
        )}

        {/* Locked indicator */}
        {wish.isLocked && !wish.completed && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            <Lock className="h-3 w-3 mr-1" />
            Locked
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

      {/* Progress indicator */}
      {wish.completed && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Completed!
              </span>
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
              <strong>What I did:</strong> {wish.completionNote}
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
    </motion.div>
  )
}

export default WishCard 