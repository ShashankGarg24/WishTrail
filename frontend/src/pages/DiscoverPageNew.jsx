import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Target, Search, UserPlus, Rocket, TrendingUp, Globe, BookOpen, Dumbbell, Heart, Briefcase, GraduationCap, Plane, Palette, DollarSign, Lightbulb } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { useSearchParams } from 'react-router-dom'

const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'))

const DiscoverPageNew = () => {
  const [activeTab, setActiveTab] = useState('goals')
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [users, setUsers] = useState([])
  const [trendingGoals, setTrendingGoals] = useState([])
  const [openGoalId, setOpenGoalId] = useState(null)

  const {
    isAuthenticated,
    user,
    followUser,
    unfollowUser,
    getTrendingGoals,
    getUsers,
  } = useApiStore()

  // Category options
  const categories = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'career', label: 'Career', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'hobbies', label: 'Hobbies', icon: Palette },
    { id: 'finance', label: 'Finance', icon: DollarSign },
  ]

  // Mock trending goals data
  const mockTrendingGoals = [
    {
      id: 1,
      icon: Dumbbell,
      category: 'FITNESS',
      title: 'Marathon Preparations',
      description: 'A structured training program to go from 0 to 42km in 6 months with recovery focuses',
      categoryColor: 'blue'
    },
    {
      id: 2,
      icon: Lightbulb,
      category: 'MINDSET',
      title: 'Digital Detox Routine',
      description: 'Decrease screen time by 40% and reclaim 2 hours of daily productivity through focus blocks.',
      categoryColor: 'purple'
    },
    {
      id: 3,
      icon: DollarSign,
      category: 'FINANCE',
      title: 'Emergency Fund Builder',
      description: 'Systematically save 3-6 months of expenses using the 50/30/20 budgeting framework.',
      categoryColor: 'green'
    },
    {
      id: 4,
      icon: Globe,
      category: 'EDUCATION',
      title: 'Speak Basic Spanish',
      description: 'Master common conversational phrases and essential grammar for your next travel adventure.',
      categoryColor: 'orange'
    },
    {
      id: 5,
      icon: Heart,
      category: 'HEALTH',
      title: 'Meatless Weekdays',
      description: 'A transition guide to plant-based eating for health and environmental sustainability.',
      categoryColor: 'teal'
    }
  ]

  // Mock users data
  const mockUsers = [
    {
      id: 1,
      name: 'Jordan Smith',
      username: '@smith_growth',
      avatar: null,
      stats: { goals: 12, done: 45, streak: 18 },
      following: false
    },
    {
      id: 2,
      name: 'Elena Vance',
      username: '@evance_design',
      avatar: null,
      stats: { goals: 8, done: 102, streak: 34 },
      following: false
    },
    {
      id: 3,
      name: 'Marcus Chen',
      username: '@chen_visua',
      avatar: null,
      stats: { goals: 15, done: 28, streak: 12 },
      following: false
    },
    {
      id: 4,
      name: 'Sarah Jenkins',
      username: '@_jenky',
      avatar: null,
      stats: { goals: 5, done: 14, streak: 7 },
      following: false
    }
  ]

  const topAchievers = [
    { id: 1, name: 'David Miller', username: '@davidm' },
    { id: 2, name: 'Lisa Ray', username: '@lisaray' }
  ]

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

  // Load data
  useEffect(() => {
    if (!isAuthenticated) return
    if (activeTab === 'goals') {
      // Load trending goals
      setTrendingGoals(mockTrendingGoals)
    } else {
      // Load users
      setUsers(mockUsers)
    }
  }, [activeTab, isAuthenticated])

  const handleFollow = async (userId) => {
    const result = await followUser(userId)
    if (result.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, following: true } : u))
    }
  }

  const handleUnfollow = async (userId) => {
    const result = await unfollowUser(userId)
    if (result.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, following: false } : u))
    }
  }

  const quotes = [
    "Success is a sequence of deliberate actions, executed with consistency.",
    "Community is the engine of sustained progress."
  ]
  const randomQuote = quotes[activeTab === 'goals' ? 0 : 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 font-manrope">
            {activeTab === 'goals' ? 'Discover' : 'Find Your Tribe'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-manrope">
            {activeTab === 'goals' 
              ? 'Find inspiration for your next milestone.'
              : 'Connect with high-achievers, share milestones, and find the community support you need to reach your peak performance.'}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <button
            onClick={() => handleTabChange('goals')}
            className={`px-6 py-2.5 rounded-lg font-medium font-manrope transition-all ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => handleTabChange('people')}
            className={`px-6 py-2.5 rounded-lg font-medium font-manrope transition-all ${
              activeTab === 'people'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            People
          </button>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'goals' 
                ? 'Search goals by title, keyword, or category...'
                : 'Search creators, mentors, or accountability partners...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4c99e6] focus:border-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 font-manrope shadow-sm"
            />
          </div>
        </motion.div>

        {/* Category Pills - Only for Goals */}
        {activeTab === 'goals' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 overflow-x-auto pb-2 mb-8 scrollbar-hide"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium font-manrope text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-[#4c99e6] text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {category.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {activeTab === 'goals' ? (
            <>
              {/* Trending Goals Section */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 font-manrope">
                  Trending Goals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingGoals.map((goal, index) => {
                    const IconComponent = goal.icon
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => setOpenGoalId(goal.id)}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                            <IconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-[#4c99e6] transition-colors" />
                          </div>
                          <div className="flex-1">
                            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded font-manrope uppercase tracking-wide mb-3">
                              {goal.category}
                            </span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-3">
                          {goal.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 font-manrope leading-relaxed">
                          {goal.description}
                        </p>
                        
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors text-sm font-medium font-manrope">
                          <Plus className="w-4 h-4" />
                          Join Goal
                        </button>
                      </motion.div>
                    )
                  })}

                  {/* Suggest a Goal Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: trendingGoals.length * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[280px]"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <Lightbulb className="w-8 h-8 text-gray-400 group-hover:text-[#4c99e6] transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-2">
                      Suggest a Goal
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope text-center">
                      Don't see what you're looking for? Help build the community library.
                    </p>
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* People Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: People to Follow */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-manrope">
                      People to Follow
                    </h2>
                    <button className="text-[#4c99e6] hover:text-[#3d88d5] text-sm font-medium font-manrope">
                      View All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map((person, index) => (
                      <motion.div
                        key={person.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold font-manrope">
                            {person.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white font-manrope truncate">
                              {person.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-manrope truncate">
                              {person.username}
                            </p>
                          </div>
                          <button
                            onClick={() => person.following ? handleUnfollow(person.id) : handleFollow(person.id)}
                            className="px-4 py-1.5 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors text-sm font-medium font-manrope"
                          >
                            {person.following ? 'Following' : 'Follow'}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-manrope">
                              {person.stats.goals}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                              Goals
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-manrope">
                              {person.stats.done}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                              Done
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-manrope">
                              {person.stats.streak}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                              Streak
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Right: Top Achievers & CTA */}
                <div className="space-y-6">
                  {/* Top Achievers */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-manrope">
                      Top Achievers
                    </h2>
                    <div className="space-y-3">
                      {topAchievers.map((achiever, index) => (
                        <motion.div
                          key={achiever.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold font-manrope text-sm">
                            {achiever.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-sm">
                              {achiever.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-manrope">
                              {achiever.username}
                            </p>
                          </div>
                          <TrendingUp className="w-4 h-4 text-[#4c99e6]" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Be the next Leader CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#4c99e6] flex items-center justify-center mx-auto mb-4">
                      <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-white font-manrope text-lg mb-2">
                      Be the next Leader
                    </h3>
                    <p className="text-gray-400 font-manrope text-sm mb-4">
                      Complete 5 more goals. Spark appear on the global leaderboard.
                    </p>
                    <button className="w-full px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-900 rounded-lg transition-colors text-sm font-medium font-manrope">
                      Go to Dashboard
                    </button>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Pagination Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 mt-12"
        >
          <div className="w-2 h-2 rounded-full bg-[#4c99e6]"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </motion.div>

        {/* Inspirational Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 font-manrope italic text-sm">
            "{randomQuote}"
          </p>
        </motion.div>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {openGoalId && (
          <GoalDetailsModal
            goalId={openGoalId}
            isOpen={!!openGoalId}
            onClose={() => setOpenGoalId(null)}
          />
        )}
      </Suspense>
    </div>
  )
}

export default DiscoverPageNew
