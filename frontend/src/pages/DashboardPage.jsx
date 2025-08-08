import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, Target, CheckCircle, Circle, Star, Award, Lightbulb } from 'lucide-react'
import useApiStore from '../store/apiStore'
import CreateWishModal from '../components/CreateWishModal'
import WishCard from '../components/WishCard'
import GoalSuggestions from '../components/GoalSuggestions'
import GoalSuggestionsModal from '../components/GoalSuggestionsModal'

const DashboardPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  
  const { 
    isAuthenticated, 
    loading, 
    error,
    goals,
    user,
    dashboardStats,
    getDashboardStats,
    getGoals,
    createGoal,
    toggleGoalCompletion,
    deleteGoal,
  } = useApiStore()

  // Load dashboard data on mount
  useEffect(() => {
    if (isAuthenticated) {
      getDashboardStats()
      getGoals({ year: selectedYear })
    }
  }, [isAuthenticated, selectedYear])

  const userInterests = Array.isArray(user?.interests) ? user.interests : []

  const openPrefilledCreateModal = (goalTemplate) => {
    setInitialGoalData({
      title: goalTemplate.title,
      description: goalTemplate.description,
      category: goalTemplate.category,
      priority: goalTemplate.priority || 'medium',
      duration: goalTemplate.duration || 'medium-term',
      targetDate: ''
    })
    setIsCreateModalOpen(true)
  }

  const availableYears = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
    new Date().getFullYear() + 2
  ]

  const handleYearChange = (year) => {
    setSelectedYear(year)
    getGoals({ year })
  }

  const handleCreateGoal = async (goalData) => {
    const result = await createGoal({ ...goalData, year: selectedYear })
    if (result.success) {
      // Refresh dashboard stats
      await getDashboardStats()
      setIsCreateModalOpen(false)
      setInitialGoalData(null)
    }
    return result
  }

  const handleToggleGoal = async (goalId) => {
    const result = await toggleGoalCompletion(goalId)
    if (result.success) {
      // Refresh dashboard stats
      getDashboardStats()
    }
  }

  const handleDeleteGoal = async (goalId) => {
    const result = await deleteGoal(goalId)
    if (result.success) {
      // Refresh dashboard stats
      await getDashboardStats()
    }
  }

  const handleCompleteGoal = async (goalId, completionNote, shareCompletionNote = true) => {
    const result = await toggleGoalCompletion(goalId, completionNote, shareCompletionNote)
    if (result.success) {
      // Refresh dashboard stats
      getDashboardStats()
    }
    return result
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Star className="h-16 w-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to Access Your Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Create an account or sign in to start tracking your goals
          </p>
          <a href="/auth" className="btn-primary">
            Get Started
          </a>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && !dashboardStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => getDashboardStats()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const stats = dashboardStats ? [
    {
      label: 'Total Goals',
      value: dashboardStats.totalGoals,
      icon: Target,
      color: 'text-blue-500'
    },
    {
      label: 'Completed',
      value: dashboardStats.completedGoals,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      label: 'In Progress',
      value: dashboardStats.totalGoals - dashboardStats.completedGoals,
      icon: Circle,
      color: 'text-yellow-500'
    },
    {
      label: 'Today',
      value: `${dashboardStats.todayCompletions || 0}/${dashboardStats.dailyLimit || 3}`,
      icon: Calendar,
      color: (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) ? 'text-orange-500' : 'text-purple-500'
    },
    {
      label: 'Total Points',
      value: dashboardStats.totalPoints,
      icon: Star,
      color: 'text-yellow-500'
    },
    {
      label: 'Level',
      value: dashboardStats.level?.level || 'Novice',
      icon: Award,
      color: dashboardStats.level?.color || 'text-gray-500',
      emoji: dashboardStats.level?.icon
    }
  ] : []

  const currentYearGoals = goals.filter(goal => goal.year === selectedYear)
  const completedGoals = currentYearGoals.filter(goal => goal.completed)
  const progress = currentYearGoals.length > 0 ? Math.round((completedGoals.length / currentYearGoals.length) * 100) : 0

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Goal Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and achieve your dreams
          </p>
        </motion.div>

        {/* Year Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedYear === year
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'glass-card hover:bg-white/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                {year}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Daily Limit Notification */}
        {dashboardStats && (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="glass-card p-4 rounded-xl mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Daily completion limit reached!
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                You've completed {dashboardStats.todayCompletions || 0} goals today. Come back tomorrow to complete more!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        {dashboardStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                {stat.emoji ? (
                  <div className="text-3xl mb-2">{stat.emoji}</div>
                ) : (
                  <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />
                )}
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Progress Bar */}
        {currentYearGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="glass-card-hover p-6 rounded-xl mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedYear} Progress
              </h3>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {progress}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-primary-500 h-3 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Goal
          </button>
          {currentYearGoals.length !== 0 && (
            <button
              onClick={() => setIsSuggestionsOpen(true)}
              className="btn-primary flex items-center"
            >
              <Lightbulb className="h-5 w-5 mr-2" />
              Discover Goal Ideas
            </button>
          )}
        </motion.div>

        {/* Goals + Suggestions Layout */}
        {currentYearGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-3xl mx-auto text-center py-12"
          >
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No goals yet for {selectedYear}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your journey by creating your first goal
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Goal
            </button>
            {/* Interest-based suggestions when no goals yet */}
            <GoalSuggestions
              interests={userInterests}
              onSelect={openPrefilledCreateModal}
              variant="empty"
              limit={6}
            />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Goals Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {currentYearGoals.map((goal, index) => (
                <WishCard
                  key={goal._id}
                  wish={goal}
                  year={selectedYear}
                  index={index}
                  onToggle={() => handleToggleGoal(goal._id)}
                  onDelete={() => handleDeleteGoal(goal._id)}
                  onComplete={handleCompleteGoal}
                  isViewingOwnGoals={true}
                />
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {isCreateModalOpen && (
        <CreateWishModal
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false); setInitialGoalData(null) }}
          onSave={handleCreateGoal}
          year={selectedYear}
          initialData={initialGoalData}
        />
      )}

      {/* Suggestions Modal */}
      {isSuggestionsOpen && (
      <GoalSuggestionsModal
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
        interests={userInterests}
        onSelect={openPrefilledCreateModal}
        limit={6}
        title="Goal Suggestions"
      />
      )}
    </div>
  )
}

export default DashboardPage 