import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, Target, CheckCircle, Circle, Star, Award, Lightbulb } from 'lucide-react'
import HabitsPanel from '../components/HabitsPanel'
import HabitAnalyticsCard from '../components/HabitAnalyticsCard'
import HabitDetailModal from '../components/HabitDetailModal'
import CreateHabitModal from '../components/CreateHabitModal'
import useApiStore from '../store/apiStore'
import CreateWishModal from '../components/CreateWishModal'
import WishCard from '../components/WishCard'
import GoalSuggestionsModal from '../components/GoalSuggestionsModal'
import HabitSuggestionsModal from '../components/HabitSuggestionsModal'
import { API_CONFIG } from '../config/api'
import GoalPostModal from '../components/GoalPostModal'

const DashboardPageV2 = () => {
  const [activeTab, setActiveTab] = useState('goals')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [isEditHabitOpen, setIsEditHabitOpen] = useState(false)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [initialHabitData, setInitialHabitData] = useState(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isHabitIdeasOpen, setIsHabitIdeasOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [extraYears, setExtraYears] = useState([])
  const [isAddYearOpen, setIsAddYearOpen] = useState(false)

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
    addDashboardYear,
  } = useApiStore()

  const [openGoalId, setOpenGoalId] = useState(null)

  // Collect user years present in goals
  const yearsInData = useMemo(() => {
    const ys = new Set((goals || []).map(g => g.year).filter(y => typeof y === 'number'))
    return Array.from(ys).sort((a, b) => a - b)
  }, [goals])

  const currentYear = new Date().getFullYear()

  const availableYears = useMemo(() => {
    const combined = Array.from(new Set([...(yearsInData || []), ...(extraYears || [])]))
    if (combined.length === 0) return [currentYear]
    return combined.sort((a, b) => a - b)
  }, [yearsInData, extraYears, currentYear])

  const candidateYears = useMemo(() => {
    const present = new Set(availableYears)
    const list = []
    for (let y = currentYear; y <= currentYear + 5; y++) {
      if (!present.has(y)) list.push(y)
    }
    return list
  }, [availableYears, currentYear])

  const canAddYear = candidateYears.length > 0

  const openAddYear = () => setIsAddYearOpen(true)
  const chooseYear = async (y) => {
    // Only mark pending selection; do not modify list or switch year yet
    setPendingAddYear(y)
  }

  const [pendingAddYear, setPendingAddYear] = useState(null)
  const handleConfirmAddYear = async () => {
    if (typeof pendingAddYear !== 'number') { setIsAddYearOpen(false); return }
    const res = await addDashboardYear(pendingAddYear)
    // Add locally and switch now only after successful confirmation
    const y = pendingAddYear
    if (!availableYears.includes(y)) {
      setExtraYears((prev) => Array.from(new Set([...(prev || []), y])).sort((a, b) => a - b))
    }
    setSelectedYear(y)
    getGoals({ year: y })
    setIsAddYearOpen(false)
    setPendingAddYear(null)
  }

  // Load dashboard data on mount
  useEffect(() => {
    if (isAuthenticated) {
      // Default to current year if none in data
      const initialYear = (yearsInData.length === 0) ? currentYear : (yearsInData.includes(selectedYear) ? selectedYear : yearsInData[0])
      if (initialYear !== selectedYear) setSelectedYear(initialYear)
      getDashboardStats()
      getGoals({ year: initialYear })
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    getGoals({ year: selectedYear })
  }, [selectedYear])

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

  const openPrefilledHabitModal = (habitTemplate) => {
    setInitialHabitData({
      name: habitTemplate.name,
      description: habitTemplate.description || '',
      frequency: habitTemplate.frequency || 'daily',
      daysOfWeek: Array.isArray(habitTemplate.daysOfWeek) ? habitTemplate.daysOfWeek : []
    })
    setIsHabitModalOpen(true)
  }

  const handleYearChange = (year) => {
    setSelectedYear(year)
    getGoals({ year })
  }

  const handleCreateGoal = async (goalData) => {
    const result = await createGoal({ ...goalData, year: selectedYear })
    if (result.success) {
      await getDashboardStats({ force: true })
      setIsCreateModalOpen(false)
      setInitialGoalData(null)
    }
    return result
  }

  const handleHabitCreated = async (habit) => {
    try {
      if (habit && habit._id) {
        useApiStore.getState().appendHabit(habit)
      }
    } finally {
      setIsHabitModalOpen(false)
      setInitialHabitData(null)
    }
  }

  const handleToggleGoal = async (goalId) => {
    const result = await toggleGoalCompletion(goalId)
    if (result.success) {
      getDashboardStats({ force: true })
      getGoals({ year: selectedYear }, { force: true })
    }
  }

  const handleDeleteGoal = async (goalId) => {
    const result = await deleteGoal(goalId)
    if (result.success) {
      await getDashboardStats({ force: true })
      getGoals({ year: selectedYear }, { force: true })
    }
  }

  const handleCompleteGoal = async (goalId, completionPayload /* FormData or note */, shareCompletionNote = true) => {
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
      result = await toggleGoalCompletion(goalId, completionPayload, shareCompletionNote)
    }
    if (result.success) {
      getDashboardStats({ force: true })
      getGoals({ year: selectedYear }, { force: true })
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
    { label: 'Total Goals', value: dashboardStats.totalGoals, icon: Target, color: 'text-blue-500' },
    { label: 'Completed', value: dashboardStats.completedGoals, icon: CheckCircle, color: 'text-green-500' },
    { label: 'In Progress', value: dashboardStats.totalGoals - dashboardStats.completedGoals, icon: Circle, color: 'text-yellow-500' },
    { label: 'Today', value: `${dashboardStats.todayCompletions || 0}/${dashboardStats.dailyLimit || 3}`, icon: Calendar, color: (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) ? 'text-orange-500' : 'text-purple-500' },
    { label: 'Total Points', value: dashboardStats.totalPoints, icon: Star, color: 'text-yellow-500' },
    { label: 'Level', value: dashboardStats.level?.level || 'Novice', icon: Award, color: dashboardStats.level?.color || 'text-gray-500', emoji: dashboardStats.level?.icon }
  ] : []

  // Goals ordering and pagination
  const goalsForYear = (goals || []).filter(g => g.year === selectedYear)
  const incompleteGoals = goalsForYear.filter(g => !g.completed)
  const completedGoals = goalsForYear.filter(g => g.completed)
  const orderedGoals = [...incompleteGoals, ...completedGoals]
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(orderedGoals.length / pageSize))
  const visibleGoals = orderedGoals.slice((page - 1) * pageSize, page * pageSize)

  const progress = goalsForYear.length > 0 ? Math.round((completedGoals.length / goalsForYear.length) * 100) : 0

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
          <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <button onClick={() => setActiveTab('goals')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'goals' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Goals</button>
            <button onClick={() => setActiveTab('habits')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'habits' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Habits</button>
          </div>
        </motion.div>

        {activeTab === 'goals' && (
          <>
            {/* Year Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mb-8">
              <div className="flex flex-wrap gap-2 items-center">
                {availableYears.map(year => (
                  <button key={year} onClick={() => handleYearChange(year)} className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedYear === year ? 'bg-primary-500 text-white shadow-lg' : 'glass-card hover:bg-white/20 text-gray-700 dark:text-gray-300'}`}>
                    <Calendar className="h-4 w-4 inline mr-2" />{year}
                  </button>
                ))}
                {canAddYear && (
                  <button onClick={openAddYear} className="px-4 py-2 rounded-lg font-medium transition-all glass-card hover:bg-white/20 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4 inline mr-2" />Add year
                  </button>
                )}
              </div>
            </motion.div>

            {/* Daily Limit Notification */}
            {dashboardStats && (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="glass-card p-4 rounded-xl mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Daily completion limit reached!</p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">You've completed {dashboardStats.todayCompletions || 0} goals today. Come back tomorrow to complete more!</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analytics (Stats Grid) */}
            {dashboardStats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                    {stat.emoji ? (<div className="text-3xl mb-2">{stat.emoji}</div>) : (<stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />)}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Progress Bar */}
            {goalsForYear.length > 0 && (
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

            {/* Action Buttons (Goals) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                <Plus className="h-5 w-5 mr-2" />Add New Goal
              </button>
              {goalsForYear.length !== 0 && (
                <button onClick={() => setIsSuggestionsOpen(true)} className="btn-primary flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />Discover Goal Ideas
                </button>
              )}
            </motion.div>

            {/* Goals List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
              {visibleGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleGoals.map((goal, index) => (
                    <WishCard key={goal._id} wish={goal} year={selectedYear} index={index} onToggle={() => handleToggleGoal(goal._id)} onDelete={() => handleDeleteGoal(goal._id)} onComplete={handleCompleteGoal} isViewingOwnGoals={true} onOpenGoal={(id) => setOpenGoalId(id)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No goals for {selectedYear} yet.</div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50">Prev</button>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</div>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50">Next</button>
                </div>
              )}
            </motion.div>
          </>
        )}

        {activeTab === 'habits' && (
          <>
            {/* Analytics (Habits) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="mb-6">
              <HabitAnalyticsCard days={30} />
            </motion.div>

            {/* Action Buttons (Habits) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setIsHabitModalOpen(true)} className="btn-primary">
                <Plus className="h-5 w-5 mr-2" />Add New Habit
              </button>
              <button onClick={() => setIsHabitIdeasOpen(true)} className="btn-primary flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />Discover Habit Ideas
              </button>
            </motion.div>

            {/* Habits List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
              <HabitsPanel onCreate={() => setIsHabitModalOpen(true)} onOpenHabit={(h) => setSelectedHabit(h)} scrollable initialVisible={6} />
            </motion.div>
          </>
        )}
      </div>

      {/* Add Year Modal */}
      {isAddYearOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setPendingAddYear(null); setIsAddYearOpen(false) }} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Add Year</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose a year to add to your dashboard.</p>
            {candidateYears.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">You have all years up to {currentYear + 5} already.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-auto pr-1">
                {candidateYears.map((y) => (
                  <button key={y} onClick={() => chooseYear(y)} className={`p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-left hover:border-primary-400 ${(pendingAddYear === y) ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300' : 'bg-gray-50/80 dark:bg-gray-800/40'}`}>
                    <div className="font-semibold text-gray-900 dark:text-white">{y}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Tap to select</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end mt-4 gap-2">
              <button onClick={() => { setPendingAddYear(null); setIsAddYearOpen(false) }} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Close</button>
              <button disabled={typeof pendingAddYear !== 'number'} onClick={handleConfirmAddYear} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-60">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateModalOpen && (
        <CreateWishModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setInitialGoalData(null) }} onSave={handleCreateGoal} year={selectedYear} initialData={initialGoalData} />
      )}

      {/* Goal Suggestions Modal */}
      {isSuggestionsOpen && (
        <GoalSuggestionsModal isOpen={isSuggestionsOpen} onClose={() => setIsSuggestionsOpen(false)} interests={userInterests} onSelect={openPrefilledCreateModal} limit={6} title="Goal Suggestions" />
      )}

      {/* Habit Suggestions Modal */}
      {isHabitIdeasOpen && (
        <HabitSuggestionsModal isOpen={isHabitIdeasOpen} onClose={() => setIsHabitIdeasOpen(false)} interests={userInterests} onSelect={openPrefilledHabitModal} limit={8} title="Habit Suggestions" />
      )}

      {/* Create Habit Modal */}
      {isHabitModalOpen && (
        <CreateHabitModal isOpen={isHabitModalOpen} onClose={() => { setIsHabitModalOpen(false); setInitialHabitData(null) }} onCreated={handleHabitCreated} initialData={initialHabitData} />
      )}

      {/* Habit Detail Modal */}
      {selectedHabit && (
        <HabitDetailModal isOpen={!!selectedHabit} habit={selectedHabit} onClose={() => setSelectedHabit(null)} onLog={async (status) => { try { const res = await useApiStore.getState().logHabit(selectedHabit._id, status); if (res.success) { setSelectedHabit(prev => prev ? { ...prev, currentStreak: status === 'done' ? (prev.currentStreak || 0) + 1 : 0, longestStreak: status === 'done' ? Math.max(prev.longestStreak || 0, (prev.currentStreak || 0) + 1) : prev.longestStreak, totalCompletions: status === 'done' ? (prev.totalCompletions || 0) + 1 : (prev.totalCompletions || 0) } : prev) } } catch {} }} onEdit={() => setIsEditHabitOpen(true)} onDelete={async () => { const res = await useApiStore.getState().deleteHabit(selectedHabit._id); if (res.success) { setSelectedHabit(null) } }} />
      )}

      {/* Goal Post Modal (shared with Feed) */}
      {openGoalId && (
        <GoalPostModal isOpen={!!openGoalId} goalId={openGoalId} onClose={() => setOpenGoalId(null)} />
      )}
    </div>
  )
}

export default DashboardPageV2