import { isRecentlyCompleted } from '../utils/goalShare'
import StartupSkeleton from '../components/StartupSkeleton'
import { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CategoryBadge from '../components/CategoryBadge'
import CategoryIcon from '../components/CategoryIcon'
import { Plus, Target, CheckCircle, TrendingUp, Calendar, ChevronDown, Search, Flag, Clock, Eye, Edit, Trash2, Share2, Filter, ArrowUpDown, MinusCircle, Compass, Home, Settings, Users, ChevronRight, Play, MoreVertical, SlidersHorizontal, BarChart3, LayoutGrid, List, Map, Copy } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MetricInfoModal from '../components/MetricInfoModal'
import HomeOverview from '../components/HomeOverview'
import HabitsWorkspace from '../components/HabitsWorkspace'
import { habitsAPI } from '../services/api'

const CreateGoalWizard = lazy(() => import('../components/CreateGoalWizard'))
const CompletionModal = lazy(() => import('../components/CompletionModal'))
const GoalPostModal = lazy(() => import('../components/GoalPostModal'))
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'))
const ShareModal = lazy(() => import('../components/ShareModal'))
const HabitDetailModal = lazy(() => import('../components/HabitDetailModal'))
const CreateHabitModal = lazy(() => import('../components/CreateHabitModal'))
const EditHabitModal = lazy(() => import('../components/EditHabitModal'))
const DeleteConfirmModal = lazy(() => import('../components/DeleteConfirmModal'))
const HabitSuggestionsModal = lazy(() => import('../components/HabitSuggestionsModal'))
const GoalSuggestionsModal = lazy(() => import('../components/GoalSuggestionsModal'))
const DependencyWarningModal = lazy(() => import('../components/DependencyWarningModal'))
const WhatsNewModal = lazy(() => import('../components/WhatsNewModal'))
const DailyLogsPromptModal = lazy(() => import('../components/DailyLogsPromptModal'))

const ATTENTION_GOAL_HEALTH = new Set(['SLIPPING', 'STALLED'])

const getGoalHealthState = goal => String(goal?.goalHealth || '').toUpperCase()

const getGoalStatus = goal => {
  if (goal.completedAt) {
    return { label: 'Completed', state: 'COMPLETED', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' }
  }

  const state = getGoalHealthState(goal) || 'GETTING_STARTED'
  const statuses = {
    GETTING_STARTED: { label: 'Getting Started', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' },
    STRONG: { label: 'Strong', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
    STABLE: { label: 'Stable', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' },
    SLIPPING: { label: 'Slipping', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
    STALLED: { label: 'Stalled', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' }
  }

  return { state, ...(statuses[state] || { label: goal.healthLabel || 'Active', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' }) }
}

const DashboardPageNew = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [openGoalId, setOpenGoalId] = useState(null)
  const [openGoalPostId, setOpenGoalPostId] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [isEditHabitOpen, setIsEditHabitOpen] = useState(false)
  const [isHabitDeleteModalOpen, setIsHabitDeleteModalOpen] = useState(false)
  const [habitToDelete, setHabitToDelete] = useState(null)
  const [habitDependencies, setHabitDependencies] = useState([])
  const [isHabitWarningModalOpen, setIsHabitWarningModalOpen] = useState(false)
  const [isDeletingHabit, setIsDeletingHabit] = useState(false)
  const [skipHabitDependencyCheck, setSkipHabitDependencyCheck] = useState(false)
  const [isHabitIdeasOpen, setIsHabitIdeasOpen] = useState(false)
  const [isGoalIdeasOpen, setIsGoalIdeasOpen] = useState(false)
  const [initialHabitData, setInitialHabitData] = useState(null)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
  const [isEditGoalWizardOpen, setIsEditGoalWizardOpen] = useState(false)
  const [isEditCompletionModalOpen, setIsEditCompletionModalOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState(null)
  const [isGoalDeleteModalOpen, setIsGoalDeleteModalOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [isGoalFilterSheetOpen, setIsGoalFilterSheetOpen] = useState(false)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)
  const [isShareGoalModalOpen, setIsShareGoalModalOpen] = useState(false)
  const [goalToShare, setGoalToShare] = useState(null)
  const [goalFilter, setGoalFilter] = useState('all') // all, completed, in-progress
  const [goalCategoryFilter, setGoalCategoryFilter] = useState('all')
  const [goalActionMenu, setGoalActionMenu] = useState(null)
  useEffect(() => {
    const completed = event => setSelectedGoal(previous => previous && String(previous.id || previous._id) === String(event.detail?.id || event.detail?._id) ? { ...previous, ...event.detail, _openAnalytics: false } : previous)
    window.addEventListener('wt_goal_completed', completed)
    return () => window.removeEventListener('wt_goal_completed', completed)
  }, [])

  const [goalSort, setGoalSort] = useState('newest') // newest, oldest
  const [goalView, setGoalView] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9 // 3x3 grid
  const [isWhatsNewModalOpen, setIsWhatsNewModalOpen] = useState(false)
  const [isInitialDashboardLoading, setIsInitialDashboardLoading] = useState(true)
  const [metricInfo, setMetricInfo] = useState(null)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(false)
  const hasBootstrappedDashboardRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isFilterDropdownOpen && !isYearDropdownOpen) return undefined

    const closeDropdowns = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && event.target.closest('[data-goal-filter-dropdown]')) return
      setIsFilterDropdownOpen(false)
      setIsYearDropdownOpen(false)
    }

    document.addEventListener('pointerdown', closeDropdowns)
    document.addEventListener('keydown', closeDropdowns)
    return () => {
      document.removeEventListener('pointerdown', closeDropdowns)
      document.removeEventListener('keydown', closeDropdowns)
    }
  }, [isFilterDropdownOpen, isYearDropdownOpen])

  const {
    isAuthenticated,
    user,
    goals,
    habits,
    dashboardYears,
    dashboardStats,
    getDashboardStats,
    getGoals,
    loadHabits,
    getDashboardYears,
    getLatestProductUpdate,
    latestProductUpdate,
    recentActivities,
    getRecentActivities,
  } = useApiStore()

  
  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return

    let isCancelled = false
    const shouldShowPageLoader = !hasBootstrappedDashboardRef.current

    if (shouldShowPageLoader) {
      setIsInitialDashboardLoading(true)
    }

    const fetchDashboardData = async () => {
      try {
        await Promise.all([
          getDashboardStats({ year: selectedYear }),
          getGoals({ year: selectedYear, page: 1, limit: 1000 }),
          loadHabits({ page: 1, year: selectedYear }),
          getDashboardYears(),
          getRecentActivities({ page: 1, limit: 12, type: 'personal', scope: 'overview' })
        ])
      } finally {
        if (!isCancelled && shouldShowPageLoader) {
          hasBootstrappedDashboardRef.current = true
          setIsInitialDashboardLoading(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      isCancelled = true
    }
  }, [isAuthenticated, selectedYear])

  useEffect(() => {
    const openQuickActions = () => setQuickActionsOpen(true)
    window.addEventListener('wt_open_quick_actions', openQuickActions)
    return () => window.removeEventListener('wt_open_quick_actions', openQuickActions)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    getLatestProductUpdate()
  }, [isAuthenticated, getLatestProductUpdate])


  useEffect(() => {
    const preloadActionModals = () => {
      import('../components/CreateGoalWizard')
      import('../components/CompletionModal')
      import('../components/EditHabitModal')
      import('../components/DeleteConfirmModal')
      import('../components/DependencyWarningModal')
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preloadActionModals)
      return () => window.cancelIdleCallback?.(id)
    }

    const timer = setTimeout(preloadActionModals, 0)
    return () => clearTimeout(timer)
  }, [])

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    const action = searchParams.get('action')
    if (!isAuthenticated || !action) return

    if (action === 'create') {
      const tab = searchParams.get('tab') || 'goals'
      if (tab === 'habits') setIsHabitModalOpen(true)
      else setIsCreateModalOpen(true)
      setSearchParams({ tab })
    }
    if (action === 'quick') {
      setQuickActionsOpen(true)
      setSearchParams({ tab: 'overview' })
    }
    if (action === 'daily-log') {
      setIsDailyLogOpen(true)
      setSearchParams({ tab: 'overview' })
    }
  }, [isAuthenticated, searchParams, setSearchParams])

  // Show What's New modal when latestProductUpdate arrives (only once per session)
  useEffect(() => {
    if (latestProductUpdate && !isWhatsNewModalOpen) {
      setIsWhatsNewModalOpen(true)
    }
  }, [latestProductUpdate])

  const handleHabitCreated = (habit) => {
    if (habit?.id) {
      useApiStore.getState().appendHabit?.(habit)
    }
    loadHabits({ page: 1, year: selectedYear })
    getDashboardStats({ force: true, year: selectedYear })
    getDashboardYears()
  }

  const handleHabitLog = async (status, mood = 'neutral', count = 1) => {
    if (!selectedHabit) return { success: false }
    const habitId = selectedHabit.id || selectedHabit._id
    if (!habitId) return { success: false }

    try {
      const res = await useApiStore.getState().logHabit(habitId, status, mood, count)
      if (res?.success) {
        const nextTodayCount = status === 'done'
          ? (res?.log?.completionCount ?? ((selectedHabit?.todayCompletionCount || 0) + count))
          : 0

        setSelectedHabit((prev) =>
          prev
            ? {
                ...prev,
                todayStatus: status,
                todayCompletionCount: nextTodayCount,
              }
            : prev
        )
        // Refresh dashboard stats and habits so UI reflects skip/done immediately
        await Promise.all([
          getDashboardStats({ force: true, year: selectedYear }),
          loadHabits({ page: 1, year: selectedYear, force: true })
        ])
        window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: status === 'done' ? 'Habit logged!' : 'Habit skipped', type: 'success' } }))
        return { success: true, todayCompletionCount: nextTodayCount, log: res?.log }
      }
      return { success: false, error: res?.error }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: e?.message || 'Failed to log', type: 'error' } }))
      return { success: false, error: e?.message }
    }
  }

  const openPrefilledHabitModal = (template) => {
    setInitialHabitData(template || null)
    setIsHabitModalOpen(true)
    setIsHabitIdeasOpen(false)
  }

  const openPrefilledGoalModal = (template) => {
    setInitialGoalData(template || null)
    setIsCreateModalOpen(true)
    setIsGoalIdeasOpen(false)
  }

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >=  5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const handleTabChange = (tab) => {
    setSearchParams({ tab })
    setActiveTab(tab)
  }

  // Filter and sort data
  const filteredGoals = useMemo(() => {
    let filtered = goals || []
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(g =>
        g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply filter
    if (goalFilter === 'completed') {
      filtered = filtered.filter(g => g.completedAt)
    } else if (goalFilter === 'in-progress') {
      filtered = filtered.filter(g => !g.completedAt && !ATTENTION_GOAL_HEALTH.has(getGoalHealthState(g)))
    } else if (goalFilter === 'needs-attention') {
      filtered = filtered.filter(g => !g.completedAt && ATTENTION_GOAL_HEALTH.has(getGoalHealthState(g)))
    }

    if (goalCategoryFilter !== 'all') {
      filtered = filtered.filter(g => g.category === goalCategoryFilter)
    }
    
    // Apply sort
    if (goalSort === 'newest') {
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (goalSort === 'oldest') {
      filtered = [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }
    
    return filtered
  }, [goals, searchQuery, goalFilter, goalCategoryFilter, goalSort])

  // Paginated goals
  const paginatedGoals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredGoals.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredGoals, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredGoals.length / itemsPerPage)

  const goalSummary = useMemo(() => {
    const allGoals = goals || []
    const completed = allGoals.filter(goal => goal.completedAt).length
    const active = allGoals.filter(goal => !goal.completedAt).length
    const overdue = allGoals.filter(goal => !goal.completedAt && goal.targetDate && new Date(goal.targetDate) < new Date()).length
    const progressTotal = allGoals.reduce((total, goal) => total + Number(goal.completedAt ? 100 : (goal.progress?.percent || 0)), 0)
    const percent = allGoals.length ? Math.round(progressTotal / allGoals.length) : 0

    return { completed, active, overdue, percent }
  }, [goals])

  const goalCover = (goal) => {
    const category = String(goal?.category || '').toLowerCase()
    if (category.includes('health') || category.includes('fitness')) return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80'
    if (category.includes('learn') || category.includes('education')) return 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80'
    if (category.includes('career')) return 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'
    if (category.includes('finance')) return 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&w=900&q=80'
    if (category.includes('travel')) return 'https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=900&q=80'
    return 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80'
  }

  const filteredHabits = useMemo(() => {
    if (!searchQuery) return habits || []
    return (habits || []).filter(h =>
      h.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [habits, searchQuery])

  // Available years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [...new Set([...(dashboardYears || []), currentYear - 1, currentYear, currentYear + 1, selectedYear])].sort((a, b) => b - a)
  }, [dashboardYears, selectedYear])

  // Inspirational quotes
  const quotes = [
    "Success is a sequence of deliberate actions, executed with consistency.",
    "Precision in every step. Your milestones are progressing steadily.",
    "Excellence is not an act, but a habit formed through daily actions."
  ]
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]


  if (isAuthenticated && isInitialDashboardLoading) return <StartupSkeleton />

  return (
    <div className="wt-dashboard min-h-screen bg-[#f5f5f5] dark:bg-gray-900">
      <aside className="wt-home-sidebar fixed bottom-0 left-0 top-16 z-30 hidden w-56 flex-col border-r border-gray-100 bg-white px-4 py-6 dark:border-gray-800 dark:bg-gray-900 lg:flex">
        <nav className="space-y-1">
          {[
            ['Home', Home, '/home'],
            ['Explore', Compass, '/discover'],
            ['Communities', Users, '/feed'],
            ['Goals', Target, '/home?tab=goals'],
            ['Habits', CheckCircle, '/home?tab=habits'],
            ['Journal', Edit, '/feed'],
            ['Leaderboard', TrendingUp, '/leaderboard']
          ].map(([label, Icon, destination]) => (
            <button key={label} type="button" onClick={() => navigate(destination)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${(label === 'Goals' && activeTab === 'goals') || (label === 'Habits' && activeTab === 'habits') || (label === 'Home' && activeTab === 'overview') ? 'bg-blue-50 text-[#1683ed] dark:bg-blue-950/30' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" onClick={() => navigate(`/profile/@${user?.username || ''}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"><Users className="h-4 w-4" />Profile</button>
          <button type="button" onClick={() => navigate('/settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"><Settings className="h-4 w-4" />Settings</button>
        </div>
      </aside>
      <div className="wt-home-content max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Goals and habits controls remain available outside the home overview. */}
        {false && activeTab === 'habits' && <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 gap-4"
        >
          {/* Tabs */}
          <div className="flex items-center gap-6 sm:gap-8">
            <button
              onClick={() => handleTabChange('overview')}
              className={`relative pb-2 font-medium font-manrope transition-colors text-sm sm:text-base ${
                activeTab === 'overview' ? 'text-[#4c99e6]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
              {activeTab === 'overview' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4c99e6]" />}
            </button>
            <button
              onClick={() => handleTabChange('goals')}
              className={`relative pb-2 font-medium font-manrope transition-colors text-sm sm:text-base ${
                activeTab === 'goals'
                  ? 'text-[#4c99e6]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Goals
              {activeTab === 'goals' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4c99e6]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => handleTabChange('habits')}
              className={`relative pb-2 font-medium font-manrope transition-colors text-sm sm:text-base ${
                activeTab === 'habits'
                  ? 'text-[#4c99e6]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Habits
              {activeTab === 'habits' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4c99e6]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Controls - Fiscal Year and Add Button */}
          <div className={`flex flex-row items-center gap-2 ${activeTab === 'goals' ? 'justify-between' : 'justify-end'}`}>
            {/* Year Selector - Only for Goals */}
            {activeTab === 'goals' && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedYear}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                <AnimatePresence>
                  {isYearDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsYearDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                      >
                      {availableYears.map((year) => (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedYear(year)
                            setIsYearDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope ${
                            selectedYear === year
                              ? 'bg-blue-50 dark:bg-gray-700 text-[#4c99e6] font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Right Side Buttons Group */}
            <div className="flex items-center gap-2">
              {/* Add Button */}
              <button
                onClick={() => activeTab === 'habits' ? setIsHabitModalOpen(true) : setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-sm whitespace-nowrap flex-shrink-0"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{activeTab === 'habits' ? 'Add Habit' : 'Add Goal'}</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Discover Button */}
              <button
                onClick={() => activeTab === 'habits' ? setIsHabitIdeasOpen(true) : setIsGoalIdeasOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-sm whitespace-nowrap flex-shrink-0"
              >
                <Target className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{activeTab === 'habits' ? 'Discover Habits' : 'Discover Goals'}</span>
                <span className="sm:hidden">Discover</span>
              </button>
            </div>
          </div>
        </motion.div>
        </>}

        {/* Stats Grid - 4 cards in single row */}
        {false && activeTab === 'habits' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {activeTab !== 'habits' ? (
            <>
              {/* Total Goals */}
              <button type="button" onClick={() => setMetricInfo({ title: 'Total Goals', description: 'The number of goals you have created.', note: 'Completed goals are included so you can see your full goal set.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Target className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.totalGoals || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Total Goals
                </div>
              </button>

              {/* Completed */}
              <button type="button" onClick={() => setMetricInfo({ title: 'Completed Goals', description: 'Goals you have marked as finished.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {(dashboardStats?.completedGoals || 0) + ' / ' + (dashboardStats?.totalGoals || 0)}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Completed Goals
                </div>
              </button>

              {/* Today's Wins */}
              <button type="button" onClick={() => setMetricInfo({ title: "Today's Wins", description: 'Meaningful goals completed today in your local timezone.', note: 'Browsing, likes, comments, and empty logs are not included.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.todayCompletions || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Today's Wins
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Current Streak */}
              <button type="button" onClick={() => setMetricInfo({ title: 'Current Streak', description: 'Your longest run of consecutive scheduled habit occurrences completed without a break.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.currentHabitStreak ?? 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Current Streak
                </div>
              </button>

              {/* Best Streak */}
              <button type="button" onClick={() => setMetricInfo({ title: 'Best Streak', description: 'The highest streak you have reached for any habit.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Flag className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.bestStreak ?? 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Best Streak
                </div>
              </button>

              {/* Today's Habit Progress */}
              <button type="button" onClick={() => setMetricInfo({ title: "Today's Habit Progress", description: 'How many habit occurrences scheduled for today you have completed.', note: 'Habits not scheduled today are excluded.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {(dashboardStats?.todayHabitLogs ?? 0) + ' / ' + (dashboardStats?.activeToday ?? 0)}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Today's Habit Progress
                </div>
              </button>
              <button type="button" onClick={() => setMetricInfo({ title: 'Active Days', description: 'Days in the last seven days when you completed at least one meaningful goal, sub-goal, or habit action.' })} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-3"><div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"><Calendar className="w-5 h-5 text-[#4c99e6]" /></div></div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">{(dashboardStats?.activeDays ?? 0) + ' / ' + (dashboardStats?.activeDaysPeriod ?? 7)}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">Active Days</div>
              </button>

            </>
          )}
        </motion.div>
        )}

        {activeTab === 'overview' && (
          <HomeOverview
            user={user}
            goals={goals}
            habits={habits}
            stats={dashboardStats}
            recentActivities={recentActivities}
            quickActionsOpen={quickActionsOpen}
            setQuickActionsOpen={setQuickActionsOpen}
            onGoal={(goal) => goal ? setSelectedGoal(goal) : setIsCreateModalOpen(true)}
            onHabit={(habit) => habit ? setSelectedHabit(habit) : setIsHabitModalOpen(true)}
            onTab={handleTabChange}
            navigate={navigate}
            onDailyLog={() => setIsDailyLogOpen(true)}
          />
        )}

        {false && activeTab === 'overview' && (
          <motion.section initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-8">
            <div className="wt-home-hero relative min-h-[170px] overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-sm sm:min-h-[210px] sm:p-8">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-75" />
              <div className="absolute inset-0 bg-slate-950/35" />
              <div className="relative max-w-xl pt-6 sm:pt-10"><p className="text-xs font-medium text-white/80 sm:text-sm">Small steps today, big progress tomorrow.</p><h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Keep moving forward, {user?.name?.split(' ')[0] || 'there'}.</h1><p className="mt-2 text-sm text-white/80">Your progress, weekly trail, today&apos;s focus and quick actions in one place.</p></div>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-xl bg-white p-1 shadow-sm dark:bg-gray-800">
              {['overview', 'goals', 'habits'].map((tab) => <button key={tab} type="button" onClick={() => handleTabChange(tab)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'bg-blue-50 text-[#1683ed] dark:bg-blue-950/40' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>{tab}</button>)}
            </div>
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 sm:p-7 dark:from-blue-950/40 dark:via-gray-800 dark:to-cyan-950/30"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Your Momentum</p><p className="mt-1 text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{dashboardStats?.weekMomentum ?? dashboardStats?.goalProgress ?? 0}</p><p className="mt-1 text-xs font-semibold text-emerald-600">{dashboardStats?.weekMomentum ? '+6 this week' : 'Keep building your momentum'}</p></div><div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600 dark:bg-emerald-950/40">↗ +6</div></div><div className="mt-4 h-20 overflow-hidden rounded-xl bg-blue-100/50 dark:bg-blue-900/30"><svg viewBox="0 0 600 120" preserveAspectRatio="none" className="h-full w-full"><path d="M0 90 C70 35 95 100 160 72 S245 38 300 78 S380 110 440 58 S510 25 600 70 V120 H0 Z" fill="rgba(96,165,250,.2)" /><path d="M0 90 C70 35 95 100 160 72 S245 38 300 78 S380 110 440 58 S510 25 600 70" fill="none" stroke="#60a5fa" strokeWidth="3" /></svg></div></div>
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700 sm:grid-cols-4">{[['Goals progressed', `${dashboardStats?.goalsProgressed ?? dashboardStats?.completedGoals ?? 0}/5`], ['Consistency', `${dashboardStats?.weekConsistency ?? 0}%`], ['Habit completions', dashboardStats?.todayHabitLogs ?? 0], ['Active goals', dashboardStats?.activeGoals ?? dashboardStats?.totalGoals ?? 0]].map(([label, value]) => <div key={label} className="bg-white p-4 dark:bg-gray-800"><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p><p className="text-xs text-gray-500">{label}</p></div>)}</div>
            </div>
            <button type="button" onClick={() => handleTabChange('goals')} className="flex w-full items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition-colors hover:border-blue-300 dark:border-blue-900 dark:bg-blue-950/30 sm:p-5"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[url('https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=200&q=80')] bg-cover bg-center" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 dark:text-white">Your Weekly Trail is ready!</p><p className="mt-1 text-xs text-gray-600 dark:text-gray-300">You gained +7 momentum this week.</p></div><ChevronRight className="h-5 w-5 text-[#1683ed]" />
            </button>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1683ed]">Today&apos;s Focus</p><h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Keep one promise to yourself.</h2></div><span className="text-xs font-semibold text-gray-500">1 / 3</span></div><div className="space-y-2"><button type="button" className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left dark:border-gray-700"><span className="h-5 w-5 rounded-full border-2 border-gray-400" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">45 min DSA Practice</span><span className="block text-xs text-gray-500">Supports: Crack SDE-2 Interview</span></span><Play className="h-5 w-5 rounded-full bg-blue-500 p-1 text-white" /></button><button type="button" className="flex w-full items-center gap-3 rounded-xl p-3 text-left"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle className="h-4 w-4" /></span><span className="text-sm font-semibold text-gray-400 line-through">Read 20 pages</span><ChevronRight className="ml-auto h-4 w-4 text-gray-400" /></button><button type="button" className="flex w-full items-center gap-3 rounded-xl p-3 text-left"><span className="h-5 w-5 rounded-full border-2 border-gray-400" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Go for a run</span><span className="block text-xs text-gray-500">Habit · Running</span></span><ChevronRight className="h-4 w-4 text-gray-400" /></button></div></div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-gray-900 dark:text-white">My Goals</h2><button type="button" onClick={() => handleTabChange('goals')} className="text-xs font-semibold text-[#4c99e6]">See all</button></div>
              <div className="space-y-3">{(goals || []).slice(0, 3).map((goal) => <button type="button" key={goal.id || goal._id} onClick={() => setSelectedGoal(goal)} className="flex w-full items-center gap-3 text-left"><span className="h-2.5 w-2.5 rounded-full bg-[#4c99e6]" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{goal.title}</span><span className="text-xs font-semibold text-gray-500">{Math.round(goal.progress?.percent || 0)}%</span></button>)}{(!goals || goals.length === 0) && <p className="text-sm text-gray-500">No active goals yet.</p>}</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-gray-900 dark:text-white">My Habits</h2><button type="button" onClick={() => handleTabChange('habits')} className="text-xs font-semibold text-[#4c99e6]">See all</button></div>
              <div className="space-y-3">{(habits || []).slice(0, 3).map((habit) => <button type="button" key={habit.id || habit._id} onClick={() => setSelectedHabit(habit)} className="flex w-full items-center gap-3 text-left"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{habit.name}</span><span className="text-xs font-semibold text-gray-500">{habit.totalDays || 0} days</span></button>)}{(!habits || habits.length === 0) && <p className="text-sm text-gray-500">No active habits yet.</p>}</div>
            </div>
          </motion.section>
        )}

        {/* Search Bar with Filters */}
        {false && activeTab === 'habits' && <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative flex flex-row items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c99e6] focus:border-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 font-manrope"
              />
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsGoalFilterSheetOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm"
              >
                <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-300">
                  {goalCategoryFilter === 'all' ? 'Filters' : goalCategoryFilter}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsSortDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                    >
                    {['newest', 'oldest'].map((sort) => (
                      <button
                        key={sort}
                        onClick={() => {
                          setGoalSort(sort)
                          setIsSortDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope ${
                          goalSort === sort
                            ? 'bg-blue-50 dark:bg-gray-700 text-[#4c99e6] font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {sort === 'newest' ? 'Newest' : 'Oldest'}
                      </button>
                    ))}
                  </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>}

        {/* Content Grid */}
        {activeTab !== 'overview' && <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {activeTab === 'goals' ? (
            <div className="goals-workspace space-y-4">
              <div className="grid h-[58px] grid-cols-[40px_1fr_40px] items-center gap-2 sm:flex sm:h-auto sm:justify-between">
                <button type="button" onClick={() => handleTabChange('overview')} aria-label="Back to home" className="rounded-lg p-2 text-[#0b1746] sm:hidden dark:text-white"><ChevronRight className="h-5 w-5 rotate-180"/></button>
                <div>
                  <h1 className="text-center text-lg font-bold tracking-tight text-[#0b1746] dark:text-white sm:text-left sm:text-2xl">My Goals</h1>
                  <p className="mt-1 hidden text-sm text-[#526392] sm:block">Turn your dreams into milestones. Track progress and celebrate every step.</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526392]" />
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search goals..." className="w-40 rounded-lg border border-[#dce5f4] bg-white py-2 pl-9 pr-3 text-xs text-[#0b1746] outline-none focus:border-[#1683ed] lg:w-48 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div className="relative hidden sm:block" data-goal-filter-dropdown>
                    <button type="button" aria-haspopup="listbox" aria-expanded={isFilterDropdownOpen === 'category'} onClick={() => { setIsFilterDropdownOpen(value => value === 'category' ? false : 'category'); setIsYearDropdownOpen(false) }} className="flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{goalCategoryFilter === 'all' ? 'Category' : goalCategoryFilter} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterDropdownOpen === 'category' ? 'rotate-180' : ''}`} /></button>
                    {isFilterDropdownOpen === 'category' && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 max-h-72 min-w-48 overflow-y-auto rounded-xl border border-[#dce5f4] bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">{['all', ...new Set((goals || []).map(goal => goal.category).filter(Boolean))].map(category => <button key={category} type="button" role="option" aria-selected={goalCategoryFilter === category} onClick={() => { setGoalCategoryFilter(category); setCurrentPage(1); setIsFilterDropdownOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${goalCategoryFilter === category ? 'bg-blue-50 font-semibold text-[#1683ed] dark:bg-blue-950/40' : 'text-[#253663] hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700'}`}>{category === 'all' ? 'All categories' : category}</button>)}</div>}
                  </div>
                  <div className="relative hidden sm:block" data-goal-filter-dropdown>
                    <button type="button" aria-haspopup="listbox" aria-expanded={isFilterDropdownOpen === 'status'} onClick={() => { setIsFilterDropdownOpen(value => value === 'status' ? false : 'status'); setIsYearDropdownOpen(false) }} className="flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{goalFilter === 'all' ? 'Status' : goalFilter === 'in-progress' ? 'On Track' : goalFilter === 'needs-attention' ? 'Needs Attention' : 'Completed'} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterDropdownOpen === 'status' ? 'rotate-180' : ''}`} /></button>
                    {isFilterDropdownOpen === 'status' && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-xl border border-[#dce5f4] bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">{[['all', 'All statuses'], ['in-progress', 'On Track'], ['needs-attention', 'Needs Attention'], ['completed', 'Completed']].map(([value, label]) => <button key={value} type="button" role="option" aria-selected={goalFilter === value} onClick={() => { setGoalFilter(value); setCurrentPage(1); setIsFilterDropdownOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${goalFilter === value ? 'bg-blue-50 font-semibold text-[#1683ed] dark:bg-blue-950/40' : 'text-[#253663] hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700'}`}>{label}</button>)}</div>}
                  </div>
                  <div className="relative hidden sm:block" data-goal-filter-dropdown>
                    <button type="button" aria-haspopup="listbox" aria-expanded={isYearDropdownOpen} onClick={() => { setIsYearDropdownOpen(value => !value); setIsFilterDropdownOpen(false) }} className="flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{selectedYear} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} /></button>
                    {isYearDropdownOpen && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 w-28 overflow-hidden rounded-xl border border-[#dce5f4] bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">{availableYears.map(year => <button key={year} type="button" role="option" aria-selected={selectedYear === year} onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${selectedYear === year ? 'bg-blue-50 font-semibold text-[#1683ed] dark:bg-blue-950/40' : 'text-[#253663] hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700'}`}>{year}</button>)}</div>}
                  </div>
                  <button type="button" onClick={() => setIsGoalIdeasOpen(true)} aria-label="Discover goal ideas" title="Discover goal ideas" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#dce5f4] bg-white text-[#526392] transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-[#1683ed] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-950/30 sm:inline-flex"><Compass className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setIsCreateModalOpen(true)} className="hidden items-center gap-1.5 rounded-lg bg-[#1683ed] px-3 py-2 text-xs font-semibold text-white shadow-sm sm:inline-flex sm:px-4"><Plus className="h-4 w-4" /><span>Create Goal</span></button>
                </div>
              </div>

              <div className="relative flex items-center justify-between gap-2 sm:hidden" data-goal-filter-dropdown>
                <button type="button" onClick={() => setIsYearDropdownOpen(value => !value)} className="flex items-center gap-2 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-sm font-bold text-[#0b1746] dark:border-gray-700 dark:bg-gray-800 dark:text-white">{selectedYear}<ChevronDown className="h-4 w-4"/></button>
                {isYearDropdownOpen && <div className="absolute left-0 top-full z-30 mt-1 w-28 overflow-hidden rounded-lg border border-[#dce5f4] bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">{availableYears.map(year => <button key={year} type="button" onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false) }} className="block w-full px-3 py-2 text-left text-sm">{year}</button>)}</div>}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsGoalIdeasOpen(true)} aria-label="Discover goal ideas" className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce5f4] bg-white text-[#526392] transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-[#1683ed] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"><Compass className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setIsCreateModalOpen(true)} aria-label="Create goal" className="grid h-9 w-9 place-items-center rounded-lg bg-[#1683ed] text-white shadow-sm"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#e5ecf6] dark:bg-gray-800 dark:ring-gray-700 sm:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-[#0b1746] dark:text-white">Yearly Goal Progress</span>
                  </div>
                  <span className="text-xl font-bold text-[#0b1746] dark:text-white">{goalSummary.percent}%</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-[#1683ed]" style={{ width: `${goalSummary.percent}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span><b className="text-gray-800 dark:text-gray-200">{goalSummary.completed}</b> completed</span>
                    <span><b className="text-gray-800 dark:text-gray-200">{goalSummary.active}</b> in progress</span>
                    <span><b className="text-gray-800 dark:text-gray-200">{goalSummary.overdue}</b> delayed</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:hidden">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526392]"/><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search goals..." className="w-full rounded-lg border border-[#dce5f4] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1683ed] dark:border-gray-700 dark:bg-gray-800"/></div>
                <button type="button" aria-label="Filter goals" onClick={() => setIsGoalFilterSheetOpen(true)} className="rounded-lg border border-[#dce5f4] bg-white p-2.5 text-[#526392] dark:border-gray-700 dark:bg-gray-800"><SlidersHorizontal className="h-5 w-5"/></button>
              </div>

              <div className={goalView === 'list' ? 'space-y-3' : goalView === 'timeline' ? 'relative space-y-4 border-l-2 border-blue-100 pl-5 dark:border-blue-950' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'}>
                {paginatedGoals.map((goal, index) => {
                  const status = getGoalStatus(goal)
                  const goalProgress = Math.min(100, Math.max(0, Number(goal.completedAt ? 100 : (goal.progress?.percent || 0))))
                  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null
                  const dueLabel = targetDate ? targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No target date'
                  const isOverdue = !goal.completedAt && targetDate && targetDate < new Date()
                  const goalId = goal.id || goal._id

                  return (
                    <motion.article
                      key={goalId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + 1) * 0.05 }}
                      onClick={() => setSelectedGoal(goal)}
                      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedGoal(goal) } }}
                      role="button"
                      tabIndex={0}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${goalView === 'list' ? 'sm:flex sm:items-center' : ''} ${goalView === 'timeline' ? 'before:absolute before:-left-[27px] before:top-7 before:h-3 before:w-3 before:rounded-full before:bg-[#1683ed] before:ring-4 before:ring-blue-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-start gap-3"><CategoryIcon category={goal.category} size="md" /><h3 className="min-w-0 flex-1 truncate pt-1 text-sm font-bold text-[#0b1746] dark:text-white sm:text-base">{goal.title}</h3><button type="button" aria-label={`Actions for ${goal.title}`} onClick={(event) => { event.stopPropagation(); setGoalActionMenu(goal) }} className="-mr-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><MoreVertical className="h-5 w-5" /></button></div>
                        <div className="mt-2 flex items-center justify-between"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span><span className="text-xs font-bold text-[#0b1746] dark:text-white">{goalProgress}%</span></div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e9eef5] dark:bg-gray-700"><div className={`h-full rounded-full ${status.state === 'STALLED' ? 'bg-rose-500' : status.state === 'SLIPPING' ? 'bg-amber-400' : status.state === 'COMPLETED' || status.state === 'STRONG' ? 'bg-emerald-500' : 'bg-[#1683ed]'}`} style={{ width: `${goalProgress}%` }}/></div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-500"><span className="truncate">{goal.healthReason || 'No progress yet'}</span><span className={isOverdue ? 'shrink-0 font-semibold text-rose-600 dark:text-rose-300' : 'shrink-0'}>{isOverdue ? `Overdue · ${dueLabel}` : dueLabel}</span></div>
                        {goal.completedAt && <div className="mt-4 flex gap-2"><button type="button" onClick={event => { event.stopPropagation(); setSelectedGoal({ ...goal, _openJourney: true }) }} className="min-h-[44px] flex-1 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-[#2369aa]">View Journey</button>{isRecentlyCompleted(goal) && <button type="button" onClick={event => { event.stopPropagation(); setGoalToShare(goal); setIsShareGoalModalOpen(true) }} className="min-h-[44px] flex-1 rounded-xl bg-[#4c99e6] px-3 py-2 text-xs font-bold text-white">Share</button>}</div>}
                      </div>
                    </motion.article>
                  )
                })}
                {!paginatedGoals.length && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-800"><Target className="mx-auto h-9 w-9 text-blue-300"/><h3 className="mt-3 font-bold text-gray-900 dark:text-white">No goals found</h3><p className="mt-1 text-sm text-gray-500">Adjust your filters or create a new goal.</p><button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-4 rounded-lg bg-[#1683ed] px-4 py-2 text-sm font-semibold text-white">Create Goal</button></div>}
              </div>
            </div>
          ) : (
            <>
            <HabitsWorkspace
              habits={habits || []}
              stats={dashboardStats || {}}
              selectedYear={selectedYear}
              availableYears={availableYears}
              onYearChange={setSelectedYear}
              onDiscover={() => setIsHabitIdeasOpen(true)}
              onCreate={(template) => {
                setInitialHabitData(template?.name ? { ...template, name: `${template.name} copy` } : null)
                setIsHabitModalOpen(true)
              }}
              onOpen={setSelectedHabit}
              onLog={setSelectedHabit}
              onEdit={(habit) => { setSelectedHabit(habit); setIsEditHabitOpen(true) }}
              onAnalytics={(habit) => setSelectedHabit({ ...habit, _openAnalytics: true })}
              onPause={async (habit) => {
                const id = habit.id || habit._id
                if (!id) return
                const res = await habitsAPI.archive(id, !habit.isArchived)
                if (res?.data?.success) await loadHabits({ page: 1, year: selectedYear, force: true })
              }}
              onDelete={(habit) => {
                setHabitDependencies([])
                setSkipHabitDependencyCheck(false)
                setHabitToDelete(habit)
                setIsHabitDeleteModalOpen(true)
              }}
            />
            <div className="hidden">
                {/* New Habit Card */}
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: filteredHabits.length * 0.05 }}
                    onClick={() => setIsHabitModalOpen(true)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px]"
                  >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Plus className="w-8 h-8 text-[#4c99e6]" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-base sm:text-lg mb-2">
                      New Habit
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-manrope text-center">
                      Expand your routine. Build a new habit cycle.
                    </p>
                  </motion.div>
                  {filteredHabits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedHabit(habit)}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group relative min-h-[180px] sm:min-h-[220px]"
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedHabit(habit)
                            setIsEditHabitOpen(true)
                          }}
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setHabitDependencies([])
                            setSkipHabitDependencyCheck(false)
                            setHabitToDelete(habit)
                            setIsHabitDeleteModalOpen(true)
                          }}
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300 hover:text-red-500" />
                        </button>
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-base mb-3 pr-16">
                        {habit.name}
                      </h3>

                      {habit.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 font-manrope leading-relaxed">
                          {habit.description}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-4">
                        {habit.todayStatus === 'done' && Number(habit.todayCompletionCount || 0) >= Math.max(1, Number(habit.dailyTargetCount || 1)) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-md font-manrope uppercase tracking-wide">
                            <CheckCircle className="w-3 h-3" />
                            Done
                          </span>
                        ) : habit.todayStatus === 'skipped' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 text-xs font-semibold rounded-md font-manrope uppercase tracking-wide">
                            <MinusCircle className="w-3 h-3" />
                            Skipped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#4c99e6] text-xs font-medium rounded-md font-manrope uppercase tracking-wide">
                            <Clock className="w-3 h-3" />
                            {habit.todayStatus === 'partial' ? `${habit.todayCompletionCount || 0}/${habit.dailyTargetCount || 1}` : 'Pending'}
                          </span>
                        )}
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-md font-manrope uppercase tracking-wide">
                          {habit.frequency || 'Daily'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-[#4c99e6] font-manrope font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {habit.totalCompletions || 0} Completions
                          </span>
                        </div>
                        <div className="text-xs text-[#4c99e6] font-manrope font-medium">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {habit.totalDays || 0} Days Active
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
            </div>
            </>
          )}
        </motion.div>}

        {/* Pagination Dots */}
        {activeTab === 'goals' && filteredGoals.length > itemsPerPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mt-8"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentPage === i + 1
                    ? 'bg-[#4c99e6] w-8'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </motion.div>
        )}

        {/* Inspirational Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 font-manrope italic text-xs sm:text-sm px-4">
            "{randomQuote}"
          </p>
        </motion.div>
      </div>

      {/* Modals */}
      <Suspense fallback={(
        <div className="fixed inset-0 z-[210] pointer-events-none flex items-center justify-center">
          <div className="px-3 py-2 rounded-lg bg-black/55 text-white text-xs font-medium">Opening...</div>
        </div>
      )}>
        {isCreateModalOpen && (
          <CreateGoalWizard
            isOpen={isCreateModalOpen}
            onClose={() => { setIsCreateModalOpen(false); setInitialGoalData(null) }}
            year={selectedYear}
            initialData={initialGoalData}
          />
        )}

        {isHabitModalOpen && (
          <CreateHabitModal
            isOpen={isHabitModalOpen}
            onClose={() => { setIsHabitModalOpen(false); setInitialHabitData(null) }}
            onCreated={handleHabitCreated}
            initialData={initialHabitData}
            year={selectedYear}
          />
        )}

        {selectedGoal && (
          <GoalDetailsModal
            goal={selectedGoal}
            isOpen={!!selectedGoal}
            initialView={selectedGoal?._openJourney ? 'journey' : selectedGoal?._openAnalytics ? 'analytics' : 'overview'}
            onClose={() => setSelectedGoal(null)}
            onViewPost={(goalId) => {
              setSelectedGoal(null);
              setOpenGoalPostId(goalId);
            }}
          />
        )}

        {openGoalPostId && (
          <GoalPostModal
            goalId={openGoalPostId}
            isOpen={!!openGoalPostId}
            onClose={() => setOpenGoalPostId(null)}
            openWithComments={false}
          />
        )}

        {selectedHabit && (
          <HabitDetailModal
            habit={selectedHabit}
            isOpen={!!selectedHabit && !isEditHabitOpen}
            initialView={selectedHabit?._openAnalytics ? 'analytics' : 'overview'}
            onClose={() => setSelectedHabit(null)}
            onLog={handleHabitLog}
            onPause={async () => {
              const habitId = selectedHabit.id || selectedHabit._id
              if (!habitId) return
              const res = await habitsAPI.archive(habitId, !selectedHabit.isArchived)
              if (res?.data?.success) {
                await loadHabits({ page: 1, year: selectedYear, force: true })
                setSelectedHabit(prev => prev ? { ...prev, isArchived: !prev.isArchived } : prev)
              }
            }}
            onHabitStatsChanged={async () => {
              await Promise.all([
                getDashboardStats({ force: true, year: selectedYear }),
                loadHabits({ page: 1, year: selectedYear, force: true })
              ])
              const refreshed = useApiStore.getState().habits.find(habit => String(habit.id || habit._id) === String(selectedHabit.id || selectedHabit._id))
              if (refreshed) setSelectedHabit(refreshed)
            }}
            onEdit={() => setIsEditHabitOpen(true)}
            onDelete={() => {
              setHabitDependencies([])
              setSkipHabitDependencyCheck(false)
              setHabitToDelete(selectedHabit)
              setIsHabitDeleteModalOpen(true)
            }}
          />
        )}

        {isEditHabitOpen && selectedHabit && (
          <EditHabitModal
            isOpen={isEditHabitOpen}
            onClose={() => { setIsEditHabitOpen(false); setSelectedHabit(null) }}
            habit={selectedHabit}
            onSave={async (payload) => {
              const habitId = selectedHabit.id || selectedHabit._id
              if (!habitId) return
              const res = await useApiStore.getState().updateHabit(habitId, payload)
              if (!res?.success) return
              await Promise.all([
                loadHabits({ page: 1, year: selectedYear, force: true }),
                getDashboardStats({ force: true, year: selectedYear }),
                getDashboardYears()
              ])
              setIsEditHabitOpen(false)
              setSelectedHabit(null)
            }}
          />
        )}

        {isHabitWarningModalOpen && habitToDelete && (
          <DependencyWarningModal
            isOpen={isHabitWarningModalOpen}
            onClose={() => { setIsHabitWarningModalOpen(false); setHabitToDelete(null); setHabitDependencies([]); setSkipHabitDependencyCheck(false) }}
            onContinue={() => {
              setIsHabitWarningModalOpen(false)
              setSkipHabitDependencyCheck(true)
              setIsHabitDeleteModalOpen(true)
            }}
            itemTitle={habitToDelete.name}
            parentGoals={habitDependencies}
            itemType="habit"
          />
        )}

        {isHabitDeleteModalOpen && habitToDelete && (
          <DeleteConfirmModal
            isOpen={isHabitDeleteModalOpen}
            onClose={() => { setIsHabitDeleteModalOpen(false); setHabitToDelete(null); setHabitDependencies([]); setSkipHabitDependencyCheck(false) }}
            onConfirm={async () => {
              setIsDeletingHabit(true)
              try {
                if (!skipHabitDependencyCheck) {
                  const checkHabitDependencies = useApiStore.getState().checkHabitDependencies
                  const depResult = await checkHabitDependencies?.(habitToDelete.id)
                  if (depResult?.success && depResult?.data?.data?.linkedGoals?.length > 0) {
                    setHabitDependencies(depResult.data.data.linkedGoals)
                    setIsHabitDeleteModalOpen(false)
                    setIsHabitWarningModalOpen(true)
                    return
                  }
                }

                const res = await useApiStore.getState().deleteHabit(habitToDelete.id)
                if (res?.success) {
                  setIsHabitDeleteModalOpen(false)
                  setHabitToDelete(null)
                  setHabitDependencies([])
                  if (selectedHabit?.id === habitToDelete.id) setSelectedHabit(null)
                  loadHabits({ page: 1, year: selectedYear })
                  getDashboardStats({ force: true, year: selectedYear })
                }
              } finally {
                setIsDeletingHabit(false)
                setSkipHabitDependencyCheck(false)
              }
            }}
            goalTitle={habitToDelete.name}
            isDeleting={isDeletingHabit}
            itemType="habit"
          />
        )}

        {isHabitIdeasOpen && (
          <HabitSuggestionsModal
            isOpen={isHabitIdeasOpen}
            onClose={() => setIsHabitIdeasOpen(false)}
            interests={user?.interests || []}
            onSelect={openPrefilledHabitModal}
            onCreate={() => openPrefilledHabitModal(null)}
            limit={6}
            title="Habit Suggestions"
          />
        )}
        {isGoalIdeasOpen && (
          <GoalSuggestionsModal
            isOpen={isGoalIdeasOpen}
            onClose={() => setIsGoalIdeasOpen(false)}
            interests={user?.interests || []}
            onSelect={openPrefilledGoalModal}
            onCreate={() => { setIsGoalIdeasOpen(false); setInitialGoalData(null); setIsCreateModalOpen(true); }}
            limit={6}
            title="Goal Suggestions"
          />
        )}

        {isGoalFilterSheetOpen && activeTab === 'goals' && (
          <div className="fixed inset-0 z-[205] flex items-end justify-center sm:hidden">
            <button type="button" aria-label="Close goal filters" onClick={() => setIsGoalFilterSheetOpen(false)} className="absolute inset-0 bg-black/40" />
            <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1683ed]">Filter goals</p><h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Find where to focus</h2></div><button type="button" onClick={() => setIsGoalFilterSheetOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">×</button></div>
              <p className="mb-2 text-xs font-semibold text-gray-500">Status</p>
              <div className="mb-5 flex flex-wrap gap-2">{[['all', 'All'], ['in-progress', 'On Track'], ['needs-attention', 'Needs Attention'], ['completed', 'Completed']].map(([value, label]) => <button key={value} type="button" onClick={() => setGoalFilter(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${goalFilter === value ? 'border-[#1683ed] bg-blue-50 text-[#1683ed]' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>{label}</button>)}</div>
              <p className="mb-2 text-xs font-semibold text-gray-500">Category</p>
              <div className="flex flex-wrap gap-2">{['all', ...new Set((goals || []).map(goal => goal.category).filter(Boolean))].map(category => <button key={category} type="button" onClick={() => setGoalCategoryFilter(category)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${goalCategoryFilter === category ? 'border-[#1683ed] bg-blue-50 text-[#1683ed]' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>{category === 'all' ? 'All' : category}</button>)}</div>
              <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => { setGoalFilter('all'); setGoalCategoryFilter('all'); setCurrentPage(1) }} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">Clear</button><button type="button" onClick={() => { setCurrentPage(1); setIsGoalFilterSheetOpen(false) }} className="rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white">Apply</button></div>
            </div>
          </div>
        )}

        {goalActionMenu && (
          <div className="fixed inset-0 z-[206] flex items-end justify-center sm:items-center sm:p-4">
            <button type="button" aria-label="Close goal actions" onClick={() => setGoalActionMenu(null)} className="absolute inset-0 bg-black/40" />
            <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
              <div className="mb-4 flex items-center gap-3"><CategoryIcon category={goalActionMenu.category} size="lg" /><div className="min-w-0"><h2 className="truncate text-base font-bold text-gray-900 dark:text-white">{goalActionMenu.title}</h2><p className="text-xs text-gray-500">Quick actions for this goal</p></div></div>
              <div className="space-y-1">
                {!goalActionMenu.completedAt && <button type="button" onClick={() => { setSelectedGoal(goalActionMenu); setGoalActionMenu(null) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-800"><Target className="h-4 w-4 text-[#1683ed]" /> Log Progress</button>}
                <button type="button" onClick={() => { setGoalToEdit(goalActionMenu); setGoalActionMenu(null); goalActionMenu.completedAt ? setIsEditCompletionModalOpen(true) : setIsEditGoalWizardOpen(true) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-800"><Edit className="h-4 w-4 text-[#1683ed]" /> Edit Goal</button>
                <button type="button" onClick={() => {
                  const copiedTargetDate = goalActionMenu.targetDate || goalActionMenu.target_date || ''
                  setInitialGoalData({
                    title: `${goalActionMenu.title} copy`,
                    description: goalActionMenu.description || '',
                    category: goalActionMenu.category,
                    targetDate: copiedTargetDate && new Date(copiedTargetDate) > new Date() ? copiedTargetDate : '',
                    isPublic: goalActionMenu.isPublic,
                    subGoals: (goalActionMenu.subGoals || []).map(({ id, _id, completed, completedAt, ...subGoal }) => ({ ...subGoal, completed: false }))
                  })
                  setIsCreateModalOpen(true)
                  setGoalActionMenu(null)
                }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-800"><Copy className="h-4 w-4 text-[#1683ed]" /> Duplicate Goal</button>
                <button type="button" onClick={() => { setSelectedGoal({ ...goalActionMenu, _openAnalytics: true }); setGoalActionMenu(null) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-800"><BarChart3 className="h-4 w-4 text-[#1683ed]" /> View Analytics</button>
                {(!goalActionMenu.completedAt || isRecentlyCompleted(goalActionMenu)) && <button type="button" onClick={() => { setGoalToShare(goalActionMenu); setIsShareGoalModalOpen(true); setGoalActionMenu(null) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-800"><Share2 className="h-4 w-4 text-[#4c99e6]" /> Share Goal</button>}
                <button type="button" onClick={() => { setGoalToDelete(goalActionMenu); setGoalActionMenu(null); setIsGoalDeleteModalOpen(true) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /> Delete Goal</button>
              </div>
              <button type="button" onClick={() => setGoalActionMenu(null)} className="mt-4 w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {/* Delete Goal Confirm Modal */}
        {isGoalDeleteModalOpen && goalToDelete && (
          <DeleteConfirmModal
            isOpen={isGoalDeleteModalOpen}
            onClose={() => { setIsGoalDeleteModalOpen(false); setGoalToDelete(null) }}
            onConfirm={async () => {
              setIsDeletingGoal(true)
              try {
                const res = await useApiStore.getState().deleteGoal(goalToDelete.id)
                if (res?.success) {
                  setIsGoalDeleteModalOpen(false)
                  setGoalToDelete(null)
                  if (selectedGoal?.id === goalToDelete.id) setSelectedGoal(null)
                  getGoals({ year: selectedYear, page: currentPage })
                }
              } finally {
                setIsDeletingGoal(false)
              }
            }}
            goalTitle={goalToDelete.title}
            isDeleting={isDeletingGoal}
            itemType="goal"
          />
        )}

        {/* Edit Goal Wizard Modal */}
        {isEditGoalWizardOpen && goalToEdit && (
          <CreateGoalWizard
            isOpen={isEditGoalWizardOpen}
            onClose={() => {
              setIsEditGoalWizardOpen(false)
              setGoalToEdit(null)
            }}
            onSaved={async () => {
              await Promise.all([
                getGoals({ year: selectedYear, page: currentPage }, { force: true }),
                getDashboardStats({ force: true, year: selectedYear })
              ])
            }}
            year={goalToEdit.year}
            editMode={true}
            goalId={goalToEdit.id}
            initialData={{
              title: goalToEdit.title,
              description: goalToEdit.description,
              category: goalToEdit.category,
              targetDate: goalToEdit.targetDate || goalToEdit.target_date || '',
              isPublic: goalToEdit.isPublic,
              subGoals: goalToEdit.subGoals || [],
              habitLinks: goalToEdit.habitLinks || []
            }}
          />
        )}

        {/* Edit Completion Modal */}
        {isEditCompletionModalOpen && goalToEdit && (
          <CompletionModal
            isOpen={isEditCompletionModalOpen}
            onClose={() => {
              setIsEditCompletionModalOpen(false)
              setGoalToEdit(null)
            }}
            onComplete={async (formData) => {
              try {
                const result = await useApiStore.getState().updateGoalCompletion(goalToEdit.id, formData)
                if (result?.success) {
                  await Promise.all([
                    getGoals({ year: selectedYear, page: currentPage, force: true }),
                    getDashboardStats({ force: true, year: selectedYear })
                  ])
                  setIsEditCompletionModalOpen(false)
                  setGoalToEdit(null)
                }
                return result
              } catch (err) {
                return { success: false }
              }
            }}
            goalTitle={goalToEdit.title}
            goal={goalToEdit}
            isEditMode={true}
            existingData={{
              completionNote: goalToEdit.completionNote || '',
              completionAttachmentUrl: goalToEdit.completionAttachmentUrl || '',
              completionFeeling: goalToEdit.completionFeeling || 'neutral',
              completedAt: goalToEdit.completedAt
            }}
          />
        )}

        {/* Share Goal Modal */}
        {isShareGoalModalOpen && goalToShare && (
          <Suspense fallback={null}>
            <ShareModal
              isOpen={isShareGoalModalOpen}
              onClose={() => {
                setIsShareGoalModalOpen(false)
                setGoalToShare(null)
              }}
              goal={goalToShare}
              user={user}
            />
          </Suspense>
        )}

        {/* What's New Modal */}
        {isWhatsNewModalOpen && (
          <WhatsNewModal
            isOpen={isWhatsNewModalOpen}
            onClose={() => setIsWhatsNewModalOpen(false)}
          />
        )}
        {metricInfo && <MetricInfoModal metric={metricInfo} onClose={() => setMetricInfo(null)} />}
        <DailyLogsPromptModal
          isOpen={isDailyLogOpen}
          onClose={() => setIsDailyLogOpen(false)}
          onSubmitted={() => {
            setIsDailyLogOpen(false)
            getDashboardStats({ force: true, year: selectedYear })
          }}
        />
      </Suspense>

    </div>
  )
}

export default DashboardPageNew
