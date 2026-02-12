import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import CategoryBadge from './CategoryBadge';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, TrendingUp, Send } from 'lucide-react';
import useApiStore from '../store/apiStore';
import { activitiesAPI } from '../services/api';
import toast from 'react-hot-toast';

const ActivityCommentsModal = lazy(() => import('./ActivityCommentsModal'));
const ShareSheet = lazy(() => import('./ShareSheet'));

// Separate comment input component
const CommentInput = ({ activityId }) => {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePost = async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await activitiesAPI.addComment(activityId, { text });
      setInput('');
      // Trigger a refresh of comments - we'll need to add this
      window.dispatchEvent(new CustomEvent('commentAdded', { detail: { activityId } }));
    } catch (e) {
      console.error('Failed to post comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment..."
        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4c99e6] focus:border-[#4c99e6] transition-all"
        disabled={submitting}
      />
      <button
        onClick={handlePost}
        className="p-2.5 rounded-xl bg-gradient-to-r from-[#4c99e6] to-[#3d88d5] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#3d88d5] hover:to-[#3479c3] transition-all shadow-lg hover:shadow-xl"
        disabled={!input.trim() || submitting}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};

const GoalPostModal = ({ isOpen, onClose, goalId, openWithComments = false, onToggleComments }) => {
  const navigate = useNavigate();
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [liking, setLiking] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const shareUrlRef = useRef('');

  useEffect(() => {
    if (isOpen && goalId) {
      loadGoalData();
    }
  }, [isOpen, goalId]);

  // Separate effect to handle openWithComments changes without reloading data
  useEffect(() => {
    if (isOpen) {
      setShowComments(openWithComments);
    }
  }, [isOpen, openWithComments]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const loadGoalData = async () => {
    setLoading(true);
    setGoalData(null);
    setTimeline(null);
    setIsTimelineExpanded(false);
    
    try {
      const response = await useApiStore.getState().getGoalPost(goalId);
      if (response?.success && response?.data) {
        setGoalData(response.data);
      }
    } catch (error) {
      console.error('Failed to load goal data:', error);
    } finally {
      setLoading(false);
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
      setCommentsOpenActivityId(activityId);
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

  const completionImageUrl = goalData?.completion?.attachmentUrl || goalData?.share?.attachmentUrl || goalData?.share?.image || '';
  const hasCompletionImage = Boolean(completionImageUrl);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
            </div>
          ) : goalData ? (
            <div className={`flex ${hasCompletionImage ? 'flex-row' : 'flex-col'} h-full overflow-hidden`}>
              {hasCompletionImage && (
                <div className="hidden md:block w-1/2 relative bg-gray-100">
                  <img
                    src={completionImageUrl}
                    alt="Completion"
                    className="w-full h-full object-cover p-2"
                  />
                </div>
              )}

              {/* Right Side - Content */}
              <div className={`${hasCompletionImage ? 'w-full md:w-1/2' : 'w-full'} flex flex-col h-full overflow-hidden`}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-start justify-between mb-4">
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
                          className="font-semibold text-gray-900 cursor-pointer hover:text-[#4c99e6] transition-colors"
                        >
                          {goalData.user?.name || 'User'}
                        </h3>
                        {goalData.user?.username && (
                          <p className="text-sm text-gray-500">@{goalData.user.username}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {goalData.goal?.title || 'Goal'}
                  </h2>

                  <div className="flex items-center gap-2 mb-3">
                    <CategoryBadge category={goalData.goal?.category} />
                    {(goalData.goal?.isCompleted || goalData.goal?.completedAt) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                        Completed
                      </span>
                    )}
                  </div>

                  {(goalData.completion?.completedAt || goalData.goal?.completedAt) && (
                    <p className="text-sm text-gray-600">
                      Completed: {new Date(goalData.completion?.completedAt || goalData.goal?.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto p-6 ${showComments ? 'pb-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                  {/* Description */}
                  {goalData.goal?.description && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Description
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {goalData.goal.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completion Note */}
                  {(goalData.completion?.note || goalData.share?.note) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Completion Note
                        </h4>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-sm text-gray-700 italic leading-relaxed">
                          "{goalData.completion?.note || goalData.share?.note}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completion Image (inline for mobile or when left panel hidden) */}
                  {completionImageUrl && (isMobile || !hasCompletionImage) && (
                    <div>
                      <img
                        src={completionImageUrl}
                        alt="Completion"
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#4c99e6]" />
                        <h4 className="text-sm font-semibold text-gray-900">
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
                                <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h5 className="font-semibold text-gray-900 text-sm">
                                  {getTimelineTitle(item)}
                                </h5>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatTimelineDate(item.timestamp || item.createdAt || item.date)}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isTimelineExpanded && timeline && timeline.length === 0 && (
                      <div className="text-center py-6 text-sm text-gray-500">
                        No timeline events yet
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {!isMobile && showComments && (
                    <div className="pb-4">
                      {goalData?.social?.activityId ? (
                        <Suspense fallback={null}>
                          <ActivityCommentsModal
                            embedded
                            hideInput
                            activity={{
                              _id: goalData.social.activityId,
                              commentCount: goalData?.social?.commentCount
                            }}
                          />
                        </Suspense>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">Comments unavailable</div>
                      )}
                    </div>
                  )}
                  </div>
                </div>

                {/* Fixed Comment Input at Bottom - Only show when comments are open */}
                {!isMobile && showComments && goalData?.social?.activityId && (
                  <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0 bg-white">
                    <CommentInput activityId={goalData.social.activityId} />
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Like */}
                      <button
                        onClick={handleLike}
                        disabled={liking}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors disabled:opacity-50"
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
                        className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors"
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
                      className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
      <Suspense fallback={null}>
        <ActivityCommentsModal
          isOpen={!!commentsOpenActivityId}
          onClose={() => setCommentsOpenActivityId(null)}
          activity={{ _id: commentsOpenActivityId }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ShareSheet
          isOpen={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          url={shareUrlRef.current}
          title="WishTrail Goal"
        />
      </Suspense>
    </AnimatePresence>
  );
};

export default GoalPostModal;
