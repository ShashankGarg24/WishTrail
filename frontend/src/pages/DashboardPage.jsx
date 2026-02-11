import { GOAL_CATEGORIES } from '../constants/goalCategories'
import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CategoryBadge from '../components/CategoryBadge'
import { getCategoryIcon } from '../utils/categoryIcons'
import { Plus, Target, CheckCircle, TrendingUp, Calendar, ChevronDown, Search, Flag, Clock, Eye, Edit, Share2, Filter, ArrowUpDown } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { useSearchParams } from 'react-router-dom'

const CreateGoalWizard = lazy(() => import('../components/CreateGoalWizard'))
const GoalPostModal = lazy(() => import('../components/GoalPostModal'))
const GoalPostModalNew = lazy(() => import('../components/GoalPostModalNew'))
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'))
const HabitDetailModal = lazy(() => import('../components/HabitDetailModal'))
const CreateHabitModal = lazy(() => import('../components/CreateHabitModal'))
const EditHabitModal = lazy(() => import('../components/EditHabitModal'))
const DeleteConfirmModal = lazy(() => import('../components/DeleteConfirmModal'))
const HabitSuggestionsModal = lazy(() => import('../components/HabitSuggestionsModal'))
const GoalSuggestionsModal = lazy(() => import('../components/GoalSuggestionsModal'))
const DependencyWarningModal = lazy(() => import('../components/DependencyWarningModal'))

