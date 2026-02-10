import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Trophy, Zap, Target, Flame, Star, UserPlus } from 'lucide-react';
import useApiStore from '../store/apiStore';
import GoalPostModalNew from '../components/GoalPostModalNew';

const ActivityCommentsModal = lazy(() => import('../components/ActivityCommentsModal'));

const FeedPageNew = () => {
  const { user, getActivityFeed, likeActivity, getTrendingGoals } = useApiStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [trendingGoals, setTrendingGoals] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Format timestamp to "time ago" format
  const formatTimeAgo = (isoDate) => {
    const now = new Date();
    const date = new Date(isoDate);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Transform API activity to component format
  const transformActivity = (apiActivity) => {
    const {
      _id,
      userId,
      name,
      avatar,
      type,
      data,
      createdAt,
      likeCount = 0,
      commentCount = 0,
      isLiked = false
    } = apiActivity;

    const completionNote = data?.metadata?.completionNote || data?.completionNote || '';
    const completionImage = data?.metadata?.completionAttachmentUrl || data?.completionAttachmentUrl || '';
    const isCompleted = type === 'goal_completed' || data?.isCompleted === true;

    // Determine activity type and format
    let activityType = 'goal_completed';
    let action = 'COMPLETED A GOAL';
    let content = {
      title: data?.goalTitle || 'Goal',
      category: data?.goalCategory,
    };

    if (type === 'habit_target_achieved' || type === 'habit_streak_milestone') {
      activityType = 'habit_streak';
      action = 'Achieved a milestone';
      content = {
        title: data?.habitTitle || 'Habit',
        description: data?.note || '',
        days: data?.streakDays || 0,
      };
    } else if (type === 'goal_created') {
      action = 'Created a goal';
    } else if (type === 'habit_added') {
      action = 'Started a habit';
    }

    return {
      id: _id,
      user: {
        name: apiActivity.user.name || 'User',
        avatar: apiActivity.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      },
      type: activityType,
      action,
      timestamp: formatTimeAgo(createdAt),
      content,
      completionNote,
      completionImage,
      isCompleted,
      likes: likeCount,
      comments: commentCount,
      isLiked,
      cheered: false,
      originalId: data?.goalId,
      originalType: type,
    };
  };

  // Load activity feed
  const loadActivityFeed = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      setError(null);
      const response = await getActivityFeed({
        page: pageNum,
        limit: 10,
      });

      if (!response) {
        setActivities([]);
        setHasMore(false);
        return;
      }

      const { activities: feedActivities, pagination } = response;

      if (!feedActivities || !Array.isArray(feedActivities)) {
        setActivities([]);
        setHasMore(false);
        return;
      }

      const transformed = feedActivities.map(transformActivity);

      if (pageNum === 1) {
        setActivities(transformed);
      } else {
        setActivities(prev => [...prev, ...transformed]);
      }

      setHasMore(pagination && pagination.page < pagination.pages);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
      setError('Failed to load feed. Please try again.');
      if (pageNum === 1) {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load initial feed on mount
  useEffect(() => {
    if (user) {
      loadActivityFeed(1);
      loadTrendingGoals();
    }
  }, [user]);

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Load trending goals
  const loadTrendingGoals = async () => {
    try {
      setTrendingLoading(true);
      const interests = Array.isArray(user?.interests) ? user.interests : [];
      const params = interests.length > 0
        ? { strategy: 'personalized', page: 1, limit: 10 }
        : { strategy: 'global', page: 1, limit: 10 };
      const { goals } = await getTrendingGoals(params);
      setTrendingGoals((goals || []).slice(0, 6));
    } catch (err) {
      console.error('Failed to load trending goals:', err);
      setTrendingGoals([]);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Get category gradient for trending goals
  const getCategoryGradient = (category) => {
    switch (category) {
      case 'Health & Fitness':
        return 'from-emerald-400 via-teal-400 to-cyan-400';
      case 'Education & Learning':
        return 'from-amber-400 via-yellow-400 to-orange-400';
      case 'Career & Business':
        return 'from-blue-400 via-purple-500 to-pink-400';
      case 'Financial Goals':
        return 'from-rose-400 via-pink-400 to-fuchsia-400';
      case 'Creative Projects':
        return 'from-purple-400 via-violet-400 to-fuchsia-400';
      case 'Travel & Adventure':
        return 'from-orange-400 via-amber-400 to-yellow-400';
      case 'Relationships':
        return 'from-pink-400 via-rose-400 to-red-400';
      case 'Family & Friends':
        return 'from-indigo-400 via-violet-400 to-sky-400';
      case 'Personal Development':
        return 'from-green-400 via-lime-400 to-emerald-400';
      default:
        return 'from-indigo-400 via-purple-400 to-pink-400';
    }
  };

  const handleLike = async (activityId) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      // Optimistic update
      setActivities(prev =>
        prev.map(a =>
          a.id === activityId
            ? {
                ...a,
                isLiked: !a.isLiked,
                likes: a.isLiked ? a.likes - 1 : a.likes + 1,
              }
            : a
        )
      );

      // Make API call
      await likeActivity(activityId, !activity.isLiked);
    } catch (err) {
      console.error('Failed to like activity:', err);
      // Revert optimistic update on error
      setActivities(prev =>
        prev.map(a =>
          a.id === activityId
            ? {
                ...a,
                isLiked: !a.isLiked,
                likes: a.isLiked ? a.likes - 1 : a.likes + 1,
              }
            : a
        )
      );
    }
  };



  // const suggestedFriends = [
  //   {
  //     id: 1,
  //     name: 'Jordan Smith',
  //     subtitle: '12 goals tracked',
  //     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
  //     isFollowing: false,
  //   },
  //   {
  //     id: 2,
  //     name: 'Leo Vance',
  //     subtitle: '8 habits active',
  //     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  //     isFollowing: false,
  //   },
  // ];

  // const [friends, setFriends] = useState(suggestedFriends);

  // const handleFollow = (friendId) => {
  //   setFriends(prev =>
  //     prev.map(friend =>
  //       friend.id === friendId
  //         ? { ...friend, isFollowing: !friend.isFollowing }
  //         : friend
  //     )
  //   );
  // };

  const handleOpenGoal = (goalId) => {
    setSelectedGoalId(goalId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoalId(null);
  };

  const handleOpenComments = (activityId) => {
    if (!activityId) return;
    if (isMobile) {
      setCommentsOpenActivityId(activityId);
      return;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your growth feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed - Left Side (2 columns width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Growth Feed</h1>
              <p className="text-gray-600">Celebrate your community's progress.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Activity Feed Cards */}
            {activities.length === 0 && !loading && !error ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
                <p className="text-gray-600">Start following people to see their progress and achievements!</p>
              </div>
            ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                >
                  {/* User Info Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {activity.user.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {activity.action} • {activity.timestamp}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="4" r="1.5" />
                        <circle cx="10" cy="10" r="1.5" />
                        <circle cx="10" cy="16" r="1.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Activity Content - Clickable */}
                  <div 
                    onClick={() => handleOpenGoal(activity.originalId)}
                    className="cursor-pointer"
                  >
                  {activity.type === 'habit_streak' ? (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <h4 className="text-white font-semibold text-lg">
                              {activity.content.title}
                            </h4>
                          </div>
                          <p className="text-gray-300 text-sm">
                            {activity.content.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-white">
                            {activity.content.days}
                          </div>
                          <div className="text-xs text-gray-400 uppercase">Days</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h4 className="text-xl font-semibold text-gray-900 mb-3">
                        {activity.content.title}
                      </h4>
                      {activity.content.category && (
                        <span className="inline-block px-3 py-1 bg-blue-50 text-[#4c99e6] text-xs font-semibold rounded-full uppercase tracking-wide">
                          {activity.content.category}
                        </span>
                      )}
                      {(activity.isCompleted && (activity.completionNote || activity.completionImage)) && (
                        <div className="mt-4 space-y-3">
                          {activity.completionImage && (
                            <div className="overflow-hidden rounded-lg border border-gray-100">
                              <img
                                src={activity.completionImage}
                                alt="Completion attachment"
                                className="w-full max-h-80 object-cover"
                              />
                            </div>
                          )}
                          {activity.completionNote && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {activity.completionNote}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  </div>

                  {/* Engagement Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-6">
                      {/* Like Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(activity.id);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            activity.isLiked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="text-sm font-medium">{activity.likes}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenComments(activity.id);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{activity.comments}</span>
                      </button>

                      {/* Share Button */}
                      <button onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block space-y-6">
            {/* Trending Goals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[#4c99e6]" />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Trending Goals
                </h3>
              </div>

              {trendingLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trendingGoals.length > 0 ? (
                <div className="space-y-3">
                  {trendingGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => handleOpenGoal(goal.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className={`relative h-12 w-12 rounded-full p-[2px] bg-gradient-to-br ${getCategoryGradient(goal.category)} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <div className="h-full w-full rounded-full bg-white p-[2px]">
                          <img
                            src={goal?.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${goal?.user_name}`}
                            alt={goal?.user_name || 'User'}
                            className="h-full w-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-[#4c99e6] transition-colors">
                          {goal.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          by {goal?.user_name || 'User'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No trending goals yet</p>
                </div>
              )}
            </div>

            {/* Suggested Friends */}
            {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                Suggested Friends
              </h3>

              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {friend.name}
                        </h4>
                        <p className="text-xs text-gray-500">{friend.subtitle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollow(friend.id)}
                      className={`p-2 rounded-lg transition-all ${
                        friend.isFollowing
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-50 text-[#4c99e6] hover:bg-blue-100'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 text-[#4c99e6] hover:text-blue-600 font-medium text-sm transition-colors">
                Find People
              </button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Goal Details Modal */}
      <GoalPostModalNew
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        goalId={selectedGoalId}
      />

      <Suspense fallback={null}>
        <ActivityCommentsModal
          isOpen={!!commentsOpenActivityId}
          onClose={() => setCommentsOpenActivityId(null)}
          activity={{ _id: commentsOpenActivityId }}
        />
      </Suspense>
    </div>
  );
};

export default FeedPageNew;
