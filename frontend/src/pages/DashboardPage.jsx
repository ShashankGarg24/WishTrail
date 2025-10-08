import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, Target, CheckCircle, Circle, Star, Award, Lightbulb, Clock, XCircle, SkipForward, Activity } from 'lucide-react'
import HabitDetailModal from '../components/HabitDetailModal'
import CreateHabitModal from '../components/CreateHabitModal'
import EditHabitModal from '../components/EditHabitModal'
import useApiStore from '../store/apiStore'
import CreateGoalWizard from '../components/CreateGoalWizard'
import WishCard from '../components/WishCard'
import GoalSuggestionsModal from '../components/GoalSuggestionsModal'
import HabitSuggestionsModal from '../components/HabitSuggestionsModal'
import { API_CONFIG } from '../config/api'
import { communitiesAPI, habitsAPI } from '../services/api'
import GoalPostModal from '../components/GoalPostModal'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('goals')
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [isEditHabitOpen, setIsEditHabitOpen] = useState(false)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [initialHabitData, setInitialHabitData] = useState(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isHabitIdeasOpen, setIsHabitIdeasOpen] = useState(false)
  const [communityItems, setCommunityItems] = useState([])
  const [page, setPage] = useState(1)
  const [extraYears, setExtraYears] = useState([])
  const [isAddYearOpen, setIsAddYearOpen] = useState(false)

  const { 
    isAuthenticated, 
    loading, 
    error,
    goals,
    goalsPagination,
    user,
    dashboardStats,
    getDashboardStats,
    getGoals,
    createGoal,
    toggleGoalCompletion,
    deleteGoal,
    addDashboardYear,
    habits,
    loadHabits,
    logHabit,
    habitAnalytics,
    loadHabitAnalytics,
  } = useApiStore()

  const [openGoalId, setOpenGoalId] = useState(null)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'goals';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setActiveTab(tab); 
  };
  
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
    // getGoals will be called by useEffect when selectedYear changes
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
      try { communitiesAPI.listMyJoinedItems().then(r => setCommunityItems(r?.data?.data || [])).catch(()=>{}) } catch {}
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    setPage(1) // Reset to first page when year changes
  }, [selectedYear])

  // Fetch goals when page changes or year changes
  useEffect(() => {
    if (!isAuthenticated) return
    getGoals({ year: selectedYear, includeProgress: true, page })
  }, [page, isAuthenticated, selectedYear])

  // Load habits on first visit to Habits tab
  useEffect(() => {
    if (!isAuthenticated) return
    if (activeTab === 'habits') {
      try { loadHabits({}).catch(()=>{}) } catch {}
      try { loadHabitAnalytics({}).catch(()=>{}) } catch {}
    }
  }, [activeTab, isAuthenticated])

  // Deep link open via ?goalId=
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const gid = params.get('goalId')
      if (gid) setOpenGoalId(gid)
    } catch {}
  }, [location.search])

  // Lock body scroll when goal modal open
  useEffect(() => {
    if (openGoalId) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [openGoalId])

  const userInterests = Array.isArray(user?.interests) ? user.interests : []

  // Ensure a personal habit exists for a community habit; create if missing
  const ensurePersonalHabit = async (it) => {
    try {
      const existing = (useApiStore.getState().habits || []).find(h => String(h._id) === String(it.sourceId))
        || (useApiStore.getState().habits || []).find(h => String(h.name).trim().toLowerCase() === String(it.title || '').trim().toLowerCase())
      if (existing) return existing
      const payload = {
        name: it.title,
        description: it.description || '',
        frequency: 'daily',
        daysOfWeek: []
      }
      const res = await habitsAPI.create(payload)
      const created = res?.data?.data || res?.data
      if (created?._id) {
        try { useApiStore.getState().appendHabit(created) } catch {}
        return created
      }
    } catch {}
    return null
  }

  // Ensure a personal goal exists for a community goal; create if missing
  const ensurePersonalGoal = async (it) => {
    try {
      const existingById = (useApiStore.getState().goals || []).find(g => String(g._id) === String(it.sourceId))
      if (existingById) return existingById
      const existingByTitle = (useApiStore.getState().goals || []).find(g => String(g.title).trim().toLowerCase() === String(it.title || '').trim().toLowerCase())
      if (existingByTitle) return existingByTitle
      const goalData = {
        title: it.title,
        description: it.description || '',
        category: 'Other',
        priority: 'medium',
        duration: 'medium-term',
        year: selectedYear
      }
      const result = await createGoal(goalData)
      if (result?.success && result?.goal) {
        return result.goal
      }
    } catch {}
    return null
  }

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
  }

  // Goal creation handled by CreateGoalWizard

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
      getGoals({ year: selectedYear, includeProgress: true, page }, { force: true })
    }
  }

  const handleDeleteGoal = async (goalId) => {
    const result = await deleteGoal(goalId)
    if (result.success) {
      await getDashboardStats({ force: true })
      getGoals({ year: selectedYear, includeProgress: true, page }, { force: true })
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
      getGoals({ year: selectedYear, includeProgress: true, page }, { force: true })
    }
    return result
  }

  const closeGoalModal = () => {
    setOpenGoalId(null)
    setScrollCommentsOnOpen(false)
    try {
      const params = new URLSearchParams(location.search)
      if (params.get('goalId')) navigate(-1)
    } catch {}
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

  const handleHabitLog = async (status) => {
    if (!selectedHabit) return;
  
    try {
      const res = await useApiStore.getState().logHabit(selectedHabit._id, status);
      if (res.success) {
        setSelectedHabit((prev) =>
          prev
            ? {
                ...prev,
                currentStreak: status === 'done' ? (prev.currentStreak || 0) + 1 : 0,
                longestStreak:
                  status === 'done'
                    ? Math.max(prev.longestStreak || 0, (prev.currentStreak || 0) + 1)
                    : prev.longestStreak,
                totalCompletions:
                  status === 'done'
                    ? (prev.totalCompletions || 0) + 1
                    : prev.totalCompletions || 0,
              }
            : prev
        );
      }
      handleStatusToast(status)
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  const handleStatusToast = async (status) => {
    const msg = status === 'done' ? 'Habit logged successfully' : 'Habit skipped successfully';
    window.dispatchEvent(new CustomEvent('wt_toast', 
      { detail: { message: msg, type: 'success', duration: 2000 } }));
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

  const goalStats = dashboardStats ? [
    { label: 'Total Goals', value: dashboardStats.totalGoals, icon: Target, color: 'text-blue-500' },
    { label: 'Completed', value: dashboardStats.completedGoals, icon: CheckCircle, color: 'text-green-500' },
    { label: 'In Progress', value: dashboardStats.totalGoals - dashboardStats.completedGoals, icon: Circle, color: 'text-yellow-500' },
    { label: 'Today', value: `${dashboardStats.todayCompletions || 0}/${dashboardStats.dailyLimit || 3}`, icon: Calendar, color: (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) ? 'text-orange-500' : 'text-purple-500' },
    { label: 'Total Points', value: dashboardStats.totalPoints, icon: Star, color: 'text-yellow-500' },
    { label: 'Level', value: dashboardStats.level?.level || 'Novice', icon: Award, color: dashboardStats.level?.color || 'text-gray-500', emoji: dashboardStats.level?.icon }
  ] : []

  const habitStats = habitAnalytics?.analytics?.totals ? [
    { label: 'Done', value: habitAnalytics.analytics?.totals?.done, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Skipped', value: habitAnalytics.analytics?.totals?.skipped, icon: SkipForward, color: 'text-yellow-500' },
    { label: 'Missed', value: habitAnalytics.analytics?.totals?.missed, icon: XCircle, color: 'text-red-500' },
    { label: 'Longest Streak', value: habitAnalytics.analytics?.totals?.longestStreak, icon: Activity, color: 'text-orange-500' }
  ] : []


  // Goals filtering (server handles pagination)
  const goalsForYear = (goals || []).filter(g => g.year === selectedYear && !g.communityId && !g.isCommunitySource && !g.communityInfo)
  const communityGoals = (goals || []).filter(g => g.year === selectedYear && g.communityInfo)
  
  // Server-side pagination - use the goals as returned from server (already paginated and ordered)
  const visibleGoals = goalsForYear
  const totalPages = goalsPagination ? goalsPagination.pages : 1

  // Use dashboard stats for progress calculation (total for the year, not just current page)
  const progress = dashboardStats && dashboardStats.totalGoals > 0 
    ? Math.round((dashboardStats.completedGoals / dashboardStats.totalGoals) * 100) 
    : 0

  const isScheduledToday = (habit) => {
    if (!habit) return false
    if (habit.frequency === 'daily') return true
    const day = new Date().getDay()
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day)
  }

  const frequencyLabel = (h) => {
    if (!h) return ''
    if (h.frequency === 'daily') return 'Daily'
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const days = Array.isArray(h.daysOfWeek) ? h.daysOfWeek.slice().sort() : []
    return days.length ? days.map(d => names[d]).join(', ') : 'Weekly'
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
          <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <button onClick={() => handleTabChange('goals')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'goals' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Goals</button>
            <button onClick={() => handleTabChange('habits')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'habits' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Habits</button>
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

            {/* Daily Limit Notification
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
            )} */}

            {/* Analytics (Stats Grid) */}
            {dashboardStats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                {goalStats.map((stat) => (
                  <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                    {stat.emoji ? (<div className="text-3xl mb-2">{stat.emoji}</div>) : (<stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />)}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Progress Bar */}
            {dashboardStats && dashboardStats.totalGoals > 0 && (
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
              {dashboardStats && dashboardStats.totalGoals > 0 && (
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
              {goalsPagination && goalsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50">Prev</button>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Page {goalsPagination.page} of {goalsPagination.pages}</div>
                  <button disabled={page >= goalsPagination.pages} onClick={() => setPage(p => Math.min(goalsPagination.pages, p + 1))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50">Next</button>
                </div>
              )}
            </motion.div>

            {/* Community Goals Section (render using WishCard style) */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community goals</h3>
              {communityGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {communityGoals.map((goal, index) => (
                    <WishCard 
                      key={goal._id} 
                      wish={goal} 
                      year={selectedYear} 
                      index={index} 
                      onToggle={() => handleToggleGoal(goal._id)} 
                      onDelete={() => handleDeleteGoal(goal._id)} 
                      onComplete={handleCompleteGoal} 
                      isViewingOwnGoals={true} 
                      onOpenGoal={(id) => setOpenGoalId(id)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <p>No community goals joined yet.</p>
                  <p className="text-sm">Join community goals to see them here!</p>
                </div>
              )}
            </div>

            {/* Legacy Community Items Section - only show if no new-style community goals exist */}
            {false && communityItems && communityItems.filter(i => i.type === 'goal').length > 0 && communityGoals.length === 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community goals (legacy)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {communityItems.filter(i => i.type === 'goal').map((it, index) => {
                    const mapped = {
                      _id: it.sourceId || it._id,
                      title: it.title,
                      description: it.description || '',
                      category: 'Community',
                      priority: 'medium',
                      duration: 'medium-term',
                      createdAt: new Date().toISOString(),
                      progress: { percent: it.personalPercent || 0 },
                      completed: false,
                      isLocked: true // lock goal actions since these are community mirrors
                    }
                    return (
                      <WishCard
                        key={`${it._id}-${index}`}
                        wish={mapped}
                        index={index}
                        isViewingOwnGoals={true}
                        onOpenGoal={undefined}
                        isReadOnly={true}
                        footer={(
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200 border border-purple-200 dark:border-purple-800">{it.communityName}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => { const g = await ensurePersonalGoal(it); if (g?._id) { try { setOpenGoalId(g._id) } catch {} } }}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                              >
                                Open in my goals
                              </button>
                              <a href={`/communities/${it.communityId}?tab=items`} className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm">Open community</a>
                            </div>
                          </div>
                        )}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'habits' && (
          <>
            {/* Analytics (Habits) */}
            {habitStats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                {habitStats.map((stat) => (
                  <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                    {stat.emoji ? (<div className="text-3xl mb-2">{stat.emoji}</div>) : (<stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />)}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Action Buttons (Habits) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setIsHabitModalOpen(true)} className="btn-primary">
                <Plus className="h-5 w-5 mr-2" />Add New Habit
              </button>
              <button onClick={() => setIsHabitIdeasOpen(true)} className="btn-primary flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />Discover Habit Ideas
              </button>
            </motion.div>

            {/* Habits List (cards like goals) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
              {Array.isArray(habits) && habits.filter(h => !h.isCommunitySource && !h.communityInfo).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {habits.filter(h => !h.isCommunitySource && !h.communityInfo).map((h, idx) => (
                    <div 
                    key={h._id || idx} 
                    onClick={() => setSelectedHabit(h)}
                    className="glass-card-hover p-5 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate" title={h.name}>{h.name}</div>
                          {h.description && <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={h.description}>{h.description}</div>}
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {frequencyLabel(h)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>🔥 {h.currentStreak || 0} / Best {h.longestStreak || 0}</span>
                          <span>✅ {h.totalCompletions || 0}</span>
                        </div>
                        {isScheduledToday(h) ? (
                          <div className="inline-flex items-center gap-1 text-orange-600" title="Scheduled today">
                            <Clock className="h-4 w-4" /> Today
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-gray-500" title="Not scheduled today">
                            <Clock className="h-4 w-4" /> Not today
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={async (e) => { e.stopPropagation(); handleStatusToast('skipped'); try { await logHabit(h._id, 'skipped'); } catch {} }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-yellow-600/90 hover:bg-yellow-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                        >
                          <SkipForward className="h-4 w-4" /> Skip
                        </button>
                        <button
                          onClick={async (e) => { e.stopPropagation(); handleStatusToast('done'); try { await logHabit(h._id, 'done'); } catch {} }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-green-600/90 hover:bg-green-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                        >
                          <CheckCircle className="h-4 w-4" /> Done
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No habits yet. Create your first habit!</div>
              )}
            </motion.div>

            {/* Community Habits Section (use same habit card UI) */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community habits</h3>
              {(habits || []).filter(h => h.communityInfo).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(habits || []).filter(h => h.communityInfo).map((h, idx) => {
                    return (
                      <div key={h._id} className="relative group bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{h.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{frequencyLabel(h)}</p>
                            {h.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">{h.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{h.currentStreak || 0}</div>
                            <div className="text-xs text-gray-500">current streak</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('skipped'); try { await logHabit(h._id, 'skipped'); } catch {} }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday(h) ? 'bg-yellow-600/90 hover:bg-yellow-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                            disabled={false}
                          >
                            <SkipForward className="h-4 w-4" /> Skip
                          </button>
                          <button
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('done'); try { await logHabit(h._id, 'done'); } catch {} }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday(h) ? 'bg-green-600/90 hover:bg-green-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                            disabled={false}
                          >
                            <CheckCircle className="h-4 w-4" /> Done
                          </button>
                          <a
                            href={`/communities/${h.communityInfo?.communityId}?tab=items`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm"
                          >
                            Open community
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <p>No community habits joined yet.</p>
                  <p className="text-sm">Join community habits to see them here!</p>
                </div>
              )}
            </div>

            {/* Legacy Community Habits Section - disabled for cleaner dashboard */}
            {false && communityItems && communityItems.filter(i => i.type === 'habit').length > 0 && (habits || []).filter(h => h.communityInfo).length === 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community habits (legacy)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {communityItems.filter(i => i.type === 'habit').map((it, idx) => {
                    const base = (habits || []).find(h => String(h._id) === String(it.sourceId));
                    const h = base || {
                      _id: it.sourceId,
                      name: it.title,
                      description: it.description || '',
                      frequency: 'daily',
                      daysOfWeek: [],
                      currentStreak: 0,
                      longestStreak: 0,
                      totalCompletions: 0
                    };
                    return (
                      <div 
                        key={it._id || idx}
                        onClick={() => { if (base) setSelectedHabit(base) }}
                        className="glass-card-hover p-5 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate" title={h.name}>{h.name}</div>
                            {h.description && <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={h.description}>{h.description}</div>}
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {frequencyLabel(h)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span>🔥 {h.currentStreak || 0} / Best {h.longestStreak || 0}</span>
                            <span>✅ {h.totalCompletions || 0}</span>
                          </div>
                          {isScheduledToday(h) ? (
                            <div className="inline-flex items-center gap-1 text-orange-600" title="Scheduled today">
                              <Clock className="h-4 w-4" /> Today
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-gray-500" title="Not scheduled today">
                              <Clock className="h-4 w-4" /> Not today
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('skipped'); try { const target = base || await ensurePersonalHabit(it); if (target?._id) await logHabit(target._id, 'skipped'); } catch {} }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-yellow-600/90 hover:bg-yellow-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                            disabled={false}
                          >
                            <SkipForward className="h-4 w-4" /> Skip
                          </button>
                          <button
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('done'); try { const target = base || await ensurePersonalHabit(it); if (target?._id) await logHabit(target._id, 'done'); } catch {} }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-green-600/90 hover:bg-green-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                            disabled={false}
                          >
                            <CheckCircle className="h-4 w-4" /> Done
                          </button>
                          <a
                            href={`/communities/${it.communityId}?tab=items`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm"
                          >
                            Open community
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
        <CreateGoalWizard isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setInitialGoalData(null) }} year={selectedYear} initialData={initialGoalData} />
      )}

      {/* Goal Suggestions Modal */}
      {isSuggestionsOpen && (
        <GoalSuggestionsModal isOpen={isSuggestionsOpen} onClose={() => setIsSuggestionsOpen(false)} interests={userInterests} onSelect={openPrefilledCreateModal} limit={6} title="Goal Suggestions" />
      )}

      {/* Habit Suggestions Modal */}
      {isHabitIdeasOpen && (
        <HabitSuggestionsModal isOpen={isHabitIdeasOpen} onClose={() => setIsHabitIdeasOpen(false)} interests={userInterests} onSelect={openPrefilledHabitModal} limit={6} title="Habit Suggestions" />
      )}

      {/* Create Habit Modal */}
      {isHabitModalOpen && (
        <CreateHabitModal isOpen={isHabitModalOpen} onClose={() => { setIsHabitModalOpen(false); setInitialHabitData(null) }} onCreated={handleHabitCreated} initialData={initialHabitData} />
      )}

      {/* Edit Habit Modal */}
      {isEditHabitOpen && (
        <EditHabitModal
          isOpen={isEditHabitOpen}
          habit={selectedHabit}
          onClose={() => setIsEditHabitOpen(false)}
          onSave={async (payload) => {
            const res = await useApiStore.getState().updateHabit(selectedHabit._id, payload)
            if (res?.success) {
              try { setSelectedHabit(prev => (prev ? { ...prev, ...res.habit } : prev)) } catch {}
              return res
            }
            throw new Error(res?.error || 'Failed to update habit')
          }}
        />
      )}


      {/* Habit Detail Modal */}
      {selectedHabit && (
        <HabitDetailModal 
        isOpen={!!selectedHabit}
        habit={selectedHabit} 
        onClose={() => setSelectedHabit(null)} 
        onLog={handleHabitLog} 
        onEdit={() => setIsEditHabitOpen(true)} 
        onDelete={async () => { const res = await useApiStore.getState().deleteHabit(selectedHabit._id); if (res.success) { setSelectedHabit(null) } }} />
      )}

      {/* Goal Post Modal (shared with Feed) */}
      {openGoalId && (
        <GoalPostModal
          isOpen={!!openGoalId}
          goalId={openGoalId}
          autoOpenComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        />
      )}
    </div>
  )
}


export default DashboardPage 