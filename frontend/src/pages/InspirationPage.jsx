import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  ArrowRight,
  Heart,
  MessageCircle,
  Share2,
  LogIn,
  Code,
  Target
} from 'lucide-react';
import useApiStore from '../store/apiStore';
import { useNavigate } from 'react-router-dom';
import { GOAL_CATEGORIES } from '../constants/goalCategories';

const InspirationPage = () => {
  const navigate = useNavigate();
  const [trendingGoals, setTrendingGoals] = useState([]);

  const {
    isAuthenticated,
    user,
    loading,
    recentActivities,
    leaderboard,
    getRecentActivities,
    getGlobalLeaderboard,
    getTrendingGoals,
  } = useApiStore();

  useEffect(() => {
    // Fetch recent public activities
    getRecentActivities({ type: 'global', limit: 20 });
    // Fetch top achievers for leaderboard
    getGlobalLeaderboard({ type: 'goals', limit: 10 });
    // Fetch trending goals
    loadTrendingGoals();
  }, []);

  const loadTrendingGoals = async () => {
    try {
      const params = { page: 1, limit: 6 };
      const { goals } = await getTrendingGoals(params);
      setTrendingGoals(goals || []);
    } catch (error) {
      setTrendingGoals([]);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getCategoryLabel = (categoryId) => {
    const category = GOAL_CATEGORIES.find(c => c.id === categoryId);
    return category?.label || categoryId;
  };

  const displayActivities = (recentActivities?.activities || []);
  const displayLeaderboard = (leaderboard || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Community Inspiration
          </h1>
          <p className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Discover how others are turning their dreams into reality.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Top Achievers & Public Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Achievers Carousel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Trophy className="h-5 w-5 text-[#4c99e6]" />
                  Top Achievers
                </h2>
              </div>

              {displayLeaderboard.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                  {displayLeaderboard.map((achiever, idx) => (
                    <div
                      key={achiever.username}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 flex-shrink-0 w-80"
                      onClick={() => {
                        if (achiever?.username) navigate(`/profile/@${achiever.username}?tab=overview`);
                      }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={achiever.avatar || '/api/placeholder/64/64'}
                            alt={achiever.name}
                            className="w-16 h-16 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {achiever.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Champion Status
                          </p>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Completed {achiever.completedGoals || 0} Goals This Year
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Trophy className="h-3.5 w-3.5" />
                        <span>Top 1% Global Contributions</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No top achievers yet. Be the first!
                </div>
              )}
            </div>

            {/* Public Activities */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <TrendingUp className="h-5 w-5 text-[#4c99e6]" />
                  Public Activities
                </h2>
              </div>

              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {displayActivities && displayActivities.length > 0 ? (
                  displayActivities.map((activity, index) => {
                    // Calculate random progress for demo (in real app, would come from activity data)
                    const progress = activity.data?.progress || Math.floor(Math.random() * 40 + 60);
                    
                    return (
                      <div
                        key={activity._id || index}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-4">
                            <img
                              src={activity?.avatar || '/api/placeholder/48/48'}
                              alt={activity?.name || 'User'}
                              className="w-12 h-12 rounded-full flex-shrink-0 cursor-pointer"
                              onClick={() => {
                                const username = activity?.userId?.username || activity?.username;
                                if (username) navigate(`/profile/@${username}?tab=overview`);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span 
                                  className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-[#4c99e6] transition-colors" 
                                  style={{ fontFamily: 'Manrope, sans-serif' }}
                                  onClick={() => {
                                    const username = activity?.userId?.username || activity?.username;
                                    if (username) navigate(`/profile/@${username}?tab=overview`);
                                  }}
                                >
                                  {activity?.name || 'Unknown User'}
                                </span>
                                {activity.data?.isPremium && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-[#4c99e6]">
                                    PREMIUM
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {activity.type === 'goal_completed' ? `Completed: ${activity.data?.goalTitle || 'Morning Yoga Session'}` :
                                 activity.type === 'goal_created' ? `Created a new goal: ${activity.data?.goalTitle || 'New Goal'}` :
                                 activity.type === 'user_followed' ? `Started following ${activity.data?.targetUserName || 'someone'}` :
                                 activity.type === 'streak_milestone' ? `Reached a ${activity.data?.streakCount || 0} day streak!` :
                                 activity.type === 'achievement_earned' ? `Earned "${activity.data?.achievementName || 'achievement'}" badge` :
                                 'Just completed: Morning Yoga Session'}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No recent activities to display
                  </div>
                )}
              </div>

              {displayActivities.length > 0 && (
                <button
                  onClick={() => navigate(isAuthenticated ? '/feed' : '/auth')}
                  className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <span>Load More Activities</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Your Influence & Trending Goals */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Your Influence */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-lg font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Your Influence
              </h2>
              {isAuthenticated ? (
                <>
                  <p className="text-sm text-gray-300 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    You have achieved {user?.completedGoals || 0} goals till now. Keep spreading the positivity!
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>Total Goals</span>
                      <span className="text-lg font-bold text-[#4c99e6]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {user?.totalGoals || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>Connections</span>
                      <span className="text-lg font-bold text-[#4c99e6]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {user?.followingCount || "-"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#4c99e6] hover:bg-[#3d88d5] rounded-xl text-white font-semibold transition-colors shadow-lg"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <Target className="h-5 w-5" />
                    <span>View Dashboard</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-300 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Join our community to track your progress, connect with others, and turn your dreams into reality.
                  </p>
                  <button
                    onClick={() => navigate('/auth')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#4c99e6] hover:bg-[#3d88d5] rounded-xl text-white font-semibold transition-colors shadow-lg"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Get Started</span>
                  </button>
                </>
              )}
            </div>

            {/* Trending Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Trending Goals
                </h2>
              </div>

              <div className="space-y-3">
                {trendingGoals && trendingGoals.length > 0 ? (
                  trendingGoals.map((goal, index) => (
                    <div
                      key={goal.id || index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#4c99e6] dark:hover:border-[#4c99e6] transition-all cursor-pointer"
                      onClick={() => navigate(isAuthenticated ? `/goals/${goal.id}` : '/auth')}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <Code className="h-5 w-5 text-[#4c99e6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {goal.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {getCategoryLabel(goal.category)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    No trending goals yet
                  </div>
                )}
              </div>

              {trendingGoals.length > 0 && (
                <button
                  onClick={() => navigate(isAuthenticated ? '/discover' : '/auth')}
                  className="w-full mt-4 text-sm text-[#4c99e6] hover:text-[#3d88d5] font-semibold transition-colors"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Explore All Categories
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspirationPage;