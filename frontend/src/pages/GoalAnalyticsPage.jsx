import CategoryBadge from '../components/CategoryBadge';
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
  Zap,
  PlusCircle,
  Link
} from 'lucide-react'
import useApiStore from '../store/apiStore'
import { createPortal } from 'react-dom'
import { API_CONFIG } from '../config/api'
import ExpandableText from '../components/ExpandableText'

const THEME_COLOR = '#4c99e6'

const CompletionModal = lazy(() => import('../components/CompletionModal'));

// Helper function to map event types to icons
const getIconForEventType = (type) => {
  const iconMap = {
    'goal_created': Target,
    'subgoal_added': PlusCircle,
    'subgoal_completed': CheckCircle,
    'habit_added': PlusCircle,
    'habit_target_achieved': CheckCircle,
    'goal_completed': Award
  }
  return iconMap[type] || Target
}

// Helper function to format completion feeling with emoji
const formatCompletionFeeling = (feeling) => {
  const feelingMap = {
    'neutral': { emoji: '😐', label: 'Neutral' },
    'relieved': { emoji: '😌', label: 'Relieved' },
    'satisfied': { emoji: '😊', label: 'Satisfied' },
    'happy': { emoji: '😄', label: 'Happy' },
    'proud': { emoji: '😎', label: 'Proud' },
    'accomplished': { emoji: '🏆', label: 'Accomplished' },
    'grateful': { emoji: '🙏', label: 'Grateful' },
    'excited': { emoji: '🎉', label: 'Excited' }
  }
  return feelingMap[feeling] || feelingMap['neutral']
}

