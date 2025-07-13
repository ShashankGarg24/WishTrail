import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, Tag, Star, Target, Trophy, Sparkles } from 'lucide-react'

const ShareableGoalCard = forwardRef(({ goal, user, onClose }, ref) => {
  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Health & Fitness':
        return 'bg-green-500'
      case 'Education & Learning':
        return 'bg-blue-500'
      case 'Career & Business':
        return 'bg-purple-500'
      case 'Personal Development':
        return 'bg-indigo-500'
      case 'Financial Goals':
        return 'bg-emerald-500'
      case 'Creative Projects':
        return 'bg-pink-500'
      case 'Travel & Adventure':
        return 'bg-orange-500'
      case 'Relationships':
        return 'bg-red-500'
      case 'Family & Friends':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
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
        return 'Goal'
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 shadow-2xl border border-blue-100 dark:border-gray-700 max-w-md mx-auto"
      style={{ width: '400px', height: '600px' }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl"></div>
        <div className="absolute top-4 right-4 w-16 h-16 bg-yellow-400 rounded-full opacity-20"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-pink-400 rounded-full opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-400 rounded-full opacity-10"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mb-3 shadow-lg">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
          Goal Achieved!
        </h2>
        <div className="flex items-center justify-center space-x-1 text-gray-600 dark:text-gray-400">
          <Sparkles className="h-3 w-3" />
          <span className="text-xs font-medium">WishTrail</span>
          <Sparkles className="h-3 w-3" />
        </div>
      </div>

      {/* Goal Title */}
      <div className="relative z-10 mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center leading-tight px-2">
          "{goal.title}"
        </h3>
      </div>

      {/* Goal Details */}
      <div className="relative z-10 space-y-3 mb-4">
        {/* Category & Priority */}
        <div className="flex items-center justify-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${getCategoryColor(goal.category)}`}></div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {goal.category}
            </span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {goal.priority} priority
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center space-x-1">
          <Target className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {getDurationLabel(goal.duration)}
          </span>
        </div>

        {/* Completion Date */}
        <div className="flex items-center justify-center space-x-1">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Completed {formatDate(goal.completedAt)}
          </span>
        </div>

        {/* Points Earned */}
        {goal.pointsEarned && (
          <div className="flex items-center justify-center space-x-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {goal.pointsEarned} points earned
            </span>
          </div>
        )}
      </div>

      {/* Completion Note */}
      {goal.completionNote && goal.shareCompletionNote && (
        <div className="relative z-10 mb-4">
          <div className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl p-3 border border-white/20 dark:border-gray-600/20">
            <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
              What I accomplished:
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {goal.completionNote.length > 150 ? `${goal.completionNote.substring(0, 150)}...` : goal.completionNote}
            </p>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center justify-center space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <img
            src={user.avatar || '/api/placeholder/32/32'}
            alt={user.name}
            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-600 shadow-sm"
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              via WishTrail
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-6 right-6 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-6 left-6 w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-20 animate-pulse delay-700"></div>
      <div className="absolute top-1/3 left-4 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
    </motion.div>
  )
})

ShareableGoalCard.displayName = 'ShareableGoalCard'

export default ShareableGoalCard