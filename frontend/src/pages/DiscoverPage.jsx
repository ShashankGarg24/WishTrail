import { useState, useEffect, lazy, Suspense, useMemo, useRef } from 'react'
import { GOAL_CATEGORIES } from '../constants/goalCategories'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Target, Search, UserPlus, Rocket, TrendingUp, Globe, Lightbulb } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getCategoryIcon } from '../utils/categoryIcons'
import CategoryBadge from '../components/CategoryBadge'

const GoalPostModal = lazy(() => import('../components/GoalPostModal'))

const DiscoverPageNew = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('goals')
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [users, setUsers] = useState([])
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')
  const userDebounceTimeout = useRef(null)
  const [topAchievers, setTopAchievers] = useState([])
  const [trendingGoals, setTrendingGoals] = useState([])
  const [allTrendingGoals, setAllTrendingGoals] = useState([])
  const [openGoalId, setOpenGoalId] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceTimeout = useRef(null)

  const {
    isAuthenticated,
    user,
    followUser,
    unfollowUser,
    getTrendingGoals,
    getUsers,
    getGlobalLeaderboard,
    leaderboard,
    searchPublicGoals,
    searchUsers,
  } = useApiStore()

  // Canonical categories (with 'All' option)
  const categories = [
    { id: 'all', label: 'All', icon: Globe, color: 'bg-gray-400' },
    ...GOAL_CATEGORIES
  ];


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

  // Debounce search input (goals)
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

  // Debounce search input (users)
  useEffect(() => {
    if (userDebounceTimeout.current) clearTimeout(userDebounceTimeout.current);
    userDebounceTimeout.current = setTimeout(() => {
      setDebouncedUserSearch(searchQuery);
    }, 400);
    return () => clearTimeout(userDebounceTimeout.current);
  }, [searchQuery]);

  // Load trending goals and top achievers, and user search
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'goals') {
      (async () => {
        // If searching, use searchPublicGoals API
        if (debouncedSearch.trim() || (selectedCategory && selectedCategory !== 'all')) {
          const params = {};
          if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
          if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
          const result = await searchPublicGoals(params);
          setAllTrendingGoals((result && Array.isArray(result.goals)) ? result.goals : []);
        } else {
          const data = await getTrendingGoals({ page: 1, limit: 30 });
          setAllTrendingGoals(data.goals || []);
        }
      })();
    } else {
      (async () => {
        if (debouncedUserSearch.trim()) {
          // Use searchUsers API, which searches by name and username
          const result = await searchUsers({ search: debouncedUserSearch.trim() });
          const foundUsers = result?.users || [];
          // Map API response to match UI expectations (add stats object)
          const mappedUsers = foundUsers.map(user => ({
            ...user,
            stats: {
              goals: user.totalGoals || 0,
              done: user.completedGoals || 0,
              streak: user.currentStreak || 0
            },
            following: user.isFollowing || false
          }));
          setUsers(mappedUsers);
        } else {
          // No users shown by default - only show through search
          setUsers([]);
        }
        // Fetch top achievers from leaderboard
        const top = await getGlobalLeaderboard({ page: 1, limit: 3 });
        setTopAchievers(Array.isArray(top) ? top.slice(0, 3) : []);
      })();
    }
  }, [activeTab, isAuthenticated, getTrendingGoals, getGlobalLeaderboard, debouncedSearch, selectedCategory, searchPublicGoals, debouncedUserSearch, searchUsers]);

  // Set trending goals from allTrendingGoals (already filtered by API)
  useEffect(() => {
    if (activeTab !== 'goals') return;
    setTrendingGoals(allTrendingGoals);
  }, [allTrendingGoals, activeTab]);

  // No need to filter users locally, as API already searches by name/username
  const filteredUsers = users;

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
                  {trendingGoals.map((goal, index) => (
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
                          <div className="text-gray-500 dark:text-gray-400 group-hover:text-[#4c99e6] transition-colors">
                            {getCategoryIcon(goal.category, 'w-5 h-5')}
                          </div>
                        </div>
                        <div className="flex-1">
                          <CategoryBadge category={goal.category} />
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-3">
                        {goal.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 font-manrope leading-relaxed">
                        {goal.description}
                      </p>
                    </motion.div>
                  ))}

                  {/* Suggest a Goal Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: trendingGoals.length * 0.05 }}
                    onClick={() => navigate('/dashboard?tab=goals')}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[280px]"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <Lightbulb className="w-8 h-8 text-gray-400 group-hover:text-[#4c99e6] transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-lg mb-2">
                      Make You Own Goal
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope text-center">
                      Don't see what you're looking for? Help build the community by adding your own goal.
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
                  </div>
                  
                  {filteredUsers.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-manrope mb-2">
                        Search for People
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 font-manrope">
                        Use the search bar above to find creators, mentors, or accountability partners.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredUsers.map((person, index) => (
                        <motion.div
                          key={person.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => navigate(`/profile/@${person.username}`)}
                          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer"
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
                  )}
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
                          key={achiever.id || achiever.username}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          onClick={() => navigate(`/profile/@${achiever.username}`)}
                          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold font-manrope text-sm">
                            {(achiever.name || achiever.displayName || achiever.username || '').charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white font-manrope text-sm">
                              {achiever.name || achiever.displayName || achiever.username}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-manrope">
                              {achiever.username ? `@${achiever.username}` : ''}
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
                      Complete more goals. Spark appear on the global leaderboard.
                    </p>
                    <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-900 rounded-lg transition-colors text-sm font-medium font-manrope">
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
          <GoalPostModal
            goalId={openGoalId}
            isOpen={!!openGoalId}
            onClose={() => setOpenGoalId(null)}
            openWithComments={false}
          />
        )}
      </Suspense>
    </div>
  )
}

export default DiscoverPageNew