const DashboardPageNew = () => {
  const [activeTab, setActiveTab] = useState('goals')
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
  const [isHabitIdeasOpen, setIsHabitIdeasOpen] = useState(false)
  const [isGoalIdeasOpen, setIsGoalIdeasOpen] = useState(false)
  const [initialHabitData, setInitialHabitData] = useState(null)
  const [initialGoalData, setInitialGoalData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)
  const [goalFilter, setGoalFilter] = useState('all') // all, completed, in-progress
  const [goalSort, setGoalSort] = useState('newest') // newest, oldest
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9 // 3x3 grid

  const {
    isAuthenticated,
    user,
    goals,
    habits,
    dashboardStats,
    getDashboardStats,
    getGoals,
    loadHabits,
  } = useApiStore()

  const handleHabitCreated = (habit) => {
    if (habit?.id) {
      useApiStore.getState().appendHabit?.(habit)
    }
    loadHabits({ page: 1 })
  }

  const handleHabitLog = async (status, mood = 'neutral') => {
    if (!selectedHabit) return
    try {
      const res = await useApiStore.getState().logHabit(selectedHabit.id, status, mood)
      if (res?.success) {
        setSelectedHabit((prev) =>
          prev
            ? {
                ...prev,
                currentStreak: status === 'done' ? (prev.currentStreak || 0) + 1 : 0,
                totalCompletions: status === 'done' ? (prev.totalCompletions || 0) + 1 : prev.totalCompletions,
              }
            : prev
        )
        window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: status === 'done' ? 'Habit completed!' : 'Habit updated', type: 'success' } }))
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: e?.message || 'Failed to log', type: 'error' } }))
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
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return
    getDashboardStats()
    getGoals({ year: selectedYear, page: 1 })
    loadHabits({ page: 1 })
  }, [isAuthenticated, selectedYear])

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'goals'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (tab) => {
    setSearchParams({ tab })
    setActiveTab(tab)
  }

  // Calculate yearly progress
  const yearlyProgress = useMemo(() => {
    if (!goals || goals.length === 0) return 0
    const completedGoals = goals.filter(g => g?.completedAt).length
    return Math.round((completedGoals / goals.length) * 100)
  }, [goals])

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
      filtered = filtered.filter(g => !g.completedAt)
    }
    
    // Apply sort
    if (goalSort === 'newest') {
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (goalSort === 'oldest') {
      filtered = [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }
    
    return filtered
  }, [goals, searchQuery, goalFilter, goalSort])

  // Paginated goals
  const paginatedGoals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredGoals.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredGoals, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredGoals.length / itemsPerPage)

  const filteredHabits = useMemo(() => {
    if (!searchQuery) return habits || []
    return (habits || []).filter(h =>
      h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [habits, searchQuery])

  // Available years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear - 1, currentYear, currentYear + 1]
  }, [])

  // Inspirational quotes
  const quotes = [
    "Success is a sequence of deliberate actions, executed with consistency.",
    "Precision in every step. Your milestones are progressing steadily.",
    "Excellence is not an act, but a habit formed through daily actions."
  ]
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

  const handleShare = (goal, e) => {
    e.stopPropagation()
    // Share functionality
    if (navigator.share) {
      navigator.share({
        title: goal.title,
        text: goal.description,
        url: window.location.href
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between gap-8"
        >
          <div className="flex items-center h-full">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 font-manrope">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}.
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-manrope">
                {activeTab === 'goals' 
                  ? `Precision in every step. Your ${selectedYear} milestones are progressing steadily.`
                  : 'Precision in every step. Your consistency is your competitive edge.'}
              </p>
            </div>
          </div>
          
          {/* Yearly Pulse / Habit Consistency - Top Right */}
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-5 bg-white dark:bg-gray-800 rounded-xl px-8 py-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide mb-2">
                  {activeTab === 'goals' ? 'Yearly Pulse' : 'Habit Consistency'}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-300 font-manrope">
                  {activeTab === 'goals' 
                    ? `${dashboardStats?.completedGoals || 2} of ${dashboardStats?.totalGoals || 4} targets hit`
                    : 'Strong momentum this week'}
                </div>
              </div>
              <div className="relative w-24 h-24">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-100 dark:text-gray-700"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="#4c99e6"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - (activeTab === 'goals' ? yearlyProgress : 85) / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white font-manrope">
                    {activeTab === 'goals' ? yearlyProgress : 85}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs and Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700"
        >
          {/* Tabs */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => handleTabChange('goals')}
              className={`relative pb-2 font-medium font-manrope transition-colors ${
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
              className={`relative pb-2 font-medium font-manrope transition-colors ${
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
          <div className="flex items-center gap-3">
            {/* Year Selector - Only for Goals */}
            {activeTab === 'goals' && (
              <div className="relative">
                <button
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm"
                >
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedYear} Fiscal
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                <AnimatePresence>
                  {isYearDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
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
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={() => activeTab === 'goals' ? setIsCreateModalOpen(true) : setIsHabitModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'goals' ? 'Add Goal' : 'Add Habit'}
            </button>

            {/* Discover Button */}
            <button
              onClick={() => activeTab === 'goals' ? setIsGoalIdeasOpen(true) : setIsHabitIdeasOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-sm"
            >
              <Target className="w-4 h-4" />
              {activeTab === 'goals' ? 'Discover Goals' : 'Discover Habits'}
            </button>
          </div>
        </motion.div>

        {/* Stats Grid - 4 cards in single row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {activeTab === 'goals' ? (
            <>
              {/* Total Goals */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Target className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.totalGoals || 4}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Total Goals
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.completedGoals || 2}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Completed
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.inProgressGoals || 2}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  In Progress
                </div>
              </div>

              {/* Daily Tasks */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {dashboardStats?.todayCompletions || 0}/3
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Daily Tasks
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Total Habits */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  {habits?.length || 12}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Total Habits
                </div>
              </div>

              {/* Total Streak */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Flag className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  8
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Total Streak
                </div>
              </div>

              {/* Best Streak */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  24
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Best Streak
                </div>
              </div>

              {/* Consistency % */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Target className="w-5 h-5 text-[#4c99e6]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-manrope">
                  92%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Consistency %
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Search Bar with Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter milestones by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c99e6] focus:border-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 font-manrope"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm"
              >
                <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {goalFilter === 'all' ? 'All Assets' : goalFilter === 'completed' ? 'Completed' : 'In Progress'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    {['all', 'completed', 'in-progress'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setGoalFilter(filter)
                          setIsFilterDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope ${
                          goalFilter === filter
                            ? 'bg-blue-50 dark:bg-gray-700 text-[#4c99e6] font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {filter === 'all' ? 'All Assets' : filter === 'completed' ? 'Completed' : 'In Progress'}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-manrope text-sm"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
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
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {activeTab === 'goals' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* New Milestone Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <Plus className="w-8 h-8 text-[#4c99e6]" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-2">
                  New Milestone
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope text-center">
                  Expand your roadmap. Define a new goal.
                </p>
              </motion.div>

              {/* Goal Cards */}
              {paginatedGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 1) * 0.05 }}
                  onClick={() => setSelectedGoal(goal)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group relative cursor-pointer"
                >
                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedGoal(goal)
                      }}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Analytics"
                    >
                      <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={(e) => handleShare(goal, e)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors flex-shrink-0">
                        <div className="text-gray-500 dark:text-gray-400 group-hover:text-[#4c99e6] transition-colors">
                          {getCategoryIcon(goal.category, 'w-5 h-5')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-24">
                        <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-base mb-2">
                          {goal.title}
                        </h3>
                        <CategoryBadge category={goal.category} />
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 font-manrope leading-relaxed">
                        {goal.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {goal.priority && (
                          <span className="flex items-center gap-1 font-manrope">
                            <span className="w-2 h-2 rounded-full bg-[#4c99e6]"></span>
                            {goal.priority}
                          </span>
                        )}
                        {goal.duration && (
                          <span className="font-manrope">
                            {goal.duration}d
                          </span>
                        )}
                      </div>
                      {goal.completedAt && (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* New Habit Card */}
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: filteredHabits.length * 0.05 }}
                    onClick={() => setIsHabitModalOpen(true)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[220px]"
                  >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Plus className="w-8 h-8 text-[#4c99e6]" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-2">
                      New Habit
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope text-center">
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
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group relative min-h-[220px]"
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedHabit(habit)
                          }}
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors flex-shrink-0">
                          <Target className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-[#4c99e6] transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-base mb-3">
                            {habit.title}
                          </h3>
                        </div>
                      </div>

                      {habit.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 font-manrope leading-relaxed">
                          {habit.description}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#4c99e6] text-xs font-medium rounded-md font-manrope uppercase tracking-wide">
                          <Clock className="w-3 h-3" />
                          Today
                        </span>
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-md font-manrope uppercase tracking-wide">
                          {habit.frequency || 'Daily'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-[#4c99e6] font-manrope font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {habit.currentStreak || 3}/{habit.goal || 10} Completions
                          </span>
                        </div>
                        <div className="text-xs text-[#4c99e6] font-manrope font-medium">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {habit.longestStreak || 14} Days Active
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
            </div>
          )}
        </motion.div>

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
          <p className="text-gray-500 dark:text-gray-400 font-manrope italic text-sm">
            "{randomQuote}"
          </p>
        </motion.div>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
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
          />
        )}

        {openGoalId && (
          <GoalPostModal
            goalId={openGoalId}
            isOpen={!!openGoalId}
            onClose={() => setOpenGoalId(null)}
          />
        )}

        {selectedGoal && (
          <GoalDetailsModal
            goal={selectedGoal}
            isOpen={!!selectedGoal}
            onClose={() => setSelectedGoal(null)}
            onViewPost={(goalId) => {
              setSelectedGoal(null);
              setOpenGoalPostId(goalId);
            }}
          />
        )}

        {openGoalPostId && (
          <GoalPostModalNew
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
            onClose={() => setSelectedHabit(null)}
            onLog={handleHabitLog}
            onEdit={() => setIsEditHabitOpen(true)}
            onDelete={async () => {
              const checkHabitDependencies = useApiStore.getState().checkHabitDependencies
              const depResult = await checkHabitDependencies?.(selectedHabit.id)
              if (depResult?.success && depResult?.data?.data?.linkedGoals?.length > 0) {
                setHabitDependencies(depResult.data.data.linkedGoals)
                setHabitToDelete(selectedHabit)
                setIsHabitWarningModalOpen(true)
              } else {
                setHabitToDelete(selectedHabit)
                setIsHabitDeleteModalOpen(true)
              }
            }}
          />
        )}

        {isEditHabitOpen && selectedHabit && (
          <EditHabitModal
            isOpen={isEditHabitOpen}
            onClose={() => { setIsEditHabitOpen(false); setSelectedHabit(null) }}
            habit={selectedHabit}
            onSave={async (payload) => {
              await useApiStore.getState().updateHabit(selectedHabit.id, payload)
              loadHabits({ page: 1 })
              setIsEditHabitOpen(false)
              setSelectedHabit(null)
            }}
          />
        )}

        {isHabitWarningModalOpen && habitToDelete && (
          <DependencyWarningModal
            isOpen={isHabitWarningModalOpen}
            onClose={() => { setIsHabitWarningModalOpen(false); setHabitToDelete(null); setHabitDependencies([]) }}
            onContinue={() => {
              setIsHabitWarningModalOpen(false)
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
            onClose={() => { setIsHabitDeleteModalOpen(false); setHabitToDelete(null); setHabitDependencies([]) }}
            onConfirm={async () => {
              setIsDeletingHabit(true)
              try {
                const res = await useApiStore.getState().deleteHabit(habitToDelete.id)
                if (res?.success) {
                  setIsHabitDeleteModalOpen(false)
                  setHabitToDelete(null)
                  setHabitDependencies([])
                  if (selectedHabit?.id === habitToDelete.id) setSelectedHabit(null)
                  loadHabits({ page: 1 })
                }
              } finally {
                setIsDeletingHabit(false)
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
      </Suspense>
    </div>
  )
}

export default DashboardPageNew
