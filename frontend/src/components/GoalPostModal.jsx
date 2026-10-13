import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Heart, MessageCircle, Share2, TrendingUp, ZoomIn, ZoomOut, RotateCcw, MoreVertical, Bell, UserPlus } from 'lucide-react';
import useApiStore from '../store/apiStore';
import { goalsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import GoalHero from './GoalHero';

const ActivityCommentsModal = lazy(() => import('./ActivityCommentsModal'));
const ShareSheet = lazy(() => import('./ShareSheet'));
const ReportModal = lazy(() => import('./ReportModal'));
const MIN_DESKTOP_IMAGE_ZOOM = 1;
const MAX_DESKTOP_IMAGE_ZOOM = 3;
const DESKTOP_IMAGE_ZOOM_STEP = 0.25;
const GOAL_POST_UPDATES_PAGE_SIZE = 5;
const DESCRIPTION_CLAMP_CLASS = 'line-clamp-4';
const COMPLETION_NOTE_CLAMP_CLASS = 'line-clamp-4';

const formatPostAge = (value) => {
  if (!value) return 'Recently';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Recently';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(new Date(timestamp).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
  });
};

const GoalPostModal = ({ isOpen, onClose, goalId, openWithComments = false, onToggleComments }) => {
  const navigate = useNavigate();
  const currentUser = useApiStore(state => state.user);
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isGoalUpdatesExpanded, setIsGoalUpdatesExpanded] = useState(false);
  const [hasLoadedGoalUpdates, setHasLoadedGoalUpdates] = useState(false);
  const [liking, setLiking] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [goalUpdates, setGoalUpdates] = useState([]);
  const [goalUpdatesOffset, setGoalUpdatesOffset] = useState(0);
  const [goalUpdatesHasMore, setGoalUpdatesHasMore] = useState(false);
  const [goalUpdatesLoading, setGoalUpdatesLoading] = useState(false);
  const shareUrlRef = useRef('');
  const goalLoadRequest = useRef(0);
  const desktopImageContainerRef = useRef(null);
  const descriptionTextRef = useRef(null);
  const completionNoteTextRef = useRef(null);
  const [desktopImageZoom, setDesktopImageZoom] = useState(MIN_DESKTOP_IMAGE_ZOOM);
  const [expandedText, setExpandedText] = useState({
    description: false,
    completionNote: false
  });
  const [textIsTruncatable, setTextIsTruncatable] = useState({
    description: false,
    completionNote: false
  });

  useEffect(() => {
    if (isOpen && goalId) {
      loadGoalData();
    }
    return () => { goalLoadRequest.current += 1; };
  }, [isOpen, goalId]);

  // Separate effect to handle openWithComments changes without reloading data
  useEffect(() => {
    if (isOpen) {
      setShowComments(openWithComments);
      setPostMenuOpen(false);
    }
  }, [isOpen, openWithComments]);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      document.documentElement.style.overflow = 'hidden';
    } else {
      unlockBodyScroll();
      document.documentElement.style.overflow = '';
    }
    return () => {
      unlockBodyScroll();
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDesktopImageZoom(MIN_DESKTOP_IMAGE_ZOOM);
    }

    setExpandedText({ description: false, completionNote: false });
    setTextIsTruncatable({ description: false, completionNote: false });
  }, [isOpen, goalId]);

  useEffect(() => {
    if (!isOpen || !goalData) return;

    const measureOverflow = () => {
      const descriptionOverflow = descriptionTextRef.current
        ? descriptionTextRef.current.scrollHeight > descriptionTextRef.current.clientHeight + 1
        : false;
      const completionNoteOverflow = completionNoteTextRef.current
        ? completionNoteTextRef.current.scrollHeight > completionNoteTextRef.current.clientHeight + 1
        : false;

      setTextIsTruncatable({
        description: descriptionOverflow,
        completionNote: completionNoteOverflow
      });
    };

    const frameId = requestAnimationFrame(measureOverflow);
    window.addEventListener('resize', measureOverflow);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measureOverflow);
    };
  }, [
    isOpen,
    goalData?.goal?.description,
    goalData?.completion?.note,
    goalData?.share?.note
  ]);

  const loadGoalData = async () => {
    const request = ++goalLoadRequest.current;
    setLoading(true);
    setGoalData(null);
    setTimeline(null);
    setIsTimelineExpanded(false);
    
    try {
      const response = await useApiStore.getState().getGoalPost(goalId, { force: true });
      if (request !== goalLoadRequest.current) return;
      if (response?.success && response?.data) {
        setGoalData(response.data);
        setGoalUpdates([]);
        setGoalUpdatesOffset(0);
        setGoalUpdatesHasMore(false);
        setIsGoalUpdatesExpanded(false);
        setHasLoadedGoalUpdates(false);
      } else {
        toast.error(response?.error || 'This goal is no longer available.');
        onClose();
      }
    } catch (error) {
      if (request !== goalLoadRequest.current) return;
      console.error('Failed to load goal data:', error);
      toast.error(error?.response?.status === 404 ? 'This goal is no longer available.' : 'Unable to load this goal. Please try again.');
      onClose();
    } finally {
      if (request === goalLoadRequest.current) setLoading(false);
    }
  };

  const loadGoalUpdates = async ({ reset = false } = {}) => {
    if (!goalId) return;
    if (goalUpdatesLoading) return;
    if (!reset && !goalUpdatesHasMore) return;

    const offset = reset ? 0 : goalUpdatesOffset;

    setGoalUpdatesLoading(true);
    try {
      const res = await goalsAPI.getGoalUpdates(goalId, {
        limit: GOAL_POST_UPDATES_PAGE_SIZE,
        offset
      });

      const updates = res?.data?.data?.updates || [];
      const hasMore = res?.data?.data?.pagination?.hasMore === true;

      setGoalUpdates((prev) => (reset ? updates : [...prev, ...updates]));
      setGoalUpdatesOffset(offset + updates.length);
      setGoalUpdatesHasMore(hasMore);
    } catch (error) {
      console.error('Failed to load goal updates:', error);
      if (reset) {
        setGoalUpdates([]);
      }
      setGoalUpdatesHasMore(false);
    } finally {
      setGoalUpdatesLoading(false);
    }
  };

  const handleGoalUpdatesScroll = (event) => {
    if (!goalUpdatesHasMore || goalUpdatesLoading) return;

    const element = event.currentTarget;
    const threshold = 24;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;

    if (isNearBottom) {
      loadGoalUpdates();
    }
  };

  const toggleGoalUpdates = async () => {
    if (isGoalUpdatesExpanded) {
      setIsGoalUpdatesExpanded(false);
      return;
    }

    setIsGoalUpdatesExpanded(true);

    if (!hasLoadedGoalUpdates && !goalUpdatesLoading) {
      await loadGoalUpdates({ reset: true });
      setHasLoadedGoalUpdates(true);
    }
  };

  const toggleTimeline = async () => {
    if (isTimelineExpanded) {
      setIsTimelineExpanded(false);
      return;
    }

    // If timeline not loaded yet, fetch it
    if (!timeline && !timelineLoading) {
      setTimelineLoading(true);
      try {
        const response = await useApiStore.getState().getGoalTimeline(goalId);
        if (response?.success && response?.data?.timeline) {
          setTimeline(response.data.timeline);
          setIsTimelineExpanded(true);
        }
      } catch (error) {
        console.error('Failed to load timeline:', error);
      } finally {
        setTimelineLoading(false);
      }
    } else {
      setIsTimelineExpanded(true);
    }
  };

  const getTimelineTitle = (item) => {
    if (item?.title) return item.title;
    if (item?.type === 'goal_created') return 'Goal Created';
    if (item?.type === 'goal_completed') return 'Goal Completed';
    if (item?.type === 'subgoal_completed') return 'Milestone Achieved';
    if (item?.type === 'goal_updated') return 'Goal Updated';
    return 'Activity';
  };

  const formatTimelineDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleLike = async () => {
    const activityId = goalData?.social?.activityId;
    if (!activityId || liking) return;

    const currentIsLiked = goalData?.social?.isLiked;
    const currentLikeCount = goalData?.social?.likeCount || 0;
    const newIsLiked = !currentIsLiked;
    const newLikeCount = currentIsLiked ? currentLikeCount - 1 : currentLikeCount + 1;

    // Optimistic update
    setGoalData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        social: {
          ...prev.social,
          isLiked: newIsLiked,
          likeCount: newLikeCount
        }
      };
    });

    setLiking(true);
    try {
      const result = await useApiStore.getState().likeActivity(activityId, newIsLiked);
      
      if (result?.success) {
        setGoalData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            social: {
              ...prev.social,
              isLiked: result.isLiked,
              likeCount: result.likeCount
            }
          };
        });
      } else {
        // Revert on failure
        setGoalData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            social: {
              ...prev.social,
              isLiked: currentIsLiked,
              likeCount: currentLikeCount
            }
          };
        });
      }
    } catch (error) {
      console.error('Failed to like:', error);
      // Revert on error
      setGoalData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          social: {
            ...prev.social,
            isLiked: currentIsLiked,
            likeCount: currentLikeCount
          }
        };
      });
    } finally {
      setLiking(false);
    }
  };

  const openComments = () => {
    const activityId = goalData?.social?.activityId;
    if (!activityId) return;
    if (isMobile) {
      setShowComments(prev => !prev);
      return;
    }
    // Toggle comments in desktop mode
    const newState = !showComments;
    setShowComments(newState);
    // Notify parent if toggle handler provided
    if (onToggleComments) {
      onToggleComments(newState);
    }
  };

  const copyPostLink = async () => {
    const url = `${window.location.origin}/feed?goalId=${goalId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard', { duration: 2000 });
    } catch {
      toast.error('Failed to copy link');
    }
    setPostMenuOpen(false);
  };

  const completionImageUrl = goalData?.completion?.attachmentUrl || goalData?.share?.attachmentUrl || goalData?.share?.image || '';
  const hasCompletionImage = Boolean(completionImageUrl);

  const updateDesktopImageZoom = (nextZoom) => {
    const container = desktopImageContainerRef.current;
    const clampedZoom = Math.min(MAX_DESKTOP_IMAGE_ZOOM, Math.max(MIN_DESKTOP_IMAGE_ZOOM, nextZoom));

    if (!container || clampedZoom === desktopImageZoom) {
      setDesktopImageZoom(clampedZoom);
      return;
    }

    const centerXRatio = container.scrollWidth > 0
      ? (container.scrollLeft + container.clientWidth / 2) / container.scrollWidth
      : 0.5;
    const centerYRatio = container.scrollHeight > 0
      ? (container.scrollTop + container.clientHeight / 2) / container.scrollHeight
      : 0.5;

    setDesktopImageZoom(clampedZoom);

    requestAnimationFrame(() => {
      const nextContainer = desktopImageContainerRef.current;
      if (!nextContainer) return;

      nextContainer.scrollTo({
        left: Math.max(0, centerXRatio * nextContainer.scrollWidth - nextContainer.clientWidth / 2),
        top: Math.max(0, centerYRatio * nextContainer.scrollHeight - nextContainer.clientHeight / 2),
        behavior: 'smooth'
      });
    });
  };

  const handleDesktopImageWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();
    const direction = e.deltaY < 0 ? DESKTOP_IMAGE_ZOOM_STEP : -DESKTOP_IMAGE_ZOOM_STEP;
    updateDesktopImageZoom(desktopImageZoom + direction);
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div key="goal-post-modal" className="goal-post-modal fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-0 md:p-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="goal-post-dialog relative flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 md:h-[90vh] md:rounded-2xl"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
            </div>
          ) : goalData ? (
            isMobile ? (
              <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-900">
                <header className="relative flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 px-3 dark:border-gray-800">
                  <button type="button" onClick={onClose} aria-label="Close post" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <button type="button" onClick={() => setPostMenuOpen(prev => !prev)} aria-label="Post options" aria-expanded={postMenuOpen} className="rounded-full p-2 text-gray-700 dark:text-gray-200">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <section className="px-4 pb-3 pt-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={goalData.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                        alt={goalData.user?.name || 'User'}
                        onClick={() => goalData.user?.username && navigate(`/profile/@${goalData.user.username}`)}
                        className="h-11 w-11 flex-shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                      />
                      <button type="button" onClick={() => goalData.user?.username && navigate(`/profile/@${goalData.user.username}`)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{goalData.user?.name || 'User'}</span>
                        <span className="block text-xs text-gray-500">{formatPostAge(goalData.completion?.completedAt || goalData.goal?.completedAt || goalData.goal?.createdAt)}</span>
                      </button>
                    </div>

                    <div className="mt-4 py-2">
                      {(goalData.goal?.isCompleted || goalData.goal?.completedAt) && (
                        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Completed a goal</p>
                      )}
                      <h2 className="text-[17px] font-extrabold leading-6 text-gray-950 dark:text-white">{goalData.goal?.title || 'Goal'} <span aria-hidden="true">🏃</span></h2>
                      {goalData.goal?.description && (
                        <div className="mt-5">
                          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</h4>
                          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                            <p ref={descriptionTextRef} className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300 ${expandedText.description ? '' : DESCRIPTION_CLAMP_CLASS}`}>{goalData.goal.description}</p>
                            {textIsTruncatable.description && <button type="button" onClick={() => setExpandedText(prev => ({ ...prev, description: !prev.description }))} className="mt-2 text-xs font-semibold text-[#4c99e6]">{expandedText.description ? 'Less' : 'More'}</button>}
                          </div>
                        </div>
                      )}
                      {(goalData.completion?.note || goalData.share?.note || goalData.goal?.completionNote) && (
                        <div className="mt-5">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Completion Note</h4>
                          <div className="rounded-lg border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                            <p ref={completionNoteTextRef} className={`whitespace-pre-wrap text-sm italic leading-relaxed text-gray-700 dark:text-gray-300 ${expandedText.completionNote ? '' : COMPLETION_NOTE_CLAMP_CLASS}`}>&quot;{goalData.completion?.note || goalData.share?.note || goalData.goal?.completionNote}&quot;</p>
                            {textIsTruncatable.completionNote && <button type="button" onClick={() => setExpandedText(prev => ({ ...prev, completionNote: !prev.completionNote }))} className="mt-2 text-xs font-semibold text-[#4c99e6]">{expandedText.completionNote ? 'Less' : 'More'}</button>}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {completionImageUrl && (
                    <button type="button" onClick={() => setImageViewerOpen(true)} className="block w-full bg-gray-100 dark:bg-gray-950" aria-label="Open image full screen">
                      <img src={completionImageUrl} alt="Goal completion" className="max-h-[52vh] w-full object-cover" />
                    </button>
                  )}

                  <section className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#4c99e6]" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Timeline</h3>
                      </div>
                      <button type="button" onClick={toggleTimeline} disabled={timelineLoading} className="text-xs font-semibold text-[#4c99e6] disabled:opacity-50">
                        {timelineLoading ? 'Loading...' : isTimelineExpanded ? 'Hide' : 'Show All'}
                      </button>
                    </div>
                    {isTimelineExpanded && (
                      <div className="mt-4 space-y-4">
                        {timeline?.length ? timeline.map((item, index, items) => (
                          <div key={item._id || index} className="flex gap-3">
                            <div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full bg-[#4c99e6]" />{index < items.length - 1 && <span className="mt-1 min-h-8 w-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />}</div>
                            <div className="min-w-0 flex-1 pb-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-gray-900 dark:text-white">{getTimelineTitle(item)}</p><span className="whitespace-nowrap text-xs text-gray-500">{formatTimelineDate(item.timestamp || item.createdAt || item.date)}</span></div>{item.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>}</div>
                          </div>
                        )) : <p className="py-3 text-center text-sm text-gray-500">No timeline events yet</p>}
                      </div>
                    )}
                  </section>

                  {showComments && <section className="px-4 py-4">
                    {goalData?.social?.activityId ? (
                      <Suspense fallback={<p className="py-5 text-center text-sm text-gray-500">Loading comments…</p>}>
                        <ActivityCommentsModal
                          embedded
                          composerTargetId="goal-post-mobile-composer"
                          activity={{ _id: goalData.social.activityId, commentCount: goalData?.social?.commentCount }}
                        />
                      </Suspense>
                    ) : (
                      <p className="py-5 text-center text-sm text-gray-500">Comments unavailable</p>
                    )}
                  </section>}
                </div>

                {showComments && goalData?.social?.activityId && (
                  <div id="goal-post-mobile-composer" className="flex-shrink-0 bg-white dark:bg-gray-900" />
                )}

                <div className="flex h-14 flex-shrink-0 items-center border-t border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-7">
                    <button type="button" onClick={handleLike} disabled={liking} aria-label={goalData?.social?.isLiked ? 'Unlike post' : 'Like post'} className={`flex items-center gap-1.5 text-sm font-semibold ${goalData?.social?.isLiked ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      <Heart className={`h-6 w-6 ${goalData?.social?.isLiked ? 'fill-current' : ''}`} /><span>{goalData?.social?.likeCount || 0}</span>
                    </button>
                    <button type="button" onClick={openComments} aria-label={showComments ? 'Close comments' : 'Open comments'} aria-expanded={showComments} className={`flex items-center gap-1.5 text-sm font-semibold ${showComments ? 'text-[#4c99e6]' : 'text-gray-700 dark:text-gray-200'}`}>
                      <MessageCircle className="h-6 w-6" /><span>{goalData?.social?.commentCount || 0}</span>
                    </button>
                    <button type="button" onClick={() => { shareUrlRef.current = `${window.location.origin}/feed?goalId=${goalId}`; setShareSheetOpen(true); }} aria-label="Share post" className="text-gray-700 dark:text-gray-200"><Share2 className="h-6 w-6" /></button>
                  </div>
                </div>

              </div>
            ) : (
            <div className={`goal-post-desktop flex ${hasCompletionImage ? 'flex-row' : 'flex-col'} h-full overflow-hidden`}>
              {hasCompletionImage && (
                <div className="hidden md:flex w-1/2 bg-gray-100 dark:bg-gray-900 p-4 overflow-hidden relative">
                  <div className="absolute top-6 right-6 z-10 flex items-center gap-2 rounded-full border border-white/70 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => updateDesktopImageZoom(desktopImageZoom - DESKTOP_IMAGE_ZOOM_STEP)}
                      disabled={desktopImageZoom <= MIN_DESKTOP_IMAGE_ZOOM}
                      className="rounded-full p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Zoom out image"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDesktopImageZoom(MIN_DESKTOP_IMAGE_ZOOM)}
                      disabled={desktopImageZoom === MIN_DESKTOP_IMAGE_ZOOM}
                      className="rounded-full p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Reset image zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDesktopImageZoom(desktopImageZoom + DESKTOP_IMAGE_ZOOM_STEP)}
                      disabled={desktopImageZoom >= MAX_DESKTOP_IMAGE_ZOOM}
                      className="rounded-full p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Zoom in image"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    ref={desktopImageContainerRef}
                    onWheel={handleDesktopImageWheel}
                    className="flex-1 overflow-auto scroll-smooth rounded-2xl"
                  >
                    <div
                      className="mx-auto flex min-h-full min-w-full items-center justify-center transition-all duration-300 ease-out"
                      style={{ width: `${desktopImageZoom * 100}%` }}
                    >
                      <img
                        src={completionImageUrl}
                        alt="Completion"
                        className="w-full h-auto rounded-xl object-contain shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Right Side - Content */}
              <div className={`${hasCompletionImage ? 'w-full md:w-1/2' : 'w-full'} flex flex-col h-full overflow-hidden`}>
                {/* Header */}
                <div className="goal-post-header p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={goalData.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                        alt={goalData.user?.name || 'User'}
                        onClick={() => {
                          if (goalData.user?.username) {
                            navigate(`/profile/@${goalData.user.username}`);
                          }
                        }}
                        className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                      />
                      <div>
                        <h3 
                          onClick={() => {
                            if (goalData.user?.username) {
                              navigate(`/profile/@${goalData.user.username}`);
                            }
                          }}
                          className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-[#4c99e6] transition-colors"
                        >
                          {goalData.user?.name || 'User'}
                        </h3>
                        {goalData.user?.username && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{goalData.user.username}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 md:hidden" /><X className="hidden w-6 h-6 md:block" />
                    </button>
                  </div>

                </div>

                {/* Content */}
                <div className={`goal-post-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 ${showComments ? 'pb-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                  <div>
                    <GoalHero goal={goalData.goal} />
                    {(goalData.completion?.completedAt || goalData.goal?.completedAt) && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        Completed: {new Date(goalData.completion?.completedAt || goalData.goal?.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {(() => {
                    const completionNote = goalData.completion?.note || goalData.share?.note;

                    return (
                      <>
                  {/* Description */}
                  {goalData.goal?.description && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Description
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p
                          ref={descriptionTextRef}
                          className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap ${expandedText.description ? '' : DESCRIPTION_CLAMP_CLASS}`}
                        >
                          {goalData.goal.description}
                        </p>
                        {textIsTruncatable.description && (
                          <button
                            type="button"
                            onClick={() => setExpandedText(prev => ({ ...prev, description: !prev.description }))}
                            className="mt-2 text-xs font-semibold text-[#4c99e6] hover:text-blue-600 transition-colors"
                          >
                            {expandedText.description ? 'Less' : 'More'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completion Note */}
                  {(goalData.completion?.note || goalData.share?.note) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Completion Note
                        </h4>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                        <p
                          ref={completionNoteTextRef}
                          className={`text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed whitespace-pre-wrap ${expandedText.completionNote ? '' : COMPLETION_NOTE_CLAMP_CLASS}`}
                        >
                          "{completionNote}"
                        </p>
                        {textIsTruncatable.completionNote && (
                          <button
                            type="button"
                            onClick={() => setExpandedText(prev => ({ ...prev, completionNote: !prev.completionNote }))}
                            className="mt-2 text-xs font-semibold text-[#4c99e6] hover:text-blue-600 transition-colors"
                          >
                            {expandedText.completionNote ? 'Less' : 'More'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                      </>
                    );
                  })()}

                  {/* Completion Image (inline for mobile or when left panel hidden) */}
                  {completionImageUrl && (isMobile || !hasCompletionImage) && (
                    <button type="button" onClick={() => setImageViewerOpen(true)} className="block w-full" aria-label="Open image full screen">
                      <img
                        src={completionImageUrl}
                        alt="Completion"
                        className="w-full rounded-lg"
                      />
                    </button>
                  )}

                  {/* Timeline */}
                  <div className="goal-post-timeline">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#4c99e6]" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Timeline
                        </h4>
                      </div>
                      <button 
                        onClick={toggleTimeline}
                        disabled={timelineLoading}
                        className="text-xs font-semibold text-[#4c99e6] hover:text-blue-600 transition-colors disabled:opacity-50"
                      >
                        {timelineLoading ? 'Loading...' : isTimelineExpanded ? 'Hide' : 'Show All'}
                      </button>
                    </div>

                    {isTimelineExpanded && timeline && timeline.length > 0 && (
                      <div className="space-y-4">
                        {timeline.map((item, index, arr) => (
                          <div key={item._id || index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-[#4c99e6]" />
                              {index < arr.length - 1 && (
                                <div className="w-0.5 h-full min-h-[40px] bg-gray-200 dark:bg-gray-700 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {getTimelineTitle(item)}
                                </h5>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {formatTimelineDate(item.timestamp || item.createdAt || item.date)}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isTimelineExpanded && timeline && timeline.length === 0 && (
                      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                        No timeline events yet
                      </div>
                    )}
                  </div>

                  {/* Goal Updates */}
                  {goalData.goal?.isUpdatesPublic && (
                    <div className="goal-post-updates">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-[#4c99e6]" />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Goal Updates
                          </h4>
                        </div>
                        <button
                          onClick={toggleGoalUpdates}
                          disabled={goalUpdatesLoading}
                          className="text-xs font-semibold text-[#4c99e6] hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          {goalUpdatesLoading && !isGoalUpdatesExpanded
                            ? 'Loading...'
                            : isGoalUpdatesExpanded
                            ? 'Hide'
                            : 'Show All'}
                        </button>
                      </div>

                      {isGoalUpdatesExpanded && (
                        <>
                          <div
                            className="max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-3 space-y-2"
                            onScroll={handleGoalUpdatesScroll}
                          >
                            {goalUpdates.map((update, index) => (
                              <div key={update.id || `${update.dateKey || update.createdAt || 'update'}-${index}`} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {new Date(update.dateKey || update.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  {update.emotion && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border text-[#4c99e6] border-[#4c99e64d] bg-[#4c99e61a]">
                                      {String(update.emotion).charAt(0).toUpperCase() + String(update.emotion).slice(1)}
                                    </span>
                                  )}
                                </div>
                                {update.text && (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {update.text}
                                  </p>
                                )}
                              </div>
                            ))}

                            {!goalUpdatesLoading && goalUpdates.length === 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">No public updates yet.</p>
                            )}
                          </div>

                          <div className="mt-2.5 flex justify-center">
                            {goalUpdatesLoading ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Loading updates...</p>
                            ) : goalUpdatesHasMore ? (
                              <button
                                type="button"
                                onClick={() => loadGoalUpdates()}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                Load more
                              </button>
                            ) : goalUpdates.length > 0 ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">All updates loaded</p>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Comments */}
                  {showComments && (
                    <div className="pb-4">
                      {goalData?.social?.activityId ? (
                        <Suspense fallback={null}>
                          <ActivityCommentsModal
                            embedded
                            composerTargetId="goal-post-desktop-composer"
                            activity={{
                              _id: goalData.social.activityId,
                              commentCount: goalData?.social?.commentCount
                            }}
                          />
                        </Suspense>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Comments unavailable</div>
                      )}
                    </div>
                  )}
                  </div>
                </div>

                {showComments && goalData?.social?.activityId && (
                  <div id="goal-post-desktop-composer" className="flex-shrink-0 bg-white dark:bg-gray-800" />
                )}

                {/* Footer */}
                <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Like */}
                      <button
                        onClick={handleLike}
                        disabled={liking}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            goalData?.social?.isLiked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="text-sm font-medium">{goalData?.social?.likeCount || 0}</span>
                      </button>

                      {/* Comments */}
                      <button 
                        onClick={openComments}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#4c99e6] transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{goalData?.social?.commentCount || 0}</span>
                      </button>
                    </div>

                    {/* Share */}
                    <button 
                      onClick={() => {
                        try {
                          const gid = goalId;
                          const url = gid ? `${window.location.origin}/feed?goalId=${gid}` : window.location.href;
                          if (isMobile) {
                            shareUrlRef.current = url;
                            setShareSheetOpen(true);
                          } else {
                            navigator.clipboard.writeText(url)
                              .then(() => {
                                toast.success('Link copied to clipboard', { duration: 2000 });
                              })
                              .catch(() => {
                                toast.error('Failed to copy link');
                              });
                          }
                        } catch { }
                      }}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#4c99e6] transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )
          ) : null}
        </motion.div>
      </div>
      )}
      {postMenuOpen && goalData && (
        <motion.div key="post-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostMenuOpen(false)} className="fixed inset-0 z-[230] flex items-end justify-center bg-black/40 md:items-center">
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={event => event.stopPropagation()} className="w-full rounded-t-3xl bg-white p-3 pb-[max(32px,env(safe-area-inset-bottom))] md:max-w-sm md:rounded-2xl dark:bg-gray-800">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
            <button type="button" onClick={copyPostLink} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"><Share2 className="h-5 w-5" />Copy link</button>
            {goalData.user?.id && String(goalData.user.id) !== String(currentUser?.id || currentUser?._id || currentUser?.userId || currentUser?.user_id) && (
              <button type="button" onClick={async () => { await useApiStore.getState().unfollowUser(goalData.user.id); setPostMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><UserPlus className="h-5 w-5" />Unfollow {goalData.user.name || 'user'}</button>
            )}
            <button type="button" onClick={() => { setPostMenuOpen(false); setReportOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><Bell className="h-5 w-5" />Report post</button>
          </motion.div>
        </motion.div>
      )}
      {reportOpen && goalData?.social?.activityId && (
        <Suspense key="report-post" fallback={null}>
          <ReportModal isOpen onClose={() => setReportOpen(false)} targetLabel="activity" onSubmit={async ({ reason, description }) => { await useApiStore.getState().report({ targetType: 'activity', targetId: goalData.social.activityId, reason, description }); setReportOpen(false); }} />
        </Suspense>
      )}
      {commentsOpenActivityId && (
        <Suspense key="activity-comments" fallback={null}>
          <ActivityCommentsModal
            isOpen={!!commentsOpenActivityId}
            onClose={() => setCommentsOpenActivityId(null)}
            activity={{ _id: commentsOpenActivityId }}
          />
        </Suspense>
      )}
      {shareSheetOpen && (
        <Suspense key="share-sheet" fallback={null}>
          <ShareSheet
            isOpen={shareSheetOpen}
            onClose={() => setShareSheetOpen(false)}
            url={shareUrlRef.current}
            title="WishTrail Goal"
          />
        </Suspense>
      )}
      {imageViewerOpen && completionImageUrl && (
        <motion.div key="image-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[240] flex items-center justify-center bg-black" onClick={() => setImageViewerOpen(false)}>
          <button type="button" onClick={() => setImageViewerOpen(false)} className="absolute right-4 top-[calc(16px+env(safe-area-inset-top,0px))] z-10 rounded-full bg-black/50 p-2 text-white" aria-label="Close image"><X className="h-6 w-6" /></button>
          <img src={completionImageUrl} alt="Completion" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoalPostModal;
