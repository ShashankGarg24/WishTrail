import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, Heart, MessageCircle, RefreshCw, Compass, ArrowRightCircle, Send, Newspaper, Sparkles } from 'lucide-react'
import useApiStore from '../store/apiStore'
import SkeletonList from '../components/loader/SkeletonList'
const ActivityCommentsModal = lazy(() => import('../components/ActivityCommentsModal'));
const ReportModal = lazy(() => import('../components/ReportModal'));
const BlockModal = lazy(() => import('../components/BlockModal'));
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
const ShareSheet = lazy(() => import('../components/ShareSheet'));

const FeedPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    isAuthenticated,
    getActivityFeed,
    user,
    getTrendingGoals,
    likeActivity,
    unfollowUser,
    report,
    blockUser,
  } = useApiStore()

  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState([])
  const ACTIVITIES_PAGE_SIZE = 10
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [activitiesHasMore, setActivitiesHasMore] = useState(true)
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false)

  const [likePending, setLikePending] = useState({})
  const [openActivityMenuId, setOpenActivityMenuId] = useState(null)
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!openActivityMenuId) return;
      const target = e.target;
      const inside = target?.closest?.('[data-activity-menu="true"]') || target?.closest?.('[data-activity-menu-btn="true"]');
      if (inside) return;
      setOpenActivityMenuId(null);
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [openActivityMenuId])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState({ type: null, id: null, label: '', username: '', userId: null })
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockUserId, setBlockUserId] = useState(null)
  const [blockUsername, setBlockUsername] = useState('')


  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [openGoalId, setOpenGoalId] = useState(null)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false);
  const activitiesSentinelRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false);
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null);
  const [inNativeApp, setInNativeApp] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const shareUrlRef = useRef('')

  // Stories (trending/inspiring goals) state
  const [stories, setStories] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const STORIES_LIMIT = 20


  useEffect(() => {
    if (!isAuthenticated) return
    fetchInitial()
  }, [isAuthenticated])

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const gid = params.get('goalId')
      if (gid) {
        openGoalModal(gid)
      }
    } catch { }
  }, [location.search])

  // Track viewport for mobile/desktop behaviors
  useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.ReactNativeWebView) setInNativeApp(true) } catch { }
  }, [])

  useEffect(() => {
    if (goalModalOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [goalModalOpen])

  const fetchInitial = async (forceRefresh = false) => {
    setLoading(true)
    try {
      // Load stories bar first for quick UI feel
      try {
        setStoriesLoading(true)
        const interests = Array.isArray(user?.interests) ? user.interests : []
        // Personalized if user has interests, else global
        const params = interests.length > 0
          ? { strategy: 'personalized', page: 1, limit: STORIES_LIMIT }
          : { strategy: 'global', page: 1, limit: STORIES_LIMIT }
        const { goals } = await getTrendingGoals(params, { force: forceRefresh })
        setStories((goals || []).slice(0, STORIES_LIMIT))
      } catch (_) {
        setStories([])
      } finally {
        setStoriesLoading(false)
      }

      setActivitiesPage(1)
      setActivitiesHasMore(true)
      const activitiesData = await getActivityFeed({ page: 1, limit: ACTIVITIES_PAGE_SIZE }, { force: forceRefresh })
      setActivities(activitiesData.activities || [])
      const totalPages = activitiesData.pagination?.pages || 1
      setActivitiesHasMore(1 < totalPages)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const loadMoreActivities = useCallback(async () => {
    if (loadingMoreActivities || !activitiesHasMore) return
    setLoadingMoreActivities(true)
    try {
      const next = activitiesPage + 1
      const resp = await getActivityFeed({ page: next, limit: ACTIVITIES_PAGE_SIZE })
      const mergeUniqueById = (prev, nextItems) => {
        const seen = new Set((prev || []).map((i) => i?._id).filter(Boolean))
        const merged = [...(prev || [])]
        for (const item of (nextItems || [])) {
          if (!item || !item._id) continue
          if (!seen.has(item._id)) {
            merged.push(item)
            seen.add(item._id)
          }
        }
        return merged
      }
      setActivities(prev => mergeUniqueById(prev, resp.activities || []))
      setActivitiesPage(next)
      const totalPages = resp.pagination?.pages || next
      setActivitiesHasMore(next < totalPages)
    } catch (e) {
      setActivitiesHasMore(false)
    } finally {
      setLoadingMoreActivities(false)
    }
  }, [activitiesPage, activitiesHasMore, loadingMoreActivities, getActivityFeed])

  useEffect(() => {
    if (!isAuthenticated) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        loadMoreActivities()
      }
    }, { root: null, rootMargin: '300px', threshold: 0.1 })
    const target = activitiesSentinelRef.current
    if (target) observer.observe(target)
    return () => observer.disconnect()
  }, [isAuthenticated, loadMoreActivities, activities.length, activitiesHasMore])

  const toggleActivityLikeOptimistic = async (activityId) => {
    if (likePending[activityId]) return;
    setLikePending((p) => ({ ...p, [activityId]: true }));
    // Determine intended action from current state before optimistic flip
    const current = activities.find(a => a._id === activityId);
    const intendLike = !(current?.isLiked);
    // Optimistic update
    setActivities((prev) => prev.map((a) => {
      if (a._id !== activityId) return a;
      const currentCount = a.likeCount || 0;
      return intendLike
        ? { ...a, isLiked: true, likeCount: currentCount + 1 }
        : { ...a, isLiked: false, likeCount: Math.max(currentCount - 1, 0) };
    }));
    try {
      const resp = await likeActivity(activityId, intendLike);
      const { likeCount, isLiked } = resp?.data?.data || {};
      if (typeof likeCount === 'number') {
        setActivities((prev) => prev.map((a) => a._id === activityId ? { ...a, likeCount, isLiked: !!isLiked } : a));
      }
    } catch (err) {
      // Revert on failure
      setActivities((prev) => prev.map((a) => {
        if (a._id !== activityId) return a;
        const currentCount = a.likeCount || 0;
        return intendLike
          ? { ...a, isLiked: false, likeCount: Math.max(currentCount - 1, 0) }
          : { ...a, isLiked: true, likeCount: currentCount + 1 };
      }));
      console.error('Activity like toggle failed', err);
    } finally {
      setLikePending((p) => ({ ...p, [activityId]: false }));
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'goal_activity':
        if (activity.data?.isCompleted) {
          return 'completed a goal';
        } else if (activity.data?.lastUpdateType === 'subgoal_completed') {
          return 'completed a subgoal';
        } else if (activity.data?.lastUpdateType === 'subgoal_added') {
          return 'added subgoals';
        } else {
          return 'created a goal';
        }
      case 'goal_completed':
        return 'completed a goal'
      case 'goal_created':
        return 'created a goal'
      case 'subgoal_added':
        return 'added a sub-goal'
      case 'subgoal_removed':
        return 'removed a sub-goal'
      case 'subgoal_completed':
        return 'completed a sub-goal'
      case 'subgoal_uncompleted':
        return 'uncompleted a sub-goal'
      case 'habit_added':
        return 'linked a habit'
      case 'habit_removed':
        return 'unlinked a habit'
      case 'habit_target_achieved':
        return 'achieved a habit target'
      case 'streak_milestone':
        return 'achieved a streak milestone'
      case 'achievement_earned':
        return 'earned an achievement'
      default:
        return 'had some activity'
    }
  }


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

  const getCategoryGradient = (category) => {
    switch (category) {
      case 'Health & Fitness':
        return 'from-emerald-400 via-teal-400 to-cyan-400';
      case 'Education & Learning':
        return 'from-amber-400 via-yellow-400 to-orange-400';
      case 'Career & Business':
        return 'from-blue-400 via-indigo-400 to-sky-400';
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

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  }

  const openGoalModal = (gid) => {
    if (!gid) return
    setOpenGoalId(gid)
    setGoalModalOpen(true)
  }

  const closeGoalModal = () => {
    setGoalModalOpen(false)
    setOpenGoalId(null)
    setScrollCommentsOnOpen(false)
    // If opened via /feed?goalId=..., go back
    try {
      const params = new URLSearchParams(location.search)
      if (params.get('goalId')) navigate(-1)
    } catch { }
  }


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify_center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-full mb-6 mx-auto w-24 h-24 flex items-center justify-center"
          >
            <Compass className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore WishTrail
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            Discover inspiring goals and connect with like-minded achievers
          </p>
          <a href="/auth" className="btn-primary text-lg px-8 py-3">
            Join the Community
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {!inNativeApp && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Feed</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activities.length > 0 ? `${activities.length} activities` : 'Stay connected'}
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchInitial(true)}
              disabled={loading}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
            >
              <RefreshCw className={`h-5 w-5 text-gray-700 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Stories bar: inspiring + trending goals */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Trending Goals
            </h2>
            {!storiesLoading && stories.length > 0 && (
              <button
                onClick={() => navigate('/discover?tab=goals')}
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center gap-1.5"
              >
                Explore All
                <ArrowRightCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm overflow-hidden">
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-12 py-1 items-start">
              {storiesLoading && (
                <div className="flex items-center gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="h-2.5 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {!storiesLoading && stories && stories.length > 0 && stories.slice(0, STORIES_LIMIT).map((g, idx) => (
                <button
                  key={g._id || idx}
                  onClick={() => g._id && openGoalModal(g._id)}
                  className="group relative shrink-0 w-16 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl p-1 -m-1 transition-all duration-200"
                  title={g.title}
                  aria-label={`Open goal ${g.title}`}
                >
                  <div className="flex flex-col items-center justify-start gap-1.5">
                    <div className={`relative h-14 w-14 rounded-full p-[2px] bg-gradient-to-br ${getCategoryGradient(g.category)} transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg`}>
                      <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 p-[2px]">
                        <img
                          src={g.user?.avatar || '/api/placeholder/48/48'}
                          alt={g.user?.name || 'User'}
                          className="h-full w-full rounded-full object-cover" 
                        />
                      </div>
                      {/* Hover overlay with user name */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-1">
                        <span className="text-[9px] font-medium text-white truncate px-1.5 max-w-full drop-shadow">
                          {g.user?.name || 'User'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full text-center px-0.5">
                      <div className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {g.title}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {/* Explore shortcut - always visible */}
              {!storiesLoading && (
                <button
                  onClick={() => navigate('/discover?tab=discover&mode=goals')}
                  className="group shrink-0 w-16 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl p-1 -m-1 transition-all duration-200"
                  title="Explore more goals"
                  aria-label="Explore more goals"
                >
                  <div className="flex flex-col items-center justify-start gap-1.5">
                    <div className="relative h-14 w-14 rounded-full p-[2px] bg-gradient-to-br from-primary-500 via-blue-500 to-cyan-400 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                      <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Compass className="h-6 w-6 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                      Explore
                    </div>
                  </div>
                </button>
              )}
            </div>
            {/* Fade gradient on right edge */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white dark:from-gray-800 via-white/80 dark:via-gray-800/80 to-transparent rounded-r-2xl" />
          </div>
        </div>

        {loading ? (
          <SkeletonList count={6} grid={false} avatar lines={4} />
        ) : activities.length > 0 ? (
          <>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 * index }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative overflow-visible"
                >
                  {/* Header with user info */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <img
                      src={activity?.user?.avatar || activity?.avatar || '/api/placeholder/48/48'}
                      alt={activity?.user?.name || activity?.name || 'User'}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer ring-2 ring-gray-100 dark:ring-gray-700 hover:ring-primary-500 transition-all"
                      onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                          onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
                        >
                          {activity?.user?.name || activity?.name || 'Unknown User'}
                        </button>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTimeAgo(activity.createdAt)}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getActivityText(activity)}
                      </div>
                    </div>

                    {/* Three dot menu */}
                    <div className="relative">
                      <button
                        data-activity-menu-btn="true"
                        onClick={(e) => { e.stopPropagation(); setOpenActivityMenuId(prev => prev === activity._id ? null : activity._id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {openActivityMenuId === activity._id && (
                        <div
                          data-activity-menu="true"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 overflow-hidden"
                        >
                          <button
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => { setReportTarget({ type: 'activity', id: activity._id, label: 'activity', username: activity?.user?.username || '', userId: activity?.user?._id || null }); setReportOpen(true); setOpenActivityMenuId(null); }}
                          >Report Activity</button>
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              onClick={async () => { try { await unfollowUser(activity.user._id); } catch { }; setOpenActivityMenuId(null); }}
                            >Unfollow User</button>
                          )}
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              onClick={() => { setBlockUserId(activity.user._id); setBlockUsername(activity?.user?.username || ''); setBlockOpen(true); setOpenActivityMenuId(null); }}
                            >Block User</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="px-4 pb-4">
                    <div 
                      className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600/50 transition-all group" 
                      onClick={() => openGoalModal(activity?.data?.goalId?._id)}
                    >
                      {(activity.type === 'goal_completed' || activity.type === 'goal_created' || activity.type === 'goal_activity' || 
                        activity.type === 'subgoal_added' || activity.type === 'subgoal_removed' || 
                        activity.type === 'subgoal_completed' || activity.type === 'subgoal_uncompleted' ||
                        activity.type === 'habit_added' || activity.type === 'habit_removed' || 
                        activity.type === 'habit_target_achieved') ? (
                        <>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {activity.data?.goalTitle || 'Goal Achievement'}
                              </h4>
                              {/* Show sub-goal/habit name for specific events */}
                              {(activity.type === 'subgoal_added' || activity.type === 'subgoal_removed' || 
                                activity.type === 'subgoal_completed' || activity.type === 'subgoal_uncompleted') && 
                                activity.data?.subGoalTitle && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">Sub-goal:</span> {activity.data.subGoalTitle}
                                </p>
                              )}
                              {(activity.type === 'habit_added' || activity.type === 'habit_removed' || 
                                activity.type === 'habit_target_achieved') && 
                                activity.data?.habitName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">Habit:</span> {activity.data.habitName}
                                </p>
                              )}
                            </div>
                            {(activity.type === 'goal_completed' || (activity.type === 'goal_activity' && activity.data?.isCompleted)) && (
                              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {activity.type === 'subgoal_completed' && (
                              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {(activity.type === 'subgoal_removed' || activity.type === 'habit_removed') && (
                              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            )}
                            {activity.type === 'habit_target_achieved' && (
                              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {activity.data?.goalCategory && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(activity.data.goalCategory)} shadow-sm`}>
                              {activity.data.goalCategory}
                            </span>
                          )}
                          {/* Shared note/image when public */}
                          {activity.isPublic && (() => {
                            const sharedNote = activity?.data?.metadata?.completionNote || activity?.data?.completionNote || ''
                            const sharedImage = activity?.data?.metadata?.completionAttachmentUrl || activity?.data?.completionAttachmentUrl || ''
                            if (!sharedNote && !sharedImage) return null
                            return (
                              <div className="mt-3 space-y-3">
                                {sharedImage && (
                                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <img
                                      src={sharedImage}
                                      alt="Completion attachment"
                                      className="w-full max-h-96 object-cover hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                )}
                                {sharedNote && (
                                  <div className="bg-white/90 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-600 backdrop-blur-sm">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                      {sharedNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* Show subgoal progress for goal_activity type */}
                          {activity.type === 'goal_activity' && activity.data?.subGoalsCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">Subgoals</span>
                                <span className="font-semibold text-primary-600 dark:text-primary-400">
                                  {activity.data.completedSubGoalsCount || 0} / {activity.data.subGoalsCount}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500"
                                  style={{ 
                                    width: `${activity.data.subGoalsCount > 0 ? (activity.data.completedSubGoalsCount / activity.data.subGoalsCount * 100) : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )
                        : activity.type === 'streak_milestone' ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
                                <span className="text-xl">🔥</span>
                              </div>
                              <span className="text-gray-900 dark:text-white font-semibold">
                                Achieved a {activity.data?.streakCount || 0} day streak!
                              </span>
                            </div>
                          </div>
                        ) : activity.type === 'achievement_earned' ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                                <span className="text-xl">🏆</span>
                              </div>
                              <span className="text-gray-900 dark:text-white font-semibold">
                                Earned "{activity.data?.achievementName || 'achievement'}" badge
                              </span>
                            </div>
                          </div>
                        ) : (
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Activity Update
                          </h4>
                        )}
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActivityLikeOptimistic(activity._id); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activity.isLiked ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        disabled={!!likePending[activity._id]}
                      >
                        <Heart className={`h-4 w-4 ${activity.isLiked ? 'fill-current' : ''}`} />
                        <span>{activity.likeCount || 0}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (isMobile) { setCommentsOpenActivityId(activity._id); } else { setScrollCommentsOnOpen(true); openGoalModal(activity?.data?.goalId?._id); } }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{(activity.commentCount || 0)}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const gid = activity?.data?.goalId?._id || activity?.data?.goalId;
                            const url = gid ? `${window.location.origin}/feed?goalId=${gid}` : window.location.href;
                            if (isMobile) {
                              shareUrlRef.current = url
                              setShareSheetOpen(true)
                            } else {
                              Promise.resolve(navigator.clipboard.writeText(url))
                                .then(() => { try { window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } })); } catch { } })
                                .catch(() => { })
                            }
                          } catch { }
                        }} 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        title="Share"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div ref={activitiesSentinelRef} className="h-10" />
            {loadingMoreActivities && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-500 border-t-transparent" />
              </div>
            )}
            {!activitiesHasMore && activities.length > 0 && (
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You're all caught up!
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-4">
              <Activity className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No activities yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Follow some users to see their goal completions and achievements here!
            </p>
            <button
              onClick={() => navigate('/discover?tab=users')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium hover:from-primary-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              <Compass className="h-5 w-5" />
              Discover Users
            </button>
          </div>
        )}

        <Suspense fallback={null}><ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetLabel={reportTarget.label}
          onSubmit={async ({ reason, description }) => {
            await report({ targetType: reportTarget.type, targetId: reportTarget.id, reason, description });
            // After reporting, offer to block the user
            const uid = reportTarget.userId || null;
            if (uid) { setBlockUserId(uid); setBlockUsername(reportTarget.username || ''); setBlockOpen(true); }
            setReportOpen(false);
          }}
          onReportAndBlock={reportTarget.type === 'user' ? async () => { if (reportTarget.id) { await blockUser(reportTarget.id); } } : undefined}
        /></Suspense>
        <Suspense fallback={null}><BlockModal
          isOpen={blockOpen}
          onClose={() => setBlockOpen(false)}
          username={blockUsername || ''}
          onConfirm={async () => { if (blockUserId) { await blockUser(blockUserId); setBlockOpen(false); } }}
        /></Suspense>

        {/* Activity Comments Bottom Sheet */}
        <Suspense fallback={null}><ActivityCommentsModal
          isOpen={!!commentsOpenActivityId}
          onClose={() => setCommentsOpenActivityId(null)}
          activity={{ _id: commentsOpenActivityId }}
        /></Suspense>
        {/* Share Sheet (mobile) */}
        <Suspense fallback={null}><ShareSheet
          isOpen={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          url={shareUrlRef.current}
          title="WishTrail Goal"
        /></Suspense>
      </div>
      {/* Goal Details Modal (with timeline) */}
      {goalModalOpen && (
        <Suspense fallback={null}><GoalDetailsModal
          isOpen={goalModalOpen}
          goalId={openGoalId}
          autoOpenComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        /></Suspense>
      )}
    </div>
  )
}

export default FeedPage


