import { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, Target, CheckCircle, Circle, Star, Award, Lightbulb, Clock, XCircle, SkipForward, Activity, Compass, Pencil, Trash2 } from 'lucide-react'
const HabitDetailModal = lazy(() => import('../components/HabitDetailModal'));
const CreateHabitModal = lazy(() => import('../components/CreateHabitModal'));
const EditHabitModal = lazy(() => import('../components/EditHabitModal'));
const DeleteConfirmModal = lazy(() => import('../components/DeleteConfirmModal'));
const DependencyWarningModal = lazy(() => import('../components/DependencyWarningModal'));
import useApiStore from '../store/apiStore'
const CreateGoalWizard = lazy(() => import('../components/CreateGoalWizard'));
const WishCard = lazy(() => import('../components/WishCard'));
const GoalSuggestionsModal = lazy(() => import('../components/GoalSuggestionsModal'));
const HabitSuggestionsModal = lazy(() => import('../components/HabitSuggestionsModal'));
import { API_CONFIG } from '../config/api'
import { habitsAPI } from '../services/api'
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('goals')
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)
  const prevYearRef = useRef(null) // Track previous year to detect actual changes
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [isEditHabitOpen, setIsEditHabitOpen] = useState(false)
  const [isHabitWarningModalOpen, setIsHabitWarningModalOpen] = useState(false)
  const [isHabitDeleteModalOpen, setIsHabitDeleteModalOpen] = useState(false)
  const [habitToDelete, setHabitToDelete] = useState(null)
  const [habitDependencies, setHabitDependencies] = useState([])
  const [isDeletingHabit, setIsDeletingHabit] = useState(false)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [initialHabitData, setInitialHabitData] = useState(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isHabitIdeasOpen, setIsHabitIdeasOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [habitPage, setHabitPage] = useState(1)
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
    habitsPagination,
    loadHabits,
    logHabit,
    habitAnalytics,
    loadHabitAnalytics,
    habitStats,
    loadHabitStats,
    loadCommunityGoalsForYear,
    communityGoalsByYear,
  } = useApiStore()

  const [openGoalId, setOpenGoalId] = useState(null)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false)
  const [isGoalWarningModalOpen, setIsGoalWarningModalOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [goalDependencies, setGoalDependencies] = useState([])
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)
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

  // Separate user habits from community habits (so pagination only affects user habits)
  const userHabits = useMemo(() => {
    return (habits || []).filter(h => !h.isCommunitySource && !h.communityInfo);
  }, [habits]);

  const communityHabits = useMemo(() => {
    return (habits || []).filter(h => h.communityInfo);
  }, [habits]);

  const [pendingAddYear, setPendingAddYear] = useState(null)
  const openAddYear = () => setIsAddYearOpen(true)
  const chooseYear = async (y) => {
    // Only mark pending selection; do not modify list or switch year yet
    setPendingAddYear(y)
  }
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
    if (!isAuthenticated) return;
    
    if (!hasLoadedInitialData) {
      prevYearRef.current = selectedYear;
      getDashboardStats()
      setIsLoadingGoals(true)
      getGoals({ year: selectedYear, includeProgress: true, page }).finally(() => {
        setIsLoadingGoals(false)
        setHasLoadedInitialData(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedInitialData) return;
    
    // Only run if year actually changed from a previous value
    if (prevYearRef.current !== null && prevYearRef.current !== selectedYear) {
      prevYearRef.current = selectedYear;
      setPage(1)
      setIsLoadingGoals(true)
      getGoals({ year: selectedYear, includeProgress: true, page: 1 }).finally(() => {
        setIsLoadingGoals(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  // Fetch goals when page changes
  useEffect(() => {
    if (!isAuthenticated || !hasLoadedInitialData || page <= 1) return;
    setIsLoadingGoals(true)
    getGoals({ year: selectedYear, includeProgress: true, page }).finally(() => {
      setIsLoadingGoals(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Load habits on first visit to Habits tab
  useEffect(() => {
    if (!isAuthenticated) return
    if (activeTab === 'habits') {
      try { loadHabits({ page: habitPage, limit: 9, force: true }).catch(() => { }) } catch { }
      try { loadHabitAnalytics({}).catch(() => { }) } catch { }
      try { loadHabitStats({}).catch(() => { }) } catch { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, habitPage])

  // Debug: Monitor goals changes
  useEffect(() => {
    // Goals state tracking removed after fixing
  }, [goals, hasLoadedInitialData, isLoadingGoals])

  // Load community goals (not paginated with personal goals)
  useEffect(() => {
    if (!isAuthenticated) return;
    try { loadCommunityGoalsForYear(selectedYear).catch(() => { }) } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedYear])

  // Deep link open via ?goalId=
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const gid = params.get('goalId')
      if (gid) setOpenGoalId(gid)
    } catch { }
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

  // Computed values and memoized data - MUST be before any early returns
  const goalStats = useMemo(() => {
    if (!dashboardStats) return [];
    return [
      { label: 'Total Goals', value: Number(dashboardStats.totalGoals) || 0, icon: Target, color: 'text-blue-500' },
      { label: 'Completed', value: Number(dashboardStats.completedGoals) || 0, icon: CheckCircle, color: 'text-green-500' },
      { label: 'In Progress', value: Math.max(0, (Number(dashboardStats.totalGoals) || 0) - (Number(dashboardStats.completedGoals) || 0)), icon: Circle, color: 'text-yellow-500' },
      { label: 'Today', value: `${dashboardStats.todayCompletions || 0}/${dashboardStats.dailyLimit || 3}`, icon: Calendar, color: (dashboardStats.todayCompletions || 0) >= (dashboardStats.dailyLimit || 3) ? 'text-orange-500' : 'text-purple-500' }
    ];
  }, [dashboardStats]);

  const habitsSummary = useMemo(() => {
    // If we have analytics data, show detailed stats
    if (habitAnalytics?.analytics?.totals) {
      return [
        { label: 'Done', value: Number(habitAnalytics.analytics?.totals?.done) || 0, icon: CheckCircle, color: 'text-green-500' },
        { label: 'Skipped', value: Number(habitAnalytics.analytics?.totals?.skipped) || 0, icon: SkipForward, color: 'text-yellow-500' },
        { label: 'Missed', value: Number(habitAnalytics.analytics?.totals?.missed) || 0, icon: XCircle, color: 'text-red-500' },
        { label: 'Longest Streak', value: Number(habitStats?.bestStreak ?? habitAnalytics.analytics?.totals?.longestStreak) || 0, icon: Activity, color: 'text-orange-500' }
      ];
    }
    
    // Fallback to habitStats if available
    if (habitStats) {
      return [
        { label: 'Total Habits', value: Number(habitStats.totalHabits) || 0, icon: Target, color: 'text-blue-500' },
        { label: 'Total Streak', value: Number(habitStats.totalCurrentStreak) || 0, icon: CheckCircle, color: 'text-green-500' },
        { label: 'Best Streak', value: Number(habitStats.bestStreak) || 0, icon: Activity, color: 'text-orange-500' },
        { label: 'Consistency', value: `${Number(habitStats.avgConsistency) || 0}%`, icon: Star, color: 'text-yellow-500' }
      ];
    }
    
    // No stats available
    return [];
  }, [habitAnalytics, habitStats]);

  const goalsForYear = useMemo(() => {
    const filtered = (goals || []).filter(g => g.year === selectedYear && !g.communityId && !g.isCommunitySource && !g.communityInfo);
    return filtered;
  }, [goals, selectedYear]);

  const communityGoals = useMemo(() => {
    return Array.isArray(communityGoalsByYear?.[String(selectedYear)]?.goals)
      ? communityGoalsByYear[String(selectedYear)].goals
      : [];
  }, [communityGoalsByYear, selectedYear]);

  const visibleGoals = goalsForYear;
  const totalPages = goalsPagination ? goalsPagination.pages : 1;

  const progress = useMemo(() => {
    return dashboardStats && dashboardStats.totalGoals > 0
      ? Math.min(
        Math.round((dashboardStats.completedGoals / dashboardStats.totalGoals) * 100),
        100
      )
      : 0;
  }, [dashboardStats]);

  const isScheduledToday = (habit) => {
    if (!habit) return false
    if (habit.frequency === 'daily') return true
    const day = new Date().getDay()
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day)
  }

  const frequencyLabel = (h) => {
    if (!h) return ''
    if (h.frequency === 'daily') return 'Daily'
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days = Array.isArray(h.daysOfWeek) ? h.daysOfWeek.slice().sort() : []
    return days.length ? days.map(d => names[d]).join(', ') : 'Weekly'
  }

  // Ensure a personal habit exists for a community habit; create if missing
  const ensurePersonalHabit = async (it) => {
    try {
      const existing = (useApiStore.getState().habits || []).find(h => String(h.id) === String(it.sourceId))
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
      if (created?.id) {
        try { useApiStore.getState().appendHabit(created) } catch { }
        return created
      }
    } catch { }
    return null
  }

  // Ensure a personal goal exists for a community goal; create if missing
  const ensurePersonalGoal = async (it) => {
    try {
      const existingById = (useApiStore.getState().goals || []).find(g => String(g.id) === String(it.sourceId))
      if (existingById) return existingById
      const existingByTitle = (useApiStore.getState().goals || []).find(g => String(g.title).trim().toLowerCase() === String(it.title || '').trim().toLowerCase())
      if (existingByTitle) return existingByTitle
      const goalData = {
        title: it.title,
        description: it.description || '',
        category: 'Other',
        year: selectedYear
      }
      const result = await createGoal(goalData)
      if (result?.success && result?.goal) {
        return result.goal
      }
    } catch { }
    return null
  }

  const openPrefilledCreateModal = (goalTemplate) => {
    setInitialGoalData({
      title: goalTemplate.title,
      description: goalTemplate.description,
      category: goalTemplate.category,
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
      if (habit && habit.id) {
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
    // Find the goal first
    const goal = goals.find(g => g.id === goalId || g._id === goalId)
    if (!goal) return
    
    // Check dependencies
    const checkGoalDependencies = useApiStore.getState().checkGoalDependencies
    try {
      const depResult = await checkGoalDependencies(goalId)
      const parentGoals = (depResult.success && depResult.data) ? (depResult.data.data.parentGoals || []) : []
      setGoalDependencies(parentGoals)
      
      // If there are dependencies, show warning modal first
      if (parentGoals.length > 0) {
        setGoalToDelete(goal)
        setIsGoalWarningModalOpen(true)
      } else {
        // No dependencies, go straight to delete confirmation
        setGoalToDelete(goal)
      }
    } catch (error) {
      console.error('Error checking dependencies:', error)
      setGoalDependencies([])
      // On error, still allow deletion with confirmation
      setGoalToDelete(goal)
    }
  }
  
  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return
    setIsDeletingGoal(true)
    try {
      const result = await deleteGoal(goalToDelete.id || goalToDelete._id)
      if (result.success) {
        setGoalToDelete(null)
        setGoalDependencies([])
        await getDashboardStats({ force: true })
        getGoals({ year: selectedYear, includeProgress: true, page }, { force: true })
      }
    } finally {
      setIsDeletingGoal(false)
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
    } catch { }
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

  // Loading state - only show if we don't have any dashboard stats yet
  if (!dashboardStats && !hasLoadedInitialData) {
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
      const res = await useApiStore.getState().logHabit(selectedHabit.id, status);
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

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <button onClick={() => handleTabChange('goals')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'goals' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Goals</button>
            <button onClick={() => handleTabChange('habits')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'habits' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>Habits</button>
          </div>
        </div>

        {activeTab === 'goals' && (
          <>
            {/* Year Selection */}
            <div className="mb-8">
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
            </div>

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
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                {goalStats.map((stat) => (
                  <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                    {stat.emoji ? (<div className="text-3xl mb-2">{stat.emoji}</div>) : (<stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />)}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress Bar */}
            {dashboardStats && dashboardStats.totalGoals > 0 && (
              <div className="glass-card-hover p-6 rounded-xl mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedYear} Progress
                  </h3>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {progress}% Complete
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primary-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons (Goals) */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                <Plus className="h-5 w-5 mr-2" />Add New Goal
              </button>
              {dashboardStats && dashboardStats.totalGoals > 0 && (
                <button onClick={() => setIsSuggestionsOpen(true)} className="btn-primary flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />Discover Goal Ideas
                </button>
              )}
            </div>

            {/* Goals List */}
            <div>
              {(() => {
                const showLoading = (!hasLoadedInitialData || isLoadingGoals) && visibleGoals.length === 0;
                const showGoals = visibleGoals.length > 0;
                
                if (showLoading) {
                  return (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading your goals...</p>
                    </div>
                  );
                } else if (showGoals) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {visibleGoals.map((goal, index) => (
                        <WishCard key={goal.id} wish={goal} year={selectedYear} index={index} onToggle={() => handleToggleGoal(goal.id)} onDelete={() => handleDeleteGoal(goal.id)} onComplete={handleCompleteGoal} isViewingOwnGoals={true} onOpenGoal={(id) => setOpenGoalId(id)} onOpenAnalytics={(id) => navigate(`/goals/${id}/analytics`)} />
                      ))}
                    </div>
                  );
                } else {
                  return <div className="text-center py-12 text-gray-500 dark:text-gray-400">No goals for {selectedYear} yet.</div>;
                }
              })()}
              {goalsPagination && goalsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button 
                    disabled={page <= 1 || isLoadingGoals} 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isLoadingGoals ? 'Loading...' : `Page ${goalsPagination.page} of ${goalsPagination.pages}`}
                  </div>
                  <button 
                    disabled={page >= goalsPagination.pages || isLoadingGoals} 
                    onClick={() => setPage(p => Math.min(goalsPagination.pages, p + 1))} 
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Community Goals Section (render using WishCard style) */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Community Goals</h3>
                {communityGoals.length > 0 && (
                  <a href="/discover?tab=communities" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    Discover more →
                  </a>
                )}
              </div>
              {communityGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {communityGoals.map((goal, index) => (
                    <WishCard
                      key={goal.id}
                      wish={goal}
                      year={selectedYear}
                      index={index}
                      onToggle={() => handleToggleGoal(goal.id)}
                      onDelete={() => handleDeleteGoal(goal.id)}
                      onComplete={handleCompleteGoal}
                      isViewingOwnGoals={true}
                      onOpenGoal={(id) => setOpenGoalId(id)}
                      onOpenAnalytics={(id) => navigate(`/goals/${id}/analytics`)}
                      footer={(
                        <div className="flex items-center justify-end">
                          <a
                            href={`/communities/${goal?.communityInfo?.communityId}?tab=items`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm"
                          >
                            Go to community
                          </a>
                        </div>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card-hover p-8 rounded-2xl text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <p className="font-medium mb-1">No community goals joined yet</p>
                    <p className="text-sm">Join community goals to track them with others!</p>
                  </div>
                  <a
                    href="/discover?tab=communities"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <Compass className="h-4 w-4" /> Explore Communities
                  </a>
                </div>
              )}
            </div>

            {/* Legacy Community Items Section - only show if no new-style community goals exist */}
            {false && communityItems && communityItems.filter(i => i.type === 'goal').length > 0 && communityGoals.length === 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community goals (legacy)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {communityItems.filter(i => i.type === 'goal').map((it, index) => {
                    const uniqueKey = `community-goal-${it.sourceId || it.id}-${it.communityId || index}`;
                    const mapped = {
                      id: it.sourceId || it.id,
                      title: it.title,
                      description: it.description || '',
                      category: 'Community',
                      createdAt: new Date().toISOString(),
                      progress: { percent: it.personalPercent || 0 },
                      completed: false,
                      isLocked: true // lock goal actions since these are community mirrors
                    }
                    return (
                      <WishCard
                        key={uniqueKey}
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
                                onClick={async () => { const g = await ensurePersonalGoal(it); if (g?.id) { try { setOpenGoalId(g.id) } catch { } } }}
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
            {habitsSummary.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                {habitsSummary.map((stat) => (
                  <div key={stat.label} className="glass-card-hover p-6 rounded-xl text-center">
                    {stat.emoji ? (<div className="text-3xl mb-2">{stat.emoji}</div>) : (<stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />)}
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons (Habits) */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setIsHabitModalOpen(true)} className="btn-primary">
                <Plus className="h-5 w-5 mr-2" />Add New Habit
              </button>
              <button onClick={() => setIsHabitIdeasOpen(true)} className="btn-primary flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />Discover Habit Ideas
              </button>
            </div>

            {/* Habits List (cards like goals) */}
            <div>
              {userHabits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userHabits.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      onClick={() => setSelectedHabit(h)}
                      className="glass-card-hover p-6 rounded-2xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200"
                    >
                      {/* Header with Edit/Delete Actions */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate flex-1" title={h.name}>{h.name}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedHabit(h); setIsEditHabitOpen(true); }}
                                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                title="Edit habit"
                              >
                                <Pencil className="h-4 w-4 text-gray-400 hover:text-primary-500" />
                              </button>
                              <button
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  // Check dependencies before showing delete modal
                                  console.log('[Habit Delete] Checking dependencies for habit:', h.id);
                                  const depResult = await useApiStore.getState().checkHabitDependencies(h.id);
                                  console.log('[Habit Delete] Dependencies result:', depResult);
                                  if (depResult.success && depResult.data) {
                                    const linkedGoals = depResult.data.data.linkedGoals || [];
                                    console.log('[Habit Delete] Setting linkedGoals:', linkedGoals);
                                    setHabitDependencies(linkedGoals);
                                    
                                    // If there are dependencies, show warning modal first
                                    if (linkedGoals.length > 0) {
                                      setHabitToDelete(h);
                                      setIsHabitWarningModalOpen(true);
                                    } else {
                                      // No dependencies, go straight to delete confirmation
                                      setHabitToDelete(h); 
                                      setIsHabitDeleteModalOpen(true);
                                    }
                                  } else {
                                    // On error, still allow deletion with confirmation
                                    setHabitToDelete(h); 
                                    setIsHabitDeleteModalOpen(true);
                                  }
                                }}
                                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                title="Delete habit"
                              >
                                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          {h.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3" title={h.description}>{h.description}</p>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            {isScheduledToday(h) ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                                <Clock className="h-3.5 w-3.5" /> Today
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                                <Clock className="h-3.5 w-3.5" /> Off
                              </div>
                            )}
                            <div className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                              {frequencyLabel(h)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {h.totalCompletions || 0}
                              {h.targetCompletions && (
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/{h.targetCompletions}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Completions</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {h.totalDays || 0}
                              {h.targetDays && (
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/{h.targetDays}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Active                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      Days</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No habits yet. Create your first habit!</div>
              )}
              {habitsPagination && habitsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button 
                    disabled={habitPage <= 1 || loading} 
                    onClick={() => setHabitPage(p => Math.max(1, p - 1))} 
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loading ? 'Loading...' : `Page ${habitsPagination.page} of ${habitsPagination.pages}`}
                  </div>
                  <button 
                    disabled={habitPage >= habitsPagination.pages || loading} 
                    onClick={() => setHabitPage(p => Math.min(habitsPagination.pages, p + 1))} 
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Community Habits Section */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Community Habits</h3>
                {communityHabits.length > 0 && (
                  <a href="/discover?tab=communities" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    Discover more →
                  </a>
                )}
              </div>
              {communityHabits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {communityHabits.map((h, idx) => {
                    return (
                      <div key={h.id} onClick={() => setSelectedHabit(h)} className="group glass-card-hover p-6 rounded-2xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200">
                        {/* Header with community badge */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate" title={h.name}>{h.name}</h3>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">Community</span>
                            </div>
                            {h.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2" title={h.description}>{h.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Frequency and action */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                            {frequencyLabel(h)}
                          </div>
                          <div className="text-xs text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click for details →
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="glass-card-hover p-8 rounded-2xl text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <p className="font-medium mb-1">No community habits joined yet</p>
                    <p className="text-sm">Join community habits to track them with others!</p>
                  </div>
                  <a
                    href="/discover?tab=communities"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <Compass className="h-4 w-4" /> Explore Communities
                  </a>
                </div>
              )}
            </div>

            {/* Legacy Community Habits Section - disabled for cleaner dashboard */}
            {false && communityItems && communityItems.filter(i => i.type === 'habit').length > 0 && communityHabits.length === 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Community habits (legacy)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {communityItems.filter(i => i.type === 'habit').map((it, idx) => {
                    const base = (habits || []).find(h => String(h.id) === String(it.sourceId));
                    const h = base || {
                      id: it.sourceId,
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
                        key={it.id || idx}
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
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('skipped'); try { const target = base || await ensurePersonalHabit(it); if (target?.id) await logHabit(target.id, 'skipped'); } catch { } }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday(h) ? 'bg-yellow-600/90 hover:bg-yellow-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                            disabled={false}
                          >
                            <SkipForward className="h-4 w-4" /> Skip
                          </button>
                          <button
                            onClick={async (e) => { e.stopPropagation(); handleStatusToast('done'); try { const target = base || await ensurePersonalHabit(it); if (target?.id) await logHabit(target.id, 'done'); } catch { } }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday(h) ? 'bg-green-600/90 hover:bg-green-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
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
        <Suspense fallback={null}><CreateGoalWizard isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setInitialGoalData(null) }} year={selectedYear} initialData={initialGoalData} /></Suspense>
      )}

      {/* Goal Suggestions Modal */}
      {isSuggestionsOpen && (
        <Suspense fallback={null}><GoalSuggestionsModal isOpen={isSuggestionsOpen} onClose={() => setIsSuggestionsOpen(false)} interests={userInterests} onSelect={openPrefilledCreateModal} limit={6} title="Goal Suggestions" /></Suspense>
      )}

      {/* Habit Suggestions Modal */}
      {isHabitIdeasOpen && (
        <Suspense fallback={null}><HabitSuggestionsModal isOpen={isHabitIdeasOpen} onClose={() => setIsHabitIdeasOpen(false)} interests={userInterests} onSelect={openPrefilledHabitModal} limit={6} title="Habit Suggestions" /></Suspense>
      )}

      {/* Create Habit Modal */}
      {isHabitModalOpen && (
        <Suspense fallback={null}><CreateHabitModal isOpen={isHabitModalOpen} onClose={() => { setIsHabitModalOpen(false); setInitialHabitData(null) }} onCreated={handleHabitCreated} initialData={initialHabitData} /></Suspense>
      )}

      {/* Edit Habit Modal */}
      {isEditHabitOpen && (
        <Suspense fallback={null}><EditHabitModal
          isOpen={isEditHabitOpen}
          habit={selectedHabit}
          onClose={() => setIsEditHabitOpen(false)}
          onSave={async (payload) => {
            const res = await useApiStore.getState().updateHabit(selectedHabit.id, payload)
            if (res?.success) {
              try { setSelectedHabit(prev => (prev ? { ...prev, ...res.habit } : prev)) } catch { }
              return res
            }
            throw new Error(res?.error || 'Failed to update habit')
          }}
        /></Suspense>
      )}


      {/* Habit Detail Modal */}
      {selectedHabit && (
        <Suspense fallback={null}><HabitDetailModal
          isOpen={!!selectedHabit}
          habit={selectedHabit}
          onClose={() => setSelectedHabit(null)}
          onLog={handleHabitLog}
          onEdit={() => setIsEditHabitOpen(true)}
          onDelete={async () => { 
            // Check dependencies first
            const checkHabitDependencies = useApiStore.getState().checkHabitDependencies
            const depResult = await checkHabitDependencies(selectedHabit.id)
            
            if (depResult.success && depResult.data) {
              const linkedGoals = depResult.data.data.linkedGoals || []
              setHabitDependencies(linkedGoals)
              
              // If there are dependencies, show warning modal first
              if (linkedGoals.length > 0) {
                setHabitToDelete(selectedHabit);
                setIsHabitWarningModalOpen(true);
              } else {
                // No dependencies, go straight to delete confirmation
                setHabitToDelete(selectedHabit); 
                setIsHabitDeleteModalOpen(true);
              }
            } else {
              // On error, still allow deletion with confirmation
              setHabitToDelete(selectedHabit); 
              setIsHabitDeleteModalOpen(true);
            }
          }} />
        </Suspense>
      )}

      {/* Habit Dependency Warning Modal */}
      {isHabitWarningModalOpen && habitToDelete && (
        <Suspense fallback={null}><DependencyWarningModal
          isOpen={isHabitWarningModalOpen}
          onClose={() => { setIsHabitWarningModalOpen(false); setHabitToDelete(null); setHabitDependencies([]); }}
          onContinue={() => {
            setIsHabitWarningModalOpen(false);
            setIsHabitDeleteModalOpen(true);
          }}
          itemTitle={habitToDelete.name}
          itemType="habit"
          parentGoals={habitDependencies}
        /></Suspense>
      )}

      {/* Habit Delete Confirmation Modal */}
      {isHabitDeleteModalOpen && habitToDelete && (
        <Suspense fallback={null}><DeleteConfirmModal
          isOpen={isHabitDeleteModalOpen}
          onClose={() => { setIsHabitDeleteModalOpen(false); setHabitToDelete(null); setHabitDependencies([]); }}
          onConfirm={async () => {
            setIsDeletingHabit(true);
            try {
              const res = await useApiStore.getState().deleteHabit(habitToDelete.id);
              if (res.success) {
                setIsHabitDeleteModalOpen(false);
                setHabitToDelete(null);
                setHabitDependencies([]);
                if (selectedHabit?.id === habitToDelete.id) {
                  setSelectedHabit(null);
                }
              }
            } finally {
              setIsDeletingHabit(false);
            }
          }}
          goalTitle={habitToDelete.name}
          isDeleting={isDeletingHabit}
          itemType="habit"
        /></Suspense>
      )}

      {/* Goal Dependency Warning Modal */}
      {isGoalWarningModalOpen && goalToDelete && (
        <Suspense fallback={null}><DependencyWarningModal
          isOpen={isGoalWarningModalOpen}
          onClose={() => { setIsGoalWarningModalOpen(false); setGoalToDelete(null); setGoalDependencies([]); }}
          onContinue={() => {
            setIsGoalWarningModalOpen(false);
            // Note: goalToDelete is already set, just open the confirmation modal
          }}
          itemTitle={goalToDelete.title}
          itemType="goal"
          parentGoals={goalDependencies}
        /></Suspense>
      )}

      {/* Goal Delete Confirmation Modal */}
      {goalToDelete && !isGoalWarningModalOpen && (
        <Suspense fallback={null}><DeleteConfirmModal
          isOpen={!!goalToDelete}
          onClose={() => { setGoalToDelete(null); setGoalDependencies([]); }}
          onConfirm={confirmDeleteGoal}
          goalTitle={goalToDelete.title}
          isDeleting={isDeletingGoal}
          itemType="goal"
        /></Suspense>
      )}

      {/* Goal Details Modal (with timeline) */}
      {openGoalId && (
        <Suspense fallback={null}><GoalDetailsModal
          isOpen={!!openGoalId}
          goalId={openGoalId}
          autoOpenComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        /></Suspense>
      )}
    </div>
  )
}


export default DashboardPage 