const GoalAnalyticsPage = () => {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [goalData, setGoalData] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const { getGoalAnalytics, isAuthenticated, toggleGoalCompletion } = useApiStore()

  const loadGoalData = async () => {
    try {
      setLoading(true)
      const response = await getGoalAnalytics(goalId)
      
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    
    loadGoalData()
    
    // Refresh data when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadGoalData()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [goalId, isAuthenticated, navigate])

  const handleCompleteGoal = async (completionPayload /* FormData */) => {
    if (!goalData?.goal || goalData.goal.completedAt) return
    
    const completionDate = new Date().toISOString()
    
    // Instantly update the UI to show completed state
    setGoalData(prev => ({
      ...prev,
      goal: {
        ...prev.goal,
        completedAt: completionDate,
        progress: {
          ...prev.goal.progress,
          percent: 100
        }
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
    
    // Progress calculation - compute on the fly
    const subGoalsTotal = goal.subGoals?.length || 0
    const subGoalsCompleted = goal.subGoals?.filter(sg => sg.completedAt)?.length || 0
    const habitLinksTotal = goal.habitLinks?.length || 0
    
    // Calculate progress on the fly:
    // 1. If goal is completed, always show 100%
    // 2. If no subgoals/habits and not completed, show 0%
    // 3. Otherwise calculate weighted progress from subgoals and habits
    let progressPercent = 0
    if (goal.completedAt) {
      progressPercent = 100
    } else if (subGoalsTotal === 0 && habitLinksTotal === 0) {
      progressPercent = 0
    } else {
      // Calculate weighted progress
      const allItems = [...(goal.subGoals || []), ...(goal.habitLinks || [])]
      
      // Get total weight or use equal weights
      const totalWeight = allItems.reduce((sum, item) => sum + (item.weight || 0), 0)
      const useEqualWeights = totalWeight === 0
      const normalizedWeightFactor = useEqualWeights ? (100 / allItems.length) : (100 / totalWeight)
      
      let totalProgress = 0
      
      // Calculate subgoal contribution (0% or 100% based on completion)
      goal.subGoals?.forEach(sg => {
        const weight = useEqualWeights ? normalizedWeightFactor : (sg.weight || 0) * normalizedWeightFactor
        const isCompleted = !!sg.completedAt
        totalProgress += isCompleted ? weight : 0
      })
      
      // Calculate habit contribution (ratio based on target)
      goal.habitLinks?.forEach(habit => {
        const weight = useEqualWeights ? normalizedWeightFactor : (habit.weight || 0) * normalizedWeightFactor
        const ratio = habit.progressRatio || 0 // Backend provides this
        totalProgress += ratio * weight
      })
      
      progressPercent = Math.round(totalProgress * 100) / 100
    }
    
    // Engagement - use the new structure
    const totalLikes = goal.likeCount || 0
    const totalComments = goal.commentCount || 0
    
    // Use backend timeline if available, otherwise build manually
    let timelineEvents = []
    
    if (goal.timeline && Array.isArray(goal.timeline)) {
      // Map backend timeline to frontend format
      timelineEvents = goal.timeline.map(event => ({
        date: new Date(event.timestamp),
        title: event.title,
        description: event.description,
        icon: getIconForEventType(event.type),
        color: event.color || 'blue'
      }))
    } else {
      // Fallback: build timeline manually (legacy)
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
          if (sg.completedAt) {
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
    }
    
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
      isCompleted: goal.completedAt,
      isOverdue: targetDate && targetDate < now && !goal.completedAt,
      targetDate,
      createdDate,
      completedDate,
      timelineEvents,
      subGoals: goal.subGoals || [],
      habitLinks: goal.habitLinks || [],
      completionFeeling: goal.completionFeeling || 'neutral'
    }
  }, [goalData])

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: THEME_COLOR }}></div>
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
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { goal } = goalData

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-16" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </button>

          <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
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
                  <CategoryBadge category={goal.category} />
                  
                  {analytics?.isOverdue && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              
              {analytics?.isCompleted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 dark:text-green-300 text-sm font-medium border border-green-100 dark:border-green-800">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => setIsCompletionModalOpen(true)}
                  disabled={completing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4" />
                  {completing ? 'Completing...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className={`grid ${analytics?.isCompleted ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'} gap-3 mb-5`}>
          {/* Overview Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg" style={{ background: THEME_COLOR }}>
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium" style={{ color: THEME_COLOR }}>Target Progress</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics?.progressPercent?.toFixed(1) || 0}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-2">Progress</p>
            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-2 rounded-full" style={{ width: `${analytics?.progressPercent || 0}%`, background: THEME_COLOR }} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg" style={{ background: THEME_COLOR }}>
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium" style={{ color: THEME_COLOR }}>Active Days</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics?.daysSinceCreation || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">days this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg" style={{ background: THEME_COLOR }}>
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium" style={{ color: THEME_COLOR }}>Completion Rate</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics?.daysUntilDeadline !== null 
                ? analytics.daysUntilDeadline >= 0 
                  ? analytics.daysUntilDeadline 
                  : Math.abs(analytics.daysUntilDeadline)
                : '—'
              }</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {analytics?.daysUntilDeadline !== null
                ? analytics.daysUntilDeadline >= 0
                  ? 'Days Until Deadline'
                  : 'Days Overdue'
                : 'No Deadline Set'
              }
            </p>
          </motion.div>

          {/* Only show completion feeling card if goal is completed */}
          {analytics?.isCompleted && (() => {
            const feeling = formatCompletionFeeling(analytics.completionFeeling)
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="p-3 rounded-lg bg-green-50 border border-green-100 dark:border-green-800"
              >
                <div className="text-3xl mb-2">
                  {feeling.emoji}
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {feeling.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  How You Felt
                </div>
              </motion.div>
            )
          })()}
        </div>

        {/* Engagement Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 mb-5"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: THEME_COLOR }} />
            Engagement Metrics
          </h2>
            <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
              <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                {analytics?.totalLikes || 0}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Likes
              </div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
              <MessageCircle className="h-6 w-6 mx-auto mb-2" style={{ color: THEME_COLOR }} />
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                {analytics?.totalComments || 0}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Comments
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Overview removed - compact progress moved to top metric card */}

        {/* Timeline */}
        {analytics?.timelineEvents && analytics.timelineEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: THEME_COLOR }} />
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
            className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5" style={{ color: THEME_COLOR }} />
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
                  className={`p-3 rounded-lg border cursor-pointer ${
                    subGoal.completedAt
                      ? 'bg-green-50 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'
                  }`}>
                  <div className="flex items-start gap-2">
                    {subGoal.completedAt ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          subGoal.completedAt
                            ? 'text-gray-700 dark:text-gray-300 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {subGoal.title}
                        </h3>
                        {(subGoal.id || subGoal._id) && (
                          <span className="text-xs font-medium" style={{ color: THEME_COLOR }}>
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
                        <p className="text-xs mt-1" style={{ color: THEME_COLOR }}>
                          Weight: {subGoal.weight}%
                        </p>
                      )}
                      {subGoal.completedAt && (
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
            className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 mb-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5" style={{ color: THEME_COLOR }} />
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
                  className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {habit.habitName || habit.name || 'Habit'}
                        </h3>
                        {(habit.habitId || habit.id || habit._id) && (
                          <span className="text-xs font-medium" style={{ color: THEME_COLOR }}>
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
                        <p className="text-xs mt-1" style={{ color: THEME_COLOR }}>
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
