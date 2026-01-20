import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Send, CheckCircle, Target, Calendar, X, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const ActivityCommentsModal = lazy(() => import('./ActivityCommentsModal'));
import Timeline from './Timeline'
import useApiStore from '../store/apiStore'

export default function GoalDetailsModal({ isOpen, goalId, onClose, autoOpenComments = false }) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null)
    const [commentsVisible, setCommentsVisible] = useState(false)
    const [liking, setLiking] = useState(false)
    const [timeline, setTimeline] = useState(null)
    const [timelineLoading, setTimelineLoading] = useState(false)
    const [timelineVisible, setTimelineVisible] = useState(false)
    const rightPanelScrollRef = useRef(null)
    const commentsAnchorRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
        compute()
        window.addEventListener('resize', compute)
        return () => window.removeEventListener('resize', compute)
    }, [])

    useEffect(() => {
        if (!isOpen || !goalId) return
        let active = true
            ; (async () => {
                setLoading(true)
                setData(null)
                try {
                    const resp = await useApiStore.getState().getGoalPost(goalId)
                    if (!active) return
                    if (resp?.success) {
                        setData(resp.data)
                    }
                } finally {
                    if (active) setLoading(false)
                }
            })()
        return () => { active = false }
    }, [isOpen, goalId])

    if (!isOpen) return null

    const close = () => { 
        setCommentsVisible(false)
        setTimelineVisible(false)
        setTimeline(null)
        onClose?.() 
    }
    const openComments = () => {
        const aid = data?.social?.activityId
        if (!aid) return
        if (isMobile) { 
            setCommentsOpenActivityId(aid); 
            return 
        }
        // Desktop: Show comments section
        setCommentsVisible(true)
        setTimeout(() => {
            try {
                const scroller = rightPanelScrollRef.current
                const anchor = commentsAnchorRef.current
                if (scroller && anchor) scroller.scrollTo({ top: anchor.offsetTop - 8, behavior: 'smooth' })
            } catch { }
        }, 100)
    }

    const toggleTimeline = async () => {
        if (timelineVisible) {
            setTimelineVisible(false)
            return
        }
        
        // If timeline not loaded yet, fetch it
        if (!timeline && !timelineLoading) {
            setTimelineLoading(true)
            try {
                const resp = await useApiStore.getState().getGoalTimeline(goalId)
                if (resp?.success && resp?.data?.timeline) {
                    setTimeline(resp.data.timeline)
                    setTimelineVisible(true)
                }
            } catch (err) {
                console.error('Failed to load timeline:', err)
            } finally {
                setTimelineLoading(false)
            }
        } else {
            setTimelineVisible(true)
        }
    }

    useEffect(() => {
        if (!isOpen) return
        if (autoOpenComments && data) {
            openComments()
        }
    }, [isOpen, autoOpenComments, data])

    const handleUserClick = (userId) => {
        navigate(`/profile/@${userId}?tab=overview`);
    };

    const handleLike = async () => {
        const activityId = data?.social?.activityId;
        if (!activityId || liking) return;

        const currentIsLiked = data?.social?.isLiked;
        const currentLikeCount = data?.social?.likeCount || 0;
        const newIsLiked = !currentIsLiked;
        const newLikeCount = currentIsLiked ? currentLikeCount - 1 : currentLikeCount + 1;

        setData(prev => {
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
                setData(prev => {
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
                setData(prev => {
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
            console.error('[GoalDetailsModal] Like error:', error);
            setData(prev => {
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


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={close}
                    />

                    {/* Loading State */}
                    {loading || !data ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10 flex items-center justify-center"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600" />
                                <p className="text-white text-sm font-medium">Loading goal details...</p>
                            </div>
                        </motion.div>
                    ) : null}

                    {/* Modal Content */}
                    {!loading && data && (
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className={`relative w-full ${data?.share?.image ? 'max-w-5xl' : 'max-w-2xl'} 
                            mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl 
                            ${isMobile ? 'max-h-[90vh] overflow-y-auto' : 'h-[85vh]'}
                            border border-gray-200 dark:border-gray-700`}
                        >
                            {data?.share?.image ? (
                                /* Layout with Image */
                                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                                    {/* Left: Image */}
                                    <div className="bg-black flex items-center justify-center md:h-full h-[350px]">
                                        <img
                                            src={data.share.image}
                                            alt="Goal"
                                            className="md:h-full md:w-auto h-full w-full object-contain"
                                        />
                                    </div>

                                    {/* Right: Details */}
                                    <div className="flex flex-col h-full min-h-0">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                            <img
                                                src={data?.user?.avatar || '/api/placeholder/40/40'}
                                                alt={data?.user?.name}
                                                className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => handleUserClick(data?.user?.username)}
                                            />
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(data?.user?.username)}>
                                                <div className="font-semibold text-gray-900 dark:text-white truncate">{data?.user?.name}</div>
                                                {data?.user?.username && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">@{data.user.username}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={close}
                                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Scrollable Content */}
                                        <div ref={rightPanelScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                                            {/* Goal Info */}
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                                    {data?.goal?.title}
                                                </h2>

                                                {/* Badges and Dates */}
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    {/* Category Badge */}
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                        {data?.goal?.category || 'General'}
                                                    </span>
                                                    
                                                    {/* Status Badge */}
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                                                        data?.goal?.completedAt
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {data?.goal?.completedAt ? (
                                                            <><CheckCircle className="w-3 h-3" /> Completed</>
                                                        ) : (
                                                            <>In Progress</>
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Dates */}
                                                <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    {data?.goal?.createdAt && (
                                                        <div>
                                                            <span className="font-medium">Created:</span>{' '}
                                                            <span>{new Date(data.goal.createdAt).toLocaleDateString(undefined, { 
                                                                month: 'short', 
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}</span>
                                                        </div>
                                                    )}
                                                    {data?.goal?.completedAt && (
                                                        <div>
                                                            <span className="font-medium">Completed:</span>{' '}
                                                            <span>{new Date(data.goal.completedAt).toLocaleDateString(undefined, { 
                                                                month: 'short', 
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                {data?.goal?.description && (
                                                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                            {data.goal.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Completion Note */}
                                                {data?.share?.note && data?.goal?.completedAt && (
                                                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                            <div className="text-sm font-medium text-green-700 dark:text-green-300">Completion Note</div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {data.share.note}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline Button */}
                                                <div className="mt-4">
                                                    <button
                                                        onClick={toggleTimeline}
                                                        disabled={timelineLoading}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                                                    >
                                                        <Target className="w-4 h-4" />
                                                        {timelineLoading ? 'Loading...' : timelineVisible ? 'Hide Timeline' : 'Show Timeline'}
                                                    </button>
                                                </div>

                                                {/* Timeline Display */}
                                                {timelineVisible && timeline && timeline.length > 0 && (
                                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Timeline</div>
                                                        <Timeline events={timeline} />
                                                    </div>
                                                )}
                                                {timelineVisible && timeline && timeline.length === 0 && (
                                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-sm text-gray-500">
                                                        No timeline events yet
                                                    </div>
                                                )}
                                            </div>

                                            {/* Comments Section for Desktop */}
                                            {!isMobile && commentsVisible && (
                                                <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                                    {data?.social?.activityId ? (
                                                        <Suspense fallback={null}>
                                                            <ActivityCommentsModal 
                                                                embedded 
                                                                activity={{ 
                                                                    _id: data.social.activityId, 
                                                                    commentCount: data?.social?.commentCount 
                                                                }} 
                                                            />
                                                        </Suspense>
                                                    ) : (
                                                        <div className="text-sm text-gray-500 text-center py-4">Comments unavailable</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2 bg-white dark:bg-gray-900 rounded-br-2xl flex-shrink-0">
                                            <button
                                                onClick={handleLike}
                                                disabled={liking}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                    data?.social?.isLiked
                                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <Heart className={`w-5 h-5 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                                <span>{data?.social?.likeCount || 0}</span>
                                            </button>
                                            <button
                                                onClick={openComments}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                                <span>{data?.social?.commentCount || 0}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/feed?goalId=${data?.goal?._id}`;
                                                    navigator.clipboard.writeText(url);
                                                    window.dispatchEvent(new CustomEvent('wt_toast', { 
                                                        detail: { message: 'Link copied!', type: 'success', duration: 2000 } 
                                                    }));
                                                }}
                                                className="p-2.5 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                                title="Share"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Layout without Image */
                                <div className="flex flex-col h-full min-h-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                        <img
                                            src={data?.user?.avatar || '/api/placeholder/40/40'}
                                            alt={data?.user?.name}
                                            className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => handleUserClick(data?.user?.username)}
                                        />
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(data?.user?.username)}>
                                            <div className="font-semibold text-gray-900 dark:text-white truncate">{data?.user?.name}</div>
                                            {data?.user?.username && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400">@{data.user.username}</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={close}
                                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div ref={rightPanelScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                                        {/* Goal Info */}
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                                {data?.goal?.title}
                                            </h2>

                                            {/* Badges and Dates */}
                                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                                {/* Category Badge */}
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {data?.goal?.category || 'General'}
                                                </span>
                                                
                                                {/* Status Badge */}
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
                                                    data?.goal?.completedAt
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {data?.goal?.completedAt ? (
                                                        <><CheckCircle className="w-4 h-4" /> Completed</>
                                                    ) : (
                                                        <>In Progress</>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Dates */}
                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                {data?.goal?.createdAt && (
                                                    <div>
                                                        <span className="font-medium">Created:</span>{' '}
                                                        <span>{new Date(data.goal.createdAt).toLocaleDateString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}</span>
                                                    </div>
                                                )}
                                                {data?.goal?.completedAt && (
                                                    <div>
                                                        <span className="font-medium">Completed:</span>{' '}
                                                        <span>{new Date(data.goal.completedAt).toLocaleDateString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {data?.goal?.description && (
                                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                                        {data.goal.description}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Completion Note */}
                                            {data?.share?.note && data?.goal?.completedAt && (
                                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                        <div className="text-sm font-medium text-green-700 dark:text-green-300">Completion Note</div>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                        {data.share.note}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Timeline Button */}
                                            <div className="mt-4">
                                                <button
                                                    onClick={toggleTimeline}
                                                    disabled={timelineLoading}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                                                >
                                                    <Target className="w-4 h-4" />
                                                    {timelineLoading ? 'Loading...' : timelineVisible ? 'Hide Timeline' : 'Show Timeline'}
                                                </button>
                                            </div>

                                            {/* Timeline Display */}
                                            {timelineVisible && timeline && timeline.length > 0 && (
                                                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Timeline</div>
                                                    <Timeline events={timeline} />
                                                </div>
                                            )}
                                            {timelineVisible && timeline && timeline.length === 0 && (
                                                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-sm text-gray-500">
                                                    No timeline events yet
                                                </div>
                                            )}
                                        </div>

                                        {/* Comments Section for Desktop */}
                                        {!isMobile && commentsVisible && (
                                            <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                                {data?.social?.activityId ? (
                                                    <Suspense fallback={null}>
                                                        <ActivityCommentsModal 
                                                            embedded 
                                                            activity={{ 
                                                                _id: data.social.activityId, 
                                                                commentCount: data?.social?.commentCount 
                                                            }} 
                                                        />
                                                    </Suspense>
                                                ) : (
                                                    <div className="text-sm text-gray-500 text-center py-4">Comments unavailable</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2 bg-white dark:bg-gray-900 rounded-b-2xl flex-shrink-0">
                                        <button
                                            onClick={handleLike}
                                            disabled={liking}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                data?.social?.isLiked
                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <Heart className={`w-5 h-5 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                            <span>{data?.social?.likeCount || 0}</span>
                                        </button>
                                        <button
                                            onClick={openComments}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            <span>{data?.social?.commentCount || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/feed?goalId=${data?.goal?._id}`;
                                                navigator.clipboard.writeText(url);
                                                window.dispatchEvent(new CustomEvent('wt_toast', { 
                                                    detail: { message: 'Link copied!', type: 'success', duration: 2000 } 
                                                }));
                                            }}
                                            className="p-2.5 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                            title="Share"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Mobile Comments Modal */}
                    <Suspense fallback={null}>
                        <ActivityCommentsModal
                            isOpen={!!commentsOpenActivityId}
                            onClose={() => setCommentsOpenActivityId(null)}
                            activity={{ _id: commentsOpenActivityId }}
                        />
                    </Suspense>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
