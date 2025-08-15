import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  TrendingUp, 
  Star, 
  Trophy, 
  CheckCircle,
  Flame,
  Calendar,
  Award,
  Crown,
  Clock
} from 'lucide-react';
import useApiStore from '../store/apiStore';
import { useNavigate } from 'react-router-dom';

const InspirationPage = () => {

  const navigate = useNavigate();
  
  const { 
    isAuthenticated, 
    loading,
    recentActivities,
    leaderboard,
    getRecentActivities,
    getGlobalLeaderboard,
    user,
    token
  } = useApiStore();

  useEffect(() => {
    // Fetch recent activities for inspiration from ALL users
    getRecentActivities({ type: 'global', limit: 20 });
    // Fetch top achievers for leaderboard
    getGlobalLeaderboard({ type: 'points', limit: 50 });
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
    switch(activity.type) {
      case 'goal_completed':
        return '🎯';
      case 'goal_created':
        return '✨';
      case 'user_followed':
        return '🤝';
      case 'level_up':
        return '⚡️';
      case 'streak_milestone':
        return '🔥';
      case 'achievement_earned':
        return '🏆';
      default:
        return '📝';
    }
  };

  const getAchievementBadge = (user) => {
    if (user.totalPoints > 1000) return { label: 'Goal Master', color: 'bg-yellow-500' };
    if (user.totalPoints > 500) return { label: 'Consistency Champion', color: 'bg-purple-500' };
    if (user.totalPoints > 200) return { label: 'Progress Pioneer', color: 'bg-blue-500' };
    return { label: 'Achievement Ace', color: 'bg-green-500' };
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
  };

  const calculateStreak = (user) => {
    // Calculate streak based on user data or use a reasonable default
    if (!user) return Math.floor(Math.random() * 30) + 1;
    return user.currentStreak || Math.floor(Math.random() * 30) + 1;
  };

  const getActivityText = (activity) => {
    switch(activity.type) {
      case 'goal_completed':
        return 'completed the goal - ';
      case 'goal_created':
        return 'created a new goal - ';
      case 'user_followed':
        return `started following ${activity.data?.targetUserName || 'someone'}`;
      case 'level_up':
        return `leveled up to ${activity.data?.newLevel || 'next level'}`;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Inspiration
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-xl max-w-3xl mx-auto">
            Be inspired by the incredible progress happening in our community right now
          </p>
        </motion.div>
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

        {/* Loading State */}
        {loading && isAuthenticated && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Achievements */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-green-500 rounded-full p-2 mr-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Achievements</h2>
              </div>
            </div>
            <div className="relative">
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {displayActivities && displayActivities.activities && displayActivities.activities.length > 0 ? (
                  displayActivities.activities.map((activity, index) => (
                    <motion.div
                      key={activity._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 * Math.min(index, 5) }}
                      className="flex items-start space-x-4 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-all duration-200"
                    >
                      <div className="relative">
                        <img
                          src={activity?.avatar || '/api/placeholder/48/48'}
                          alt={activity?.name || 'User'}
                          className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-500 cursor-pointer"
                          onClick={() => navigate(`/profile/${activity?.userId?._id}`)}
                        />
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${getCategoryColor(activity.data?.goalCategory)} flex items-center justify-center text-xs`}>
                          {getActivityIcon(activity)}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span 
                          className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-500"
                          onClick={() => navigate(`/profile/${activity?.userId?._id}`)}
                          >
                            {activity?.name || 'Unknown User'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data?.goalCategory)}`}>
                            {activity.data?.goalCategory || 'General'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                          {activity.type === 'goal_completed' || activity.type === 'goal_created' 
                            ? `${getActivityText(activity)} ${activity.data?.goalTitle || 'Goal Achievement'}`
                            : getActivityText(activity)
                          }
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatTimeAgo(activity.createdAt)}</span>
                          {/* <div className="flex items-center space-x-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            <span>{calculateStreak(activity.user || {})} day streak</span>
                          </div> */}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : !loading && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No recent achievements to show.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Follow some users to see their progress!</p>
                  </div>
                )}
              </div>
              </div>
              {displayActivities && displayActivities.activities && displayActivities.activities.length > 6 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800/50 to-transparent pointer-events-none rounded-b-2xl"></div>
              )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-6 text-center"
            >
              <a
                href={isAuthenticated ? "/explore?tab=activities" : "/auth"}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors duration-200 font-medium"
              >
                {isAuthenticated ? "View All Activities" : "Join to See More"}
              </a>
            </motion.div>
          </motion.div>

          {/* Top Goal Achievers */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-yellow-500 rounded-full p-2 mr-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Top Goal Achievers</h2>
              </div>
            </div>
            <div className="relative">
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {displayLeaderboard && displayLeaderboard.length > 0 ? (
                  displayLeaderboard.map((user, index) => {
                    const badge = getAchievementBadge(user);
                    const rank = index + 1;
                    
                    return (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 * Math.min(index, 5) }}
                        className="flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            rank === 1 ? 'bg-yellow-500' : 
                            rank === 2 ? 'bg-gray-400' : 
                            rank === 3 ? 'bg-amber-600' : 'bg-gray-600'
                          }`}>
                            #{rank}
                          </div>
                          <div className="absolute -top-1 -right-1 text-lg">
                            {getRankIcon(rank)}
                          </div>
                        </div>
                        
                        <img
                          src={user.avatar || '/api/placeholder/48/48'}
                          alt={user.name}
                          className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-500 cursor-pointer flex-shrink-0"
                          onClick={() => navigate(`/profile/${user?._id}`)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span 
                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-500 truncate"
                            onClick={() => navigate(`/profile/${user?._id}`)}
                            >
                              {user.name}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>{user.completedGoals || 0} goals</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4" />
                              <span>{user.totalPoints || 0} points</span>
                            </div>
                            {/* <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{calculateStreak(user || {})} days</span>
                            </div> */}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : !loading && (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No achievers to show yet.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Complete some goals to appear here!</p>
                  </div>
                )}
              </div>
              {displayLeaderboard && displayLeaderboard.length > 6 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800/50 to-transparent pointer-events-none rounded-b-2xl"></div>
              )}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-6 text-center"
            >
              <a
                href={isAuthenticated ? "/leaderboard" : "/auth"}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors duration-200 font-medium"
              >
                {isAuthenticated ? "View Full Leaderboard" : "Join to See More"}
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
            <h3 className="text-3xl font-bold mb-4">
              🚀 Ready to Join the Action?
            </h3>
            <p className="text-primary-100 mb-6 text-lg">
              Start setting and achieving your goals today. Be part of this amazing community!
          </p>
          <a
            href={isAuthenticated ? "/dashboard" : "/auth"}
              className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-xl hover:bg-gray-100 transition-colors font-bold text-lg shadow-lg"
          >
              <Star className="h-6 w-6 mr-2" />
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
          </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InspirationPage;