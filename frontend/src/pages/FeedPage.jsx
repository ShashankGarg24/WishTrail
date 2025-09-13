import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, Heart, MessageCircle, RefreshCw, Compass, ArrowRightCircle } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { activitiesAPI } from '../services/api'
import SkeletonList from '../components/loader/SkeletonList'
import ActivityCommentsModal from '../components/ActivityCommentsModal'
import ReportModal from '../components/ReportModal'
import BlockModal from '../components/BlockModal'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const FeedPage = () => {
  const navigate = useNavigate()
  const { goalId } = useParams()

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
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState({ type: null, id: null, label: '' })
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockUserId, setBlockUserId] = useState(null)

  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalModalData, setGoalModalData] = useState(null)
  const [goalModalLoading, setGoalModalLoading] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [goalComments, setGoalComments] = useState([])
  const [goalCommentsPagination, setGoalCommentsPagination] = useState(null)
  const [goalCommentsLoading, setGoalCommentsLoading] = useState(false)
  const [goalCommentText, setGoalCommentText] = useState('')
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false);
  const rightPanelScrollRef = useRef(null)
  const commentsAnchorRef = useRef(null)
  const activitiesSentinelRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false);
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null);

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
    if (goalId) {
      openGoalModal(goalId)
    }
  }, [goalId])

  // Track viewport for mobile/desktop behaviors
  useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  useEffect(() => {
    if (goalModalOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [goalModalOpen])

  useEffect(() => {
    if (goalModalOpen && goalModalData && scrollCommentsOnOpen) {
      openGoalCommentsForModal()
      setScrollCommentsOnOpen(false)
    }
  }, [goalModalOpen, goalModalData, scrollCommentsOnOpen])

  const fetchInitial = async () => {
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
        const { goals } = await getTrendingGoals(params)
        setStories((goals || []).slice(0, STORIES_LIMIT))
      } catch (_) {
        setStories([])
      } finally {
        setStoriesLoading(false)
      }

      setActivitiesPage(1)
      setActivitiesHasMore(true)
      const activitiesData = await getActivityFeed({ page: 1, limit: ACTIVITIES_PAGE_SIZE })
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
    switch(activity.type) {
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
    switch(category) {
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

  const openGoalModal = async (goalId) => {
    if (!goalId) return;
    try {
      // Open immediately and show loading spinner
      setGoalModalLoading(true);
      setGoalModalOpen(true);
      setGoalModalData(null);
      const resp = await useApiStore.getState().getGoalPost(goalId);
      if (resp?.success) {
        setGoalModalData(resp.data);
        // Do not change URL when opening from Explore; keep deep-link support only when URL already has goalId
        // Preload comments if activityId present
        const aid = resp?.data?.social?.activityId;
        if (aid) {
          try {
            setGoalCommentsLoading(true);
            const r = await activitiesAPI.getComments(aid, { page: 1, limit: 20 });
            const comments = r?.data?.data?.comments || [];
            const pagination = r?.data?.data?.pagination || null;
            setGoalComments(comments);
            setGoalCommentsPagination(pagination);
          } catch (_) { setGoalComments([]); setGoalCommentsPagination(null); setShowComments(false); }
          finally { setGoalCommentsLoading(false); }
        } else {
          setGoalComments([]);
          setGoalCommentsPagination(null);
        }
      }
    } catch (_) {
    } finally {
      setGoalModalLoading(false);
    }
  };
  const closeGoalModal = () => {
    setGoalModalOpen(false); setGoalModalData(null);
    setDetailsExpanded(false);
    // If opened via /goal/:goalId, go back to previous page
    try { if (goalId) navigate(-1); } catch (_) {}
  };

  const openGoalCommentsForModal = () => {
    const aid = goalModalData?.social?.activityId;
    if (!aid) return;
    if (isMobile) {
      setCommentsOpenActivityId(aid);
      return;
    }
    // Scroll the embedded comments into view inside the modal (desktop)
    setTimeout(() => {
      try {
        const scroller = rightPanelScrollRef.current;
        const anchor = commentsAnchorRef.current;
        if (scroller && anchor) {
          const top = anchor.offsetTop - 8;
          scroller.scrollTo({ top, behavior: 'smooth' });
        }
      } catch (_) {}
    }, 0);
  };

  const addGoalComment = async () => {
    try {
      const aid = goalModalData?.social?.activityId
      const text = goalCommentText.trim()
      if (!aid || !text) return
      const res = await activitiesAPI.addComment(aid, { text })
      const newComment = res?.data?.data?.comment
      if (newComment) setGoalComments((prev) => [newComment, ...(prev || [])])
      setGoalCommentText('')
    } catch (_) {}
  }


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Activity className="h-6 w-6 mr-2 text-green-500" />
            Feed
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInitial()}
              aria-label="Refresh"
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stories bar: inspiring + trending goals */}
        <div className="mb-6">
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-12 items-start">
              {/* Explore pill at the end (but visually kept in view with sticky gradient) */}
              {storiesLoading && (
                <div className="flex items-center gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                      <div className="h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {!storiesLoading && stories && stories.length > 0 && stories.slice(0, STORIES_LIMIT).map((g, idx) => (
                <button
                  key={g._id || idx}
                  onClick={() => g._id && openGoalModal(g._id)}
                  className="group relative shrink-0 w-20 focus:outline-none flex flex-col items-center justify-start"
                  title={g.title}
                  aria-label={`Open goal ${g.title}`}
                >
                  <div className={`relative mx-auto h-16 w-16 rounded-full p-[2px] bg-gradient-to-br ${getCategoryGradient(g.category)} transition-transform duration-200 group-hover:scale-105 mb-1`}>
                    <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
                      <img src={g.user?.avatar || '/api/placeholder/40/40'} className="h-full w-full rounded-full object-cover" />
                    </div>
                    {typeof g.likeCount === 'number' && g.likeCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-[2px] rounded-full text-[10px] font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow border border-gray-200 dark:border-gray-800">
                        ❤️ {g.likeCount}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 w-full text-center">
                    <div className="h-[28px] overflow-hidden leading-[14px]">
                      <div className="text-[11px] text-gray-800 dark:text-gray-200 leading-[14px] line-clamp-2">
                        {g.title}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {g.category}
                    </div>
                  </div>
                </button>
              ))}
              {/* Explore shortcut */}
              <button
                onClick={() => navigate('/discover?tab=discover&mode=goals')}
                className="group shrink-0 w-20 focus:outline-none"
                title="Explore goals"
                aria-label="Explore goals"
              >
                <div className="relative mx-auto h-16 w-16 rounded-full p-[2px] bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 transition-transform duration-200 group-hover:scale-105">
                  <div className="h-full w-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                    <ArrowRightCircle className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-center text-blue-600 dark:text-blue-300 font-medium">Explore</div>
              </button>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white/90 dark:from-gray-900/90 to-transparent rounded-r-2xl" />
          </div>
          {stories && stories.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Inspiring for you • updates hourly</div>
          )}
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
                      <div className="flex items-center gap-2">
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
-                                 <div className="mb-2 min-h-[56px] flex flex-col justify-start">
                                   <div className="font-semibold text-gray-900 dark:text-white text-base leading-snug line-clamp-1">
                                     {activity.data?.goalTitle || 'Goal Achievement'}
                                   </div>
                                   {activity.data?.goalCategory && (
                                     <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data.goalCategory)}`}>
                                       {activity.data.goalCategory}
                                     </span>
                                   )}
                                 </div>
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
                                              onClick={() => openLightbox(sharedImage)}
                                            />
                                          </div>
                                        )}
                                        {sharedNote && (
                                          <div className="bg-white/80 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
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
                              onClick={(e) => { e.stopPropagation(); if (isMobile) { setCommentsOpenActivityId(activity._id); } else { setScrollCommentsOnOpen(true); } }}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700`}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{(activity.commentCount || 0)}</span>
                            </button>
                           </div>
                         </div>

                  <div className="absolute right-2 top-2 z-30">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenActivityMenuId(prev => prev === activity._id ? null : activity._id); }}
                        className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >⋯</button>
                      {openActivityMenuId === activity._id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30"
                        >
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => { setReportTarget({ type: 'activity', id: activity._id, label: 'activity' }); setReportOpen(true); setOpenActivityMenuId(null); }}
                          >Report</button>
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={async () => { try { await unfollowUser(activity.user._id); } catch {} ; setOpenActivityMenuId(null); }}
                            >Unfollow user</button>
                          )}
                          {activity.user?._id && (
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg_gray-100 dark:hover:bg-gray-700"
                              onClick={() => { setBlockUserId(activity.user._id); setBlockOpen(true); setOpenActivityMenuId(null); }}
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

        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetLabel={reportTarget.label}
          onSubmit={async ({ reason, description }) => { await report({ targetType: reportTarget.type, targetId: reportTarget.id, reason, description }); }}
          onReportAndBlock={reportTarget.type === 'user' ? async () => { if (reportTarget.id) { await blockUser(reportTarget.id); } } : undefined}
        />
        <BlockModal
          isOpen={blockOpen}
          onClose={() => setBlockOpen(false)}
          username={''}
          onConfirm={async () => { if (blockUserId) { await blockUser(blockUserId); setBlockOpen(false); } }}
        />

        {/* Activity Comments Bottom Sheet */}
        <ActivityCommentsModal
          isOpen={!!commentsOpenActivityId}
          onClose={() => setCommentsOpenActivityId(null)}
          activity={{ _id: commentsOpenActivityId }}
        />

        {/* Goal Post Modal */}
        {goalModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closeGoalModal} />
            <div className={`relative w-full ${(!goalModalData?.share?.image) ? 'max-w-3xl' : 'max-w-6xl'} mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'} border border-gray-200 dark:border-gray-800 max-h-[85vh]`}> 
              {goalModalLoading || !goalModalData ? (
                <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                goalModalData?.share?.image ? (
                  <div className="grid grid-cols-1 md:[grid-template-columns:minmax(0,1fr)_420px] items-stretch min-h-0">
                    {/* Left: Media */}
                    <div className="bg-black flex items-center justify-center min-h-[65vh] h-[65vh] md:min-h-[520px]">
                      <img src={goalModalData.share.image} alt="Completion" className="h-full w-auto max-w-full object-contain" />
                    </div>
                    {/* Right: Details with toggleable comments */}
                    <div className="flex flex-col md:w-[420px] md:flex-shrink-0 min-h-[320px] md:min-h-[520px] md:max-h-[85vh] min-h-0">
                      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                        <img src={goalModalData?.user?.avatar || '/api/placeholder/40/40'} className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goalModalData?.user?.name}</div>
                          {goalModalData?.user?.username && (<div className="text-xs text-gray-500">@{goalModalData.user.username}</div>)}
                        </div>
                        <button onClick={closeGoalModal} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                      </div>
                      <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 ${isMobile ? '' : 'overflow-auto'} px-6 pb-0`}>
                        <div className="py-6 space-y-4">
                          <div>
                            <div className="h-1.5 w-14 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(147,197,253,0.8))' }} />
                            <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{goalModalData?.goal?.category}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Title</div>
                            <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{goalModalData?.goal?.title}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Description</div>
                            <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-5'}`}>{goalModalData?.goal?.description || '—'}</div>
                            {String(goalModalData?.goal?.description || '').length > 200 && (
                              <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500">Completed</div>
                              <div className="text-gray-800 dark:text-gray-200">{goalModalData?.goal?.completedAt ? new Date(goalModalData.goal.completedAt).toLocaleString() : '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Points</div>
                              <div className="text-gray-800 dark:text-gray-200">{goalModalData?.goal?.pointsEarned ?? 0}</div>
                            </div>
                          </div>
                          {goalModalData?.share?.note && (
                            <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 mb-1">Completion note</div>
                              <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${detailsExpanded ? '' : 'line-clamp-6'}`}>{goalModalData.share.note}</div>
                              {String(goalModalData.share.note || '').length > 240 && (
                                <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                              )}
                            </div>
                          )}
                        </div>
                        {!isMobile && (
                          <div className="pb-6">
                            <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800" />
                            {goalModalData?.social?.activityId ? (
                              <ActivityCommentsModal embedded activity={{ _id: goalModalData.social.activityId, commentCount: goalModalData?.social?.commentCount }} />
                            ) : (
                              <div className="text-sm text-gray-500 py-4">Comments unavailable</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                        <div className="text-sm text-gray-700 dark:text-gray-300">❤️ {goalModalData?.social?.likeCount || 0}</div>
                        <button onClick={openGoalCommentsForModal} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">💬 {goalModalData?.social?.commentCount || 0}</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col min-h-[320px] md:min-h-[520px] md:max-w-[420px] md:mx-auto md:max-h-[85vh] min-h-0">
                    <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                      <img src={goalModalData?.user?.avatar || '/api/placeholder/40/40'} className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goalModalData?.user?.name}</div>
                        {goalModalData?.user?.username && (<div className="text-xs text-gray-500">@{goalModalData.user.username}</div>)}
                      </div>
                      <button onClick={closeGoalModal} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                    </div>
                    <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 ${isMobile ? '' : 'overflow-auto'}` }>
                      <div className="p-6 space-y-4">
                        <div>
                          <div className="h-1.5 w-14 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(147,197,253,0.8))' }} />
                          <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{goalModalData?.goal?.category}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Title</div>
                          <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{goalModalData?.goal?.title}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Description</div>
                          <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>{goalModalData?.goal?.description || '—'}</div>
                          {String(goalModalData?.goal?.description || '').length > 200 && (
                            <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Completed</div>
                            <div className="text-gray-800 dark:text-gray-200">{goalModalData?.goal?.completedAt ? new Date(goalModalData.goal.completedAt).toLocaleString() : '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Points</div>
                            <div className="text-gray-800 dark:text-gray-200">{goalModalData?.goal?.pointsEarned ?? 0}</div>
                          </div>
                        </div>
                      </div>
                      {!isMobile && (
                        <div ref={commentsAnchorRef} className="px-6 pb-6">
                          {goalModalData?.social?.activityId ? (
                            <ActivityCommentsModal embedded activity={{ _id: goalModalData.social.activityId, commentCount: goalModalData?.social?.commentCount }} />
                          ) : (
                            <div className="text-sm text-gray-500">Comments unavailable</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                      <div className="text-sm text-gray-700 dark:text-gray-300">❤️ {goalModalData?.social?.likeCount || 0}</div>
                      <button onClick={openGoalCommentsForModal} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">💬 {goalModalData?.social?.commentCount || 0}</button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedPage


