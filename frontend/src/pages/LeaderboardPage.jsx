import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Target,
  Users,
  Crown,
  Clock,
  TrendingUp,
  Award,
  Medal,
  Sparkles,
  Filter,
  ChevronDown,
  X,
  Calendar,
  Tag,
  Menu,
  Globe
} from 'lucide-react';
import useApiStore from '../store/apiStore';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'global';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [leaderboardType, setLeaderboardType] = useState('points');
  const [timeframe, setTimeframe] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const {
    isAuthenticated,
    loading,
    error,
    leaderboard,
    getGlobalLeaderboard,
    getFriendsLeaderboard,
    initializeFollowingStatus,
    user: currentUser
  } = useApiStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Navigate to user profile
  const handleUserClick = (userId) => {
    navigate(`/profile/@${userId}?tab=overview`);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLeaderboard();
      initializeFollowingStatus();
    }
  }, [isAuthenticated, activeTab, leaderboardType, timeframe, selectedCategory]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'global';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setActiveTab(tab);
  };

  const loadLeaderboard = async () => {
    const category = selectedCategory && selectedCategory !== '' ? selectedCategory : undefined;
    if (activeTab === 'friends') {
      await getFriendsLeaderboard({ type: leaderboardType, timeframe, category });
    } else {
      await getGlobalLeaderboard({ type: leaderboardType, timeframe, category });
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'points':
        return 'Points';
      case 'goals':
        return 'Goals Completed';
      default:
        return 'Points';
    }
  };

  const getTypeValue = (user, type) => {
    switch (type) {
      case 'points':
        return user.totalPoints || user.recentPoints || 0;
      case 'goals':
        return user.completedGoals || user.recentGoalsCount || 0;
      case 'streak':
        return user.currentStreak || 0;
      case 'level':
        return user.level || 'Novice';
      default:
        return user.totalPoints || 0;
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };

  const topThree = leaderboard ? leaderboard.slice(0, 3) : [];
  const remainingUsers = leaderboard ? leaderboard.slice(3) : [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full mb-6 mx-auto w-24 h-24 flex items-center justify-center"
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Join the Competition
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            See where you rank among other goal achievers and compete for the top spot
          </p>
          <a href="/auth" className="btn-primary text-lg px-8 py-3">
            Get Started
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-800 rounded-full mb-3">
            <Sparkles className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Compete & Achieve</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl mx-auto">
            See where you rank among achievers worldwide
          </p>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Filter Header - Clickable */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
              <motion.div
                animate={{ rotate: filtersExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.div>
            </button>
            
            {/* Filter Pills - Collapsible */}
            <AnimatePresence>
              {filtersExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* View Type Pill */}
                <div className="relative filter-dropdown">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'view' ? null : 'view')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{activeTab === 'global' ? 'Global' : 'Friends'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === 'view' && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[120px]">
                      <button onClick={() => { handleTabChange('global'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        🌍 Global
                      </button>
                      <button onClick={() => { handleTabChange('friends'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        👥 Friends
                      </button>
                    </div>
                  )}
                </div>

                {/* Metric Pill */}
                <div className="relative filter-dropdown">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'metric' ? null : 'metric')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{leaderboardType === 'points' ? 'Points' : leaderboardType === 'goals' ? 'Goals' : 'Streak'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === 'metric' && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[140px]">
                      <button onClick={() => { setLeaderboardType('points'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        🌟 Points
                      </button>
                      <button onClick={() => { setLeaderboardType('goals'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        🎯 Goals
                      </button>
                      <button onClick={() => { setLeaderboardType('streak'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        🔥 Streak
                      </button>
                    </div>
                  )}
                </div>

                {/* Period Pill */}
                <div className="relative filter-dropdown">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'period' ? null : 'period')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{timeframe === 'all' ? 'All Time' : timeframe === 'year' ? 'Year' : timeframe === 'month' ? 'Month' : 'Week'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === 'period' && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[130px]">
                      <button onClick={() => { setTimeframe('all'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        ⏰ All Time
                      </button>
                      <button onClick={() => { setTimeframe('year'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        📅 Year
                      </button>
                      <button onClick={() => { setTimeframe('month'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        📆 Month
                      </button>
                      <button onClick={() => { setTimeframe('week'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        📌 Week
                      </button>
                    </div>
                  )}
                </div>

                {/* Category Pill */}
                {selectedCategory && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{selectedCategory}</span>
                    <button onClick={() => setSelectedCategory('')} className="hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                <div className="relative filter-dropdown">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Category
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === 'category' && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-60 overflow-y-auto min-w-[200px]">
                      <button onClick={() => { setSelectedCategory(''); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">All Categories</button>
                      <button onClick={() => { setSelectedCategory('Health & Fitness'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">💪 Health & Fitness</button>
                      <button onClick={() => { setSelectedCategory('Education & Learning'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">📚 Education & Learning</button>
                      <button onClick={() => { setSelectedCategory('Career & Business'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">💼 Career & Business</button>
                      <button onClick={() => { setSelectedCategory('Personal Development'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">🌱 Personal Development</button>
                      <button onClick={() => { setSelectedCategory('Financial Goals'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">💰 Financial Goals</button>
                      <button onClick={() => { setSelectedCategory('Creative Projects'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">🎨 Creative Projects</button>
                      <button onClick={() => { setSelectedCategory('Travel & Adventure'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">✈️ Travel & Adventure</button>
                      <button onClick={() => { setSelectedCategory('Relationships'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">❤️ Relationships</button>
                      <button onClick={() => { setSelectedCategory('Family & Friends'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">👨‍👩‍👧‍👦 Family & Friends</button>
                      <button onClick={() => { setSelectedCategory('Other'); setOpenDropdown(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">📌 Other</button>
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4 text-4xl">⚠️</div>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        )}

        {/* Top 3 Podium - Desktop */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6 hidden md:block"
          >
            <div className="flex justify-center items-end gap-4 max-w-4xl mx-auto">
              {/* Second Place */}
              {topThree[1] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  onClick={() => handleUserClick(topThree[1].username)}
                  className="flex-1 cursor-pointer group"
                >
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex flex-col items-center space-y-3">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🥈</div>
                        <div className="relative inline-block mb-2">
                          <img
                            src={topThree[1].avatar || '/api/placeholder/64/64'}
                            alt={topThree[1].name}
                            className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-gray-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                            2
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate max-w-[120px]">
                          {topThree[1].name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Silver</p>
                      </div>
                      <div className="text-center w-full">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
                          <p className="text-2xl font-black text-gray-700 dark:text-gray-300">
                            {getTypeValue(topThree[1], leaderboardType)}
                          </p>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{getTypeLabel(leaderboardType)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* First Place */}
              {topThree[0] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  onClick={() => handleUserClick(topThree[0].username)}
                  className="flex-1 cursor-pointer group"
                >
                  <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-orange-900/30 rounded-2xl p-5 border-2 border-yellow-400 dark:border-yellow-600 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105 relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl" />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-orange-400/20 rounded-full blur-2xl" />
                    
                    {/* Crown */}
                    <div className="absolute top-2 right-2">
                      <Crown className="h-5 w-5 text-yellow-500 animate-pulse" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center space-y-3">
                      <div className="text-center">
                        <div className="text-5xl mb-2">🏆</div>
                        <div className="relative inline-block mb-2">
                          <img
                            src={topThree[0].avatar || '/api/placeholder/80/80'}
                            alt={topThree[0].name}
                            className="w-20 h-20 rounded-full border-2 border-yellow-400 dark:border-yellow-600 shadow-lg ring-2 ring-yellow-200 dark:ring-yellow-800"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md">
                            1
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-0.5 truncate max-w-[140px]">
                          {topThree[0].name}
                        </h3>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-semibold">👑 Champion</p>
                      </div>
                      <div className="text-center w-full">
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-2.5 shadow-md">
                          <p className="text-3xl font-black text-white drop-shadow-md">
                            {getTypeValue(topThree[0], leaderboardType)}
                          </p>
                          <p className="text-xs font-bold text-yellow-100">{getTypeLabel(leaderboardType)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Third Place */}
              {topThree[2] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  onClick={() => handleUserClick(topThree[2].username)}
                  className="flex-1 cursor-pointer group"
                >
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-4 border-2 border-orange-400 dark:border-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex flex-col items-center space-y-3">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🥉</div>
                        <div className="relative inline-block mb-2">
                          <img
                            src={topThree[2].avatar || '/api/placeholder/64/64'}
                            alt={topThree[2].name}
                            className="w-16 h-16 rounded-full border-2 border-orange-400 dark:border-orange-600 shadow-md"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                            3
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate max-w-[120px]">
                          {topThree[2].name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bronze</p>
                      </div>
                      <div className="text-center w-full">
                        <div className="bg-orange-200 dark:bg-orange-900/40 rounded-lg p-2">
                          <p className="text-2xl font-black text-orange-700 dark:text-orange-300">
                            {getTypeValue(topThree[2], leaderboardType)}
                          </p>
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">{getTypeLabel(leaderboardType)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Mobile: show full list including top 3 with medals */}
        {leaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 md:hidden"
          >
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Rankings
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {leaderboard.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = !!(currentUser && user && user.username && currentUser.username && String(user.username).toLowerCase() === String(currentUser.username).toLowerCase());
                const isTop3 = rank <= 3;
                const getMedalEmoji = (r) => {
                  if (r === 1) return '🏆';
                  if (r === 2) return '🥈';
                  if (r === 3) return '🥉';
                  return r;
                };
                
                return (
                  <motion.div
                    key={user._id || user.username || `${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.02 * index }}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer ${
                      isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500' : ''
                    } ${isTop3 ? 'bg-gradient-to-r from-yellow-50/30 to-orange-50/30 dark:from-yellow-900/10 dark:to-orange-900/10' : ''}`}
                    onClick={() => !isCurrentUser && handleUserClick(user.username)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-base shadow-md ${
                          rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                          rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                          rank === 3 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white' :
                          'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                        }`}>
                          {getMedalEmoji(rank)}
                        </div>
                        
                        {/* Avatar */}
                        <img
                          src={user.avatar || '/api/placeholder/40/40'}
                          alt={user.name}
                          className="w-10 h-10 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0"
                        />
                        
                        {/* User Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">
                              {user.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="flex-shrink-0 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Target className="h-3 w-3" />
                              {user.completedGoals || 0} done
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Trophy className="h-3 w-3" />
                              {user.totalGoals ?? 0} total
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`text-xl font-black ${
                          rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                          rank === 2 ? 'text-gray-600 dark:text-gray-400' :
                          rank === 3 ? 'text-orange-600 dark:text-orange-400' :
                          'text-gray-900 dark:text-white'
                        }`}>
                          {getTypeValue(user, leaderboardType)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                          {getTypeLabel(leaderboardType)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Desktop: remaining users list (ranks 4+) */}
        {remainingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hidden md:block"
          >
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5" />
                All Rankings
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {remainingUsers.map((user, index) => {
                const rank = index + 4;
                const isCurrentUser = !!(currentUser && user && user.username && currentUser.username && String(user.username).toLowerCase() === String(currentUser.username).toLowerCase());

                return (
                  <motion.div
                    key={user._id || user.username || `${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.02 * index }}
                    className={`p-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group ${
                      isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => !isCurrentUser && handleUserClick(user.username)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Rank Badge */}
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-md group-hover:scale-110 transition-transform">
                          {rank}
                        </div>
                        
                        {/* Avatar */}
                        <img
                          src={user.avatar || '/api/placeholder/44/44'}
                          alt={user.name}
                          className="w-11 h-11 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm group-hover:scale-105 transition-transform"
                        />
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                              {user.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="flex-shrink-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span className="font-medium">{user.completedGoals || 0}</span> done
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              <span className="font-medium">{user.totalGoals ?? 0}</span> total
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                          <p className="text-2xl font-black text-gray-900 dark:text-white">
                            {getTypeValue(user, leaderboardType)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                            {getTypeLabel(leaderboardType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && (!leaderboard || leaderboard.length === 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No rankings available yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {activeTab === 'friends'
                ? "Follow some users to see their rankings here and compete with your friends!"
                : "Start completing goals to appear on the leaderboard and compete with others!"
              }
            </p>
            <a
              href={activeTab === 'friends' ? '/discover' : '/dashboard'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm"
            >
              {activeTab === 'friends' ? (
                <>
                  <Users className="h-4 w-4" />
                  Discover Users
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Start Your Journey
                </>
              )}
            </a>
          </motion.div>
        )}

        {/* Call to Action */}
        {!loading && !error && leaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <div className="relative overflow-hidden bg-gradient-to-r from-primary-500 via-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
              {/* Animated Background Elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24" />
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">Achieve More</span>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black mb-3">
                  Ready to Climb Higher? 🚀
                </h3>
                <p className="text-white/90 mb-6 text-sm max-w-2xl mx-auto">
                  Complete more goals, earn points, and compete with achievers worldwide to reach the top!
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-all font-bold text-sm shadow-lg hover:scale-105 transform"
                  >
                    <Target className="h-4 w-4" />
                    Go to Dashboard
                  </a>
                  <a
                    href="/discover?tab=community"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg hover:bg-white/20 transition-all font-bold text-sm hover:scale-105 transform"
                  >
                    <Users className="h-4 w-4" />
                    Discover Community
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage; 