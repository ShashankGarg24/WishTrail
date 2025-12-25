import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Target, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Heart, 
  MessageCircle,
  ListChecks,
  Activity,
  Award,
  Zap
} from 'lucide-react'
import useApiStore from '../store/apiStore'
import { createPortal } from 'react-dom'
import { API_CONFIG } from '../config/api'
import ExpandableText from '../components/ExpandableText'

const CompletionModal = lazy(() => import('../components/CompletionModal'));

const GoalAnalyticsPage = () => {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [goalData, setGoalData] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const { getGoalAnalytics, isAuthenticated, toggleGoalCompletion } = useApiStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    
    const loadGoalData = async () => {
      try {
        setLoading(true)
        console.log('[GoalAnalytics] Loading goal analytics for ID:', goalId)
        const response = await getGoalAnalytics(goalId)
        console.log('[GoalAnalytics] API Response:', response)
        
        if (response?.success && response?.data) {
          setGoalData(response.data)
        } else {
          window.dispatchEvent(new CustomEvent('wt_toast', {
            detail: { message: 'Failed to load goal analytics', type: 'error' }
          }));
          console.error('[GoalAnalytics] Invalid response structure:', response)
        }
      } catch (error) {
        console.error('[GoalAnalytics] Error loading goal analytics:', error)
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: error.message || 'An error occurred', type: 'error' }
        }));
      } finally {
        setLoading(false)
      }
    }
    
    loadGoalData()
  }, [goalId, isAuthenticated, getGoalAnalytics, navigate])

  const handleCompleteGoal = async (completionPayload /* FormData */) => {
    if (!goalData?.goal || goalData.goal.completed) return
    
    // Instantly update the UI to show completed state
    setGoalData(prev => ({
      ...prev,
      goal: {
        ...prev.goal,
        completed: true,
        completedAt: new Date().toISOString()
      }
    }))
    
    let result
    if (completionPayload instanceof FormData) {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/goals/${goalId}/toggle`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: completionPayload
        })
        const data = await res.json()
        result = { success: res.ok && data.success, data }
      } catch (e) {
        result = { success: false, error: e.message }
      }
    } else {
      result = await toggleGoalCompletion(goalId, completionPayload)
    }
    
    if (result?.success) {
      // Reload goal data to reflect completion with full data
      const response = await getGoalAnalytics(goalId)
      if (response?.success && response?.data) {
        setGoalData(response.data)
      }
    } else {
      // Revert the optimistic update if it failed
      const response = await getGoalAnalytics(goalId)
      if (response?.success && response?.data) {
        setGoalData(response.data)
      }
    }
    return result
  }

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!goalData?.goal) return null

    const goal = goalData.goal
    const now = new Date()
    const createdDate = new Date(goal.createdAt)
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : null
    const completedDate = goal.completedAt ? new Date(goal.completedAt) : null
    
    // Days calculations
    const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))
    const daysUntilDeadline = targetDate ? Math.floor((targetDate - now) / (1000 * 60 * 60 * 24)) : null
    
    // Progress
    const progressPercent = goal.progress?.percent || 0
    const subGoalsTotal = goal.subGoals?.length || 0
    const subGoalsCompleted = goal.subGoals?.filter(sg => sg.completed)?.length || 0
    const habitLinksTotal = goal.habitLinks?.length || 0
    
    // Engagement - use the new structure
    const totalLikes = goal.likeCount || 0
    const totalComments = goal.commentCount || 0
    
    // Timeline events
    const timelineEvents = []
    
    // Created event
    timelineEvents.push({
      date: createdDate,
      title: 'Goal Created',
      description: 'Started tracking this goal',
      icon: Target,
      color: 'blue'
    })
    
    // Sub-goal completions
    if (goal.subGoals && goal.subGoals.length > 0) {
      goal.subGoals.forEach(sg => {
        if (sg.completed && sg.completedAt) {
          timelineEvents.push({
            date: new Date(sg.completedAt),
            title: 'Sub-goal Completed',
            description: sg.title,
            icon: CheckCircle,
            color: 'green'
          })
        }
      })
    }
    
    // Completion event
    if (completedDate) {
      timelineEvents.push({
        date: completedDate,
        title: 'Goal Completed! 🎉',
        description: goal.completionNote || 'Successfully achieved this goal',
        icon: Award,
        color: 'green'
      })
    }
    
    // Sort timeline by date
    timelineEvents.sort((a, b) => a.date - b.date)
    
    return {
      daysSinceCreation,
      daysUntilDeadline,
      progressPercent,
      subGoalsTotal,
      subGoalsCompleted,
      habitLinksTotal,
      totalLikes,
      totalComments,
      totalTimelineEvents: timelineEvents.length,
      isCompleted: goal.completed,
      isOverdue: targetDate && targetDate < now && !goal.completed,
      targetDate,
      createdDate,
      completedDate,
      timelineEvents,
      subGoals: goal.subGoals || [],
      habitLinks: goal.habitLinks || []
    }
  }, [goalData])

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading goal analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!goalData || !goalData.goal) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Goal not found or failed to load
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { goal } = goalData

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="glass-card-hover p-4 rounded-xl">
            <div className="space-y-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                  {goal.title}
                </h1>
                {goal.description && (
                  <div className="mb-2">
                    <ExpandableText 
                      text={goal.description}
                      maxLength={200}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                    {goal.category}
                  </span>
                  {analytics?.isOverdue && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              
              {analytics?.isCompleted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => setIsCompletionModalOpen(true)}
                  disabled={completing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-medium shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4" />
                  {completing ? 'Completing...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* Overview Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card-hover p-3 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="h-6 w-6 text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {analytics?.progressPercent?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Progress
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card-hover p-3 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {analytics?.daysSinceCreation || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Days Since Creation
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card-hover p-3 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className={`h-6 w-6 ${analytics?.isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {analytics?.daysUntilDeadline !== null 
                ? analytics.daysUntilDeadline >= 0 
                  ? analytics.daysUntilDeadline 
                  : Math.abs(analytics.daysUntilDeadline)
                : '—'
              }
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {analytics?.daysUntilDeadline !== null
                ? analytics.daysUntilDeadline >= 0
                  ? 'Days Until Deadline'
                  : 'Days Overdue'
                : 'No Deadline Set'
              }
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="glass-card-hover p-3 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <ListChecks className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {analytics?.subGoalsCompleted || 0}/{analytics?.subGoalsTotal || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Sub-goals Completed
            </div>
          </motion.div>
        </div>

        {/* Engagement Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card-hover p-4 rounded-xl mb-5"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-500" />
            Engagement Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
              <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                {analytics?.totalLikes || 0}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Likes
              </div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <MessageCircle className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                {analytics?.totalComments || 0}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Comments
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="glass-card-hover p-4 rounded-xl mb-5"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            Progress Overview
          </h2>
          <div className="space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Overall Progress
                </span>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                  {analytics?.progressPercent?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                  style={{ width: `${analytics?.progressPercent || 0}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        {analytics?.timelineEvents && analytics.timelineEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="glass-card-hover p-4 rounded-xl mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-500" />
              Timeline
            </h2>
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
              
              {analytics.timelineEvents.map((event, idx) => {
                const IconComponent = event.icon
                const colorClasses = {
                  blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                  green: 'text-green-500 bg-green-100 dark:bg-green-900/30',
                  yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                  red: 'text-red-500 bg-red-100 dark:bg-red-900/30'
                }
                
                return (
                  <div key={idx} className="relative flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[event.color] || colorClasses.blue} relative z-10`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {event.title}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {event.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Sub-goals Details */}
        {analytics?.subGoals && analytics.subGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card-hover p-4 rounded-xl mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-500" />
              Sub-goals ({analytics.subGoalsCompleted}/{analytics.subGoalsTotal})
            </h2>
            <div className="space-y-2">
              {analytics.subGoals.map((subGoal, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (subGoal.id || subGoal._id) {
                      navigate(`/goals/${subGoal.id || subGoal._id}/analytics`)
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
                    subGoal.completed
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {subGoal.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          subGoal.completed
                            ? 'text-gray-700 dark:text-gray-300 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {subGoal.title}
                        </h3>
                        {(subGoal.id || subGoal._id) && (
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                            View Analytics →
                          </span>
                        )}
                      </div>
                      {subGoal.description && (
                        <div className="mt-1">
                          <ExpandableText
                            text={subGoal.description}
                            maxLength={120}
                            className="text-sm text-gray-600 dark:text-gray-400"
                          />
                        </div>
                      )}
                      {subGoal.weight && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                          Weight: {subGoal.weight}%
                        </p>
                      )}
                      {subGoal.completed && subGoal.completedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Completed on {new Date(subGoal.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Linked Habits */}
        {analytics?.habitLinks && analytics.habitLinks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="glass-card-hover p-4 rounded-xl mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Linked Habits ({analytics.habitLinksTotal})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analytics.habitLinks.map((habit, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const habitId = habit.habitId || habit.id || habit._id
                    if (habitId) {
                      navigate(`/habits/${habitId}/analytics`)
                    }
                  }}
                  className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] hover:border-yellow-300 dark:hover:border-yellow-700"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {habit.habitName || habit.name || 'Habit'}
                        </h3>
                        {(habit.habitId || habit.id || habit._id) && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            View Analytics →
                          </span>
                        )}
                      </div>
                      {habit.description && (
                        <div className="mt-1">
                          <ExpandableText
                            text={habit.description}
                            maxLength={120}
                            className="text-sm text-gray-600 dark:text-gray-400"
                          />
                        </div>
                      )}
                      {habit.weight && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Weight: {habit.weight}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Completion Modal - Rendered at document body level */}
      {isCompletionModalOpen && createPortal(
        <Suspense fallback={null}>
          <CompletionModal
            isOpen={isCompletionModalOpen}
            onClose={() => setIsCompletionModalOpen(false)}
            onComplete={handleCompleteGoal}
            goalTitle={goal?.title}
            goal={goal}
          />
        </Suspense>,
        document.body
      )}
    </div>
  )
}

export default GoalAnalyticsPage
