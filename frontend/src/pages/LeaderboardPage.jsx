import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Trophy, 
  Target, 
  Users, 
  Crown,
  Clock
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

  // Navigate to user profile
  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}?tab=overview`);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Data Refresh Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
                <span className="text-xs">
                  Updated every 10 minutes. You may be viewing slightly outdated information.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex justify-center">
            <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg overflow-x-auto whitespace-nowrap">
              {[
                { id: 'global', label: 'Global', icon: Trophy },
                { id: 'friends', label: 'Friends', icon: Users }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-center gap-4">
            {/* Type Filter */}
            {(activeTab === 'global' || activeTab === 'friends') && (
              <select
                value={leaderboardType}
                onChange={(e) => setLeaderboardType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="points">🌟 Points</option>
                <option value="goals">🎯 Goals Completed</option>
                <option value="streak">⚡ Current Streak</option>
              </select>
            )}

            {/* Timeframe Filter */}
            {(activeTab === 'global' || activeTab === 'friends') && (
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">🏆 All Time</option>
                <option value="year">📅 This Year</option>
                <option value="month">🗓️ This Month</option>
                <option value="week">📍 This Week</option>
              </select>
            )}

            {/* Category Filter for Global and Friends */}
            {(activeTab === 'global' || activeTab === 'friends') && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="Health & Fitness">💪 Health & Fitness</option>
                <option value="Education & Learning">📚 Education & Learning</option>
                <option value="Career & Business">💼 Career & Business</option>
                <option value="Personal Development">🌱 Personal Development</option>
                <option value="Financial Goals">💰 Financial Goals</option>
                <option value="Creative Projects">🎨 Creative Projects</option>
                <option value="Travel & Adventure">✈️ Travel & Adventure</option>
                <option value="Relationships">❤️ Relationships</option>
                <option value="Family & Friends">👨‍👩‍👧‍👦 Family & Friends</option>
                <option value="Other">🔗 Other</option>
              </select>
            )}
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

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12 hidden md:block"
          >
            <div className="flex justify-center items-end space-x-4 mb-8">
              {/* Second Place */}
              {topThree[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="text-center"
                >
                  <div 
                    onClick={() => handleUserClick(topThree[1].username)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-gray-300 dark:border-gray-600 h-56 flex flex-col justify-between cursor-pointer hover:shadow-2xl transition-shadow duration-200"
                  >
                    <div>
                      <div className="text-4xl mb-2">🥈</div>
                      <img
                        src={topThree[1].avatar || '/api/placeholder/64/64'}
                        alt={topThree[1].name}
                        className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-gray-300"
                      />
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                        {topThree[1].name}
                      </h3>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {getTypeValue(topThree[1], leaderboardType)}
                      </p>
                      <p className="text-xs text-gray-500">{getTypeLabel(leaderboardType)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* First Place */}
              {topThree[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-center"
                >
                  <div 
                    onClick={() => handleUserClick(topThree[0].username)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-yellow-400 h-64 flex flex-col justify-between relative cursor-pointer hover:shadow-2xl transition-shadow duration-200"
                  >
                    <div>
                      <div className="text-5xl mb-2">🏆</div>
                      <img
                        src={topThree[0].avatar || '/api/placeholder/64/64'}
                        alt={topThree[0].name}
                        className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-yellow-400"
                      />
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {topThree[0].name}
                      </h3>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-yellow-600">
                        {getTypeValue(topThree[0], leaderboardType)}
                      </p>
                      <p className="text-sm text-gray-500">{getTypeLabel(leaderboardType)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Third Place */}
              {topThree[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-center"
                >
                  <div 
                    onClick={() => handleUserClick(topThree[2].username)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-orange-400 h-52 flex flex-col justify-between cursor-pointer hover:shadow-2xl transition-shadow duration-200"
                  >
                    <div>
                      <div className="text-3xl mb-2">🥉</div>
                      <img
                        src={topThree[2].avatar || '/api/placeholder/64/64'}
                        alt={topThree[2].name}
                        className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-orange-400"
                      />
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                        {topThree[2].name}
                      </h3>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-orange-600">
                        {getTypeValue(topThree[2], leaderboardType)}
                      </p>
                      <p className="text-xs text-gray-500">{getTypeLabel(leaderboardType)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Remaining Users List */}
        {/* Mobile: show full list including top 3 with medals */}
        {leaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden md:hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Rankings
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = !!(currentUser && user && user.username && currentUser.username && String(user.username).toLowerCase() === String(currentUser.username).toLowerCase());
                const bubble = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                return (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.05 * index }}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => !isCurrentUser && handleUserClick(user.username)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center text-white font-bold text-lg`}>
                          {bubble}
                        </div>
                        <img
                          src={user.avatar || '/api/placeholder/48/48'}
                          alt={user.name}
                          className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {(user.completedGoals || 0)} completed • {(user.totalGoals ?? 0)} total • {(user.currentStreak || 0)}-day streak
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {getTypeValue(user, leaderboardType)}
                          </p>
                          <p className="text-sm text-gray-500">{getTypeLabel(leaderboardType)}</p>
                        </div>
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
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden hidden md:block"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Rankings
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {remainingUsers.map((user, index) => {
                const rank = index + 4;
                const isCurrentUser = !!(currentUser && user && user.username && currentUser.username && String(user.username).toLowerCase() === String(currentUser.username).toLowerCase());
                
                return (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => !isCurrentUser && handleUserClick(user.username)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center text-white font-bold`}>
                          {rank}
                        </div>
                        <img
                          src={user.avatar || '/api/placeholder/48/48'}
                          alt={user.name}
                          className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {(user.completedGoals || 0)} completed • {(user.totalGoals ?? 0)} total • {(user.currentStreak || 0)}-day streak
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {getTypeValue(user, leaderboardType)}
                          </p>
                          <p className="text-sm text-gray-500">{getTypeLabel(leaderboardType)}</p>
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
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No rankings available
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              {activeTab === 'friends' 
                ? "Follow some users to see their rankings here!" 
                : "Start completing goals to appear on the leaderboard!"
              }
            </p>
          </div>
        )}

        {/* Call to Action */}
        {!loading && !error && leaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-12 text-center"
          >
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              <h3 className="text-3xl font-bold mb-4">
                🚀 Ready to Climb Higher?
              </h3>
              <p className="text-primary-100 mb-6 text-lg">
                Complete more goals and earn points to reach the top of the leaderboard!
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-xl hover:bg-gray-100 transition-colors font-bold text-lg shadow-lg"
              >
                <Target className="h-6 w-6 mr-2" />
                Go to Dashboard
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage; 