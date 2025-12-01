import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, Heart, MessageCircle, RefreshCw, Compass, ArrowRightCircle, Send, Newspaper } from 'lucide-react'
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
    initializeFollowingStatus
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
    initializeFollowingStatus()
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

  // No-op: comments are handled inside GoalPostModal now

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
      case 'goal_completed':
        return 'completed a goal'
      case 'goal_created':
        return 'created a new goal'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!inNativeApp && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Newspaper className="h-6 w-6 mr-2 text-green-500" />
              Feed
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchInitial(true)}
                aria-label="Refresh"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Stories bar: inspiring + trending goals */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="text-lg">🌟</span>
              Trending Goals
            </h3>
            {!storiesLoading && stories.length > 0 && (
              <button
                onClick={() => navigate('/discover?tab=goals')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                See All
                <ArrowRightCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm overflow-hidden">
            <div className="flex gap-8 overflow-x-auto no-scrollbar pr-12 pl-3 py-2 items-start pb-1">
              {storiesLoading && (
                <div className="flex items-center gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                      <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {!storiesLoading && stories && stories.length > 0 && stories.slice(0, STORIES_LIMIT).map((g, idx) => (
                <button
                  key={g._id || idx}
                  onClick={() => g._id && openGoalModal(g._id)}
                  className="group relative shrink-0 w-[72px] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 -m-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  title={g.title}
                  aria-label={`Open goal ${g.title}`}
                >
                  <div className="flex flex-col items-center justify-start gap-2">
                    <div className={`relative h-16 w-16 rounded-full p-[3px] bg-gradient-to-br ${getCategoryGradient(g.category)} transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg`}>
                      <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 p-[3px]">
                        <img
                          src={g.user?.avatar || '/api/placeholder/40/40'}
                          alt={g.user?.name || 'User'}
                          className="h-full w-full rounded-full object-cover" 
                        />
                      </div>
                      {/* Hover overlay with user name */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-1.5">
                        <span className="text-[9px] font-medium text-white truncate px-2 max-w-full">
                          {g.user?.name || 'User'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full text-center">
                      <div className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                  className="group shrink-0 w-[72px] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 -m-2 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Explore more goals"
                  aria-label="Explore more goals"
                >
                  <div className="flex flex-col items-center justify-start gap-2">
                    <div className="relative h-16 w-16 rounded-full p-[3px] bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg">
                      <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                        <ArrowRightCircle className="h-7 w-7 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      Explore
                    </div>
                  </div>
                </button>
              )}
            </div>
            {/* Fade gradient on right edge */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white dark:from-gray-900 via-white/80 dark:via-gray-900/80 to-transparent rounded-r-2xl" />
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
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-visible"
                >
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <img
                      src={activity?.user?.avatar || activity?.avatar || '/api/placeholder/48/48'}
                      alt={activity?.user?.name || activity?.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items_center gap-2">
                        <button
                          className="font-semibold text-gray-900 dark:text-white hover:text-blue-500 truncate"
                          onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
                        >
                          {activity?.user?.name || activity?.name || 'Unknown User'}
                        </button>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.createdAt)}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getActivityText(activity)}
                      </div>
                    </div>
                  </div>

                  {/* Media/Content */}
                  <div className="px-4 pb-4 cursor-pointer" onClick={() => openGoalModal(activity?.data?.goalId?._id)}>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                      {(activity.type === 'goal_completed' || activity.type === 'goal_created') ? (
                        <>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {activity.data?.goalTitle || 'Goal Achievement'}
                          </h4>
                          {activity.data?.goalCategory && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data.goalCategory)}`}>
                              {activity.data.goalCategory}
                            </span>
                          )}
                          {/* Shared note/image when public */}
                          {activity.isPublic && (() => {
                            const sharedNote = activity?.data?.metadata?.completionNote || activity?.data?.completionNote || ''
                            const sharedImage = activity?.data?.metadata?.completionAttachmentUrl || activity?.data?.completionAttachmentUrl || ''
                            if (!sharedNote && !sharedImage) return null
                            return (
                              <div className="mt-3 space-y-3 cursorcursor-pointer" onClick={() => openGoalModal(activity?.data?.goalId?._id)}>
                                {sharedImage && (
                                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                    <img
                                      src={sharedImage}
                                      alt="Completion attachment"
                                      className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200 cursor-zoom-in"
                                    />
                                  </div>
                                )}
                                {sharedNote && (
                                  <div className="bg-white/80 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                    <p className="text_sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                      {sharedNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </>
                      )
                        : activity.type === 'streak_milestone' ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                              Achieved a {activity.data?.streakCount || 0} day streak!
                            </span>
                            <span className="text-2xl">🔥</span>
                          </div>
                        ) : activity.type === 'level_up' ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                              Leveled up to {activity.data?.newLevel || 'next level'}
                            </span>
                            <span className="text-2xl">⬆️</span>
                          </div>
                        ) : activity.type === 'achievement_earned' ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                              Earned "{activity.data?.achievementName || 'achievement'}" badge
                            </span>
                            <span className="text-2xl">🏆</span>
                          </div>
                        ) : (
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Activity Update
                          </h4>
                        )}
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-4 pt-2 px-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActivityLikeOptimistic(activity._id); }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${activity.isLiked ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        disabled={!!likePending[activity._id]}
                      >
                        <Heart className={`h-4 w-4 ${activity.isLiked ? 'fill-current' : ''}`} />
                        <span>{activity.likeCount || 0}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (isMobile) { setCommentsOpenActivityId(activity._id); } else { setScrollCommentsOnOpen(true); openGoalModal(activity?.data?.goalId?._id); } }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${scrollCommentsOnOpen ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      >
                        <MessageCircle className={`h-4 w-4 ${scrollCommentsOnOpen ? 'text-blue-600' : ''}`} />
                        <span>{(activity.commentCount || 0)}</span>
                      </button>
                      <button onClick={(e) => {
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
                      }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Send className="h-4 w-4 -rotate-80" />
                      </button>
                    </div>
                  </div>

                  <div className="absolute right-2 top-2 z-30">
                    <div className="relative">
                      <button
                        data-activity-menu-btn="true"
                        onClick={(e) => { e.stopPropagation(); setOpenActivityMenuId(prev => prev === activity._id ? null : activity._id); }}
                        className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >⋯</button>
                      {openActivityMenuId === activity._id && (
                        <div
                          data-activity-menu="true"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30"
                        >
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => { setReportTarget({ type: 'activity', id: activity._id, label: 'activity', username: activity?.user?.username || '', userId: activity?.user?._id || null }); setReportOpen(true); setOpenActivityMenuId(null); }}
                          >Report</button>
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={async () => { try { await unfollowUser(activity.user._id); } catch { }; setOpenActivityMenuId(null); }}
                            >Unfollow user</button>
                          )}
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg_gray-100 dark:hover:bg-gray-700"
                              onClick={() => { setBlockUserId(activity.user._id); setBlockUsername(activity?.user?.username || ''); setBlockOpen(true); setOpenActivityMenuId(null); }}
                            >Block user</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div ref={activitiesSentinelRef} className="h-10" />
            {loadingMoreActivities && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              </div>
            )}
            {!activitiesHasMore && activities.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-4">No more activities</div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No recent activity from friends.</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Follow some users to see their goal completions here!</p>
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


