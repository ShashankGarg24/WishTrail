import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Trophy,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import useApiStore from '../store/apiStore';
import { useNavigate } from 'react-router-dom';

const InspirationPage = () => {

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recent');

  const {
    isAuthenticated,
    loading,
    recentActivities,
    leaderboard,
    getRecentActivities,
    getGlobalLeaderboard,
  } = useApiStore();

  useEffect(() => {
    // Fetch recent activities for inspiration from ALL users
    getRecentActivities({ type: 'global', limit: 20 });
    // Fetch top achievers for leaderboard
    getGlobalLeaderboard({ type: 'goals', limit: 50 });
  }, [getRecentActivities, getGlobalLeaderboard]);

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hours ago`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Career': 'bg-blue-500',
      'Health': 'bg-green-500',
      'Personal Development': 'bg-purple-500',
      'Education': 'bg-yellow-500',
      'Finance': 'bg-red-500',
      'Health & Fitness': 'bg-green-500',
      'Education & Learning': 'bg-yellow-500',
      'Career & Business': 'bg-blue-500',
      'Financial Goals': 'bg-red-500',
      'Creative Projects': 'bg-purple-500',
      'Travel & Adventure': 'bg-orange-500',
      'Relationships': 'bg-pink-500',
      'Family & Friends': 'bg-indigo-500',
      'Other': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'goal_completed':
        return '🎯';
      case 'goal_created':
        return '✨';
      case 'user_followed':
        return '🤝';
      case 'streak_milestone':
        return '🔥';
      case 'achievement_earned':
        return '🏆';
      default:
        return '📝';
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'goal_completed':
        return 'completed the goal - ';
      case 'goal_created':
        return 'created a new goal - ';
      case 'user_followed':
        return `started following ${activity.data?.targetUserName || 'someone'}`;
      case 'streak_milestone':
        return `reached a ${activity.data?.streakCount || 0} day streak!`;
      case 'achievement_earned':
        return `earned the "${activity.data?.achievementName || 'achievement'}" badge`;
      default:
        return 'achieved';
    }
  };

  const displayActivities = (recentActivities || []);
  const displayLeaderboard = (leaderboard || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Get Inspired by Our Community</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            See What's Happening
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover amazing achievements and connect with goal-setters worldwide
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="glass-card-hover p-5 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {displayActivities?.activities?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Recent Activities</div>
          </div>
          
          <div className="glass-card-hover p-5 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-3">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {displayLeaderboard?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Top Achievers</div>
          </div>
          
          <div className="glass-card-hover p-5 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {(displayLeaderboard?.reduce((sum, u) => sum + (u.completedGoals || 0), 0) || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Goals Completed</div>
          </div>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex rounded-xl bg-white dark:bg-gray-800 p-1 shadow-md">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'recent'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Recent Activities</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'top'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>Top Achievers</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading inspiration...</p>
            </div>
          </div>
        )}

        {/* Main Content with Tabs */}
        <AnimatePresence mode="wait">
          {activeTab === 'recent' && (
            <motion.div
              key="recent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="glass-card-hover rounded-2xl p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-purple-500 rounded-full"></div>
                  Recent Activities
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Live updates</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {displayActivities && displayActivities.activities && displayActivities.activities.length > 0 ? (
                  displayActivities.activities.map((activity, index) => (
                    <motion.div
                      key={activity._id || `activity-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.05 * Math.min(index, 8) }}
                      className="flex items-start space-x-3 p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 cursor-pointer group"
                      onClick={() => {
                        const username = activity?.userId?.username || activity?.username;
                        if (username) navigate(`/profile/@${username}?tab=overview`);
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={activity?.avatar || '/api/placeholder/48/48'}
                          alt={activity?.name || 'User'}
                          className="w-11 h-11 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getCategoryColor(activity.data?.goalCategory)} flex items-center justify-center text-xs shadow-md`}>
                          {getActivityIcon(activity)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                            {activity?.name || 'Unknown User'}
                          </span>
                          {activity.data?.goalCategory && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data?.goalCategory)} flex-shrink-0`}>
                              {activity.data?.goalCategory}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                          {activity.type === 'goal_completed' || activity.type === 'goal_created'
                            ? `${getActivityText(activity)} ${activity.data?.goalTitle || 'Goal Achievement'}`
                            : getActivityText(activity)
                          }
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(activity.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : !loading && (
                  <div className="col-span-full text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                      <CheckCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No recent activities yet</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">Check back soon for updates!</p>
                  </div>
                )}
              </div>
              {displayActivities && displayActivities.activities && displayActivities.activities.length > 0 && (
                <div className="mt-6 text-center">
                  <a
                    href={isAuthenticated ? "/feed" : "/auth"}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <span>{isAuthenticated ? "View All Activities" : "Join to See More"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'top' && (
            <motion.div
              key="top"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="glass-card-hover rounded-2xl p-6 mb-8"
            >

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                  Top Achievers
                </h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>Ranked by Goals Completed</span>
                </div>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {displayLeaderboard && displayLeaderboard.length > 0 ? (
                  displayLeaderboard.map((user, index) => {
                    const rank = index + 1;
                    const isPodium = rank <= 3;

                    return (
                      <motion.div
                        key={user._id || `user-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * Math.min(index, 8) }}
                        onClick={() => {
                          if (user?.username) navigate(`/profile/@${user.username}?tab=overview`);
                        }}
                        className={`flex items-center space-x-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
                          isPodium
                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700/50 hover:shadow-lg'
                            : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-md ${
                            rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                            rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' : 
                            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {isPodium ? getRankIcon(rank) : `#${rank}`}
                          </div>
                        </div>

                        <img
                          src={user.avatar || '/api/placeholder/48/48'}
                          alt={user.name}
                          className={`w-12 h-12 rounded-full flex-shrink-0 shadow-md ${
                            isPodium ? 'border-3 border-yellow-400 dark:border-yellow-600' : 'border-2 border-white dark:border-gray-700'
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                              {user.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              <span className="font-medium">{user.completedGoals || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="font-medium">{user.completedGoals || 0}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : !loading && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                      <Trophy className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No achievers yet</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">Be the first to complete goals!</p>
                  </div>
                )}
              </div>
              {displayLeaderboard && displayLeaderboard.length > 0 && (
                <div className="mt-6 text-center">
                  <a
                    href={isAuthenticated ? "/leaderboard?tab=global" : "/auth"}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <span>{isAuthenticated ? "View Full Leaderboard" : "Join to See More"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call to Action */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-purple-600 to-pink-600 rounded-2xl p-8 sm:p-12 text-white shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6"
                >
                  <Sparkles className="h-8 w-8" />
                </motion.div>
                
                <h3 className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to Start Your Journey?
                </h3>
                <p className="text-white/90 mb-8 text-base sm:text-lg">
                  Join thousands of goal-setters achieving their dreams. Track progress, stay motivated, and celebrate wins together!
                </p>
                <a
                  href="/auth"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-600 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <Star className="h-6 w-6" />
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InspirationPage;