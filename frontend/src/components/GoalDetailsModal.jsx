import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Send, CheckCircle, Target, Calendar, TrendingUp, Plus, ListChecks } from 'lucide-react'
const ActivityCommentsModal = lazy(() => import('./ActivityCommentsModal'));
import useApiStore from '../store/apiStore'

export default function GoalDetailsModal({ isOpen, goalId, onClose, autoOpenComments = false }) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const [detailsExpanded, setDetailsExpanded] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null)
    const [liking, setLiking] = useState(false)
    const [timelineEvents, setTimelineEvents] = useState([])
    const [selectedEvent, setSelectedEvent] = useState('created') // Track which event is selected
    const [showTimeline, setShowTimeline] = useState(false) // Toggle for vertical timeline view
    const rightPanelScrollRef = useRef(null)
    const commentsAnchorRef = useRef(null)
    const navigate = useNavigate()
    const [nestedGoalId, setNestedGoalId] = useState(null)

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
                setTimelineEvents([])
                try {
                    const resp = await useApiStore.getState().getGoalPost(goalId)
                    if (!active) return
                    if (resp?.success) {
                        setData(resp.data)
                        // Create timeline events from goal.timeline array
                        const events = []

                        if (resp.data?.goal?.timeline && Array.isArray(resp.data.goal.timeline)) {
                            resp.data.goal.timeline.forEach((timelineEvent, index) => {
                                let icon = Target
                                let color = 'text-purple-600 dark:text-purple-400'
                                let bgColor = 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
                                let borderColor = 'border-purple-200 dark:border-purple-800'
                                let title = ''
                                let description = ''

                                switch (timelineEvent.type) {
                                    case 'goal_created':
                                        title = 'Goal Created'
                                        description = resp.data?.goal?.title
                                        icon = Target
                                        color = 'text-purple-600 dark:text-purple-400'
                                        bgColor = 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
                                        borderColor = 'border-purple-200 dark:border-purple-800'
                                        break
                                    case 'goal_completed':
                                        title = 'Goal Completed'
                                        description = timelineEvent.data?.note || resp.data?.goal?.completionNote || 'Successfully achieved this goal'
                                        icon = CheckCircle
                                        color = 'text-green-500'
                                        bgColor = 'bg-green-50 dark:bg-green-900/20'
                                        borderColor = 'border-green-200 dark:border-green-800'
                                        break
                                    case 'subgoal_added':
                                        title = 'Sub-goal Added'
                                        description = timelineEvent.data?.name || 'Added a new sub-goal'
                                        icon = Plus
                                        color = 'text-purple-500'
                                        bgColor = 'bg-purple-50 dark:bg-purple-900/20'
                                        borderColor = 'border-purple-200 dark:border-purple-800'
                                        break
                                    case 'subgoal_removed':
                                        title = 'Sub-goal Removed'
                                        description = timelineEvent.data?.name || 'Removed a sub-goal'
                                        icon = X
                                        color = 'text-red-500'
                                        bgColor = 'bg-red-50 dark:bg-red-900/20'
                                        borderColor = 'border-red-200 dark:border-red-800'
                                        break
                                    case 'subgoal_completed':
                                        title = 'Sub-goal Completed'
                                        description = timelineEvent.data?.name || 'Completed a sub-goal'
                                        icon = CheckCircle
                                        color = 'text-emerald-500'
                                        bgColor = 'bg-emerald-50 dark:bg-emerald-900/20'
                                        borderColor = 'border-emerald-200 dark:border-emerald-800'
                                        break
                                    case 'subgoal_uncompleted':
                                        title = 'Sub-goal Uncompleted'
                                        description = timelineEvent.data?.name || 'Uncompleted a sub-goal'
                                        icon = AlertCircle
                                        color = 'text-yellow-500'
                                        bgColor = 'bg-yellow-50 dark:bg-yellow-900/20'
                                        borderColor = 'border-yellow-200 dark:border-yellow-800'
                                        break
                                    case 'habit_added':
                                        title = 'Habit Linked'
                                        description = timelineEvent.data?.name || 'Linked a habit'
                                        icon = Zap
                                        color = 'text-indigo-500'
                                        bgColor = 'bg-indigo-50 dark:bg-indigo-900/20'
                                        borderColor = 'border-indigo-200 dark:border-indigo-800'
                                        break
                                    case 'habit_removed':
                                        title = 'Habit Unlinked'
                                        description = timelineEvent.data?.name || 'Unlinked a habit'
                                        icon = X
                                        color = 'text-orange-500'
                                        bgColor = 'bg-orange-50 dark:bg-orange-900/20'
                                        borderColor = 'border-orange-200 dark:border-orange-800'
                                        break
                                    case 'habit_target_achieved':
                                        title = 'Habit Target Achieved'
                                        description = `${timelineEvent.data?.name || 'A habit'} reached its target`
                                        icon = Award
                                        color = 'text-fuchsia-500'
                                        bgColor = 'bg-fuchsia-50 dark:bg-fuchsia-900/20'
                                        borderColor = 'border-fuchsia-200 dark:border-fuchsia-800'
                                        break
                                    default:
                                        title = 'Event'
                                        description = 'An event occurred'
                                }

                                events.push({
                                    id: `timeline-${index}`,
                                    type: timelineEvent.type,
                                    title,
                                    description,
                                    timestamp: new Date(timelineEvent.timestamp),
                                    icon,
                                    color,
                                    bgColor,
                                    borderColor,
                                    data: timelineEvent.data
                                })
                            })
                        }

                        // Sort events by timestamp (chronological order)
                        events.sort((a, b) => a.timestamp - b.timestamp)

                        setTimelineEvents(events)

                        // Default to the first event
                        if (events.length > 0) {
                            setSelectedEvent(events[0].id)
                        }
                    }
                } finally {
                    if (active) setLoading(false)
                }
            })()
        return () => { active = false }
    }, [isOpen, goalId])

    if (!isOpen) return null

    const close = () => { onClose?.() }
    const openComments = () => {
        const aid = data?.social?.activityId
        if (!aid) return
        if (isMobile) { setCommentsOpenActivityId(aid); return }
        setTimeout(() => {
            try {
                const scroller = rightPanelScrollRef.current
                const anchor = commentsAnchorRef.current
                if (scroller && anchor) scroller.scrollTo({ top: anchor.offsetTop - 8, behavior: 'smooth' })
            } catch { }
        }, 0)
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

        console.log('[GoalDetailsModal] Like clicked:', { currentIsLiked, newIsLiked, currentLikeCount, newLikeCount });

        // Optimistic update - create entirely new object
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
            console.log('[GoalDetailsModal] Like API result:', result);
            
            if (result?.success) {
                // Update with actual values from API
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
                // Revert on failure
                console.log('[GoalDetailsModal] Like failed, reverting');
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
            // Revert on error
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

    const handleEventClick = (event) => {
        setSelectedEvent(event.id)

        // If it's a subgoal event with a linkedGoalId, open that goal's modal
        if ((event.type === 'subgoal_created' || event.type === 'subgoal_completed') && event.linkedGoalId) {
            setNestedGoalId(event.linkedGoalId)
        }
    }


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
            {loading || !data ? (
                <div className="relative z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600" />
                </div>
            ) : null}
            <div className={`relative w-full ${(!data?.share?.image) ? 'max-w-3xl' : 'max-w-6xl'} 
        mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl 
        ${isMobile ? 'max-h-[90vh] overflow-y-auto scrollbar-hide' : 'overflow-hidden'} 
        border border-gray-200 dark:border-gray-700
        ${(!data?.share?.image) ? 'h-[85vh]' : 'h-[85vh]'}
        ${(loading || !data) ? 'hidden' : ''}`}>
                {!loading && data && (
                    data?.share?.image ? (
                        <div className="grid grid-cols-1 md:[grid-template-columns:minmax(0,1fr)_420px] items-stretch md:h-full min-h-0">
                            {/* Left: Media - Fixed height on mobile, scrollable container on desktop */}
                            <div className="bg-black flex items-center justify-center md:h-full h-[350px] flex-shrink-0">
                                <img
                                    src={data.share.image} 
                                    alt="Completion" 
                                    className="md:h-full md:w-auto h-full w-full object-contain" 
                                />
                            </div>
                            {/* Right: Details with timeline and toggleable comments */}
                            <div className="flex flex-col md:w-[420px] md:flex-shrink-0 md:h-full min-h-0">
                                <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                    <img
                                        src={data?.user?.avatar || '/api/placeholder/48/48'}
                                        alt={data?.user?.name || 'User'}
                                        className="w-12 h-12 rounded-full cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-primary-500 transition-all"
                                        onClick={() => handleUserClick(data?.user?.username)} />
                                    <div className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => handleUserClick(data?.user?.username)}>
                                        <div className="text-base font-bold text-gray-900 dark:text-white truncate">{data?.user?.name}</div>
                                        {data?.user?.username && (<div className="text-sm text-gray-500 dark:text-gray-400">@{data.user.username}</div>)}
                                    </div>
                                    <button onClick={close} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto scrollbar-hide px-6 pb-0`}>
                                    <div className="py-6 space-y-4">
                                        {/* Title and Timeline Toggle */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-xs text-gray-500">Title</div>
                                                <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{data?.goal?.title}</div>
                                            </div>
                                            <button
                                                onClick={() => setShowTimeline(!showTimeline)}
                                                className={`flex-shrink-0 p-2.5 rounded-xl border-2 transition-all shadow-sm ${showTimeline ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 text-primary-600 dark:from-primary-900/20 dark:to-blue-900/20 dark:border-primary-600 dark:text-primary-400 scale-105' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:dark:bg-gray-600'}`}
                                                title={showTimeline ? "View Details" : "View Timeline"}
                                            >
                                                {showTimeline ? <Target className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        {showTimeline ? (
                                            /* Vertical Timeline View */
                                            <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-800 space-y-8 my-4">
                                                {timelineEvents.map((event, idx) => {
                                                    const Icon = event.icon
                                                    const isSelected = selectedEvent === event.id
                                                    return (
                                                        <div key={event.id} className={`relative pl-6 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-70 hover:opacity-100'}`}>
                                                            {/* Dot on line */}
                                                            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900 ${isSelected ? 'border-purple-500 scale-125' : 'border-gray-300 dark:border-gray-600'}`} />

                                                            {/* Content Card */}
                                                            <div
                                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 dark:from-primary-900/20 dark:to-blue-900/20 dark:border-primary-600 shadow-lg scale-105' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md'}`}
                                                                onClick={() => handleEventClick(event)}
                                                            >
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className={`p-2 rounded-lg ${event.bgColor}`}>
                                                                        <Icon className={`h-5 w-5 ${event.color}`} />
                                                                    </div>
                                                                    <span className={`text-sm font-bold ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>{event.title}</span>
                                                                </div>
                                                                <div className="text-sm text-gray-700 dark:text-gray-300 ml-1">{event.description}</div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            /* Details View */
                                            <>
                                                {selectedEvent === 'created' && (
                                                    <>
                                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary-500 to-blue-500 shadow-md">
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                {data?.goal?.category}
                                                            </div>
                                                        </div>
                                                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                            <div className="text-xs text-gray-500">Description</div>
                                                            <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-5'}`}>{data?.goal?.description || '—'}</div>
                                                            {String(data?.goal?.description || '').length > 200 && (
                                                                <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}

                                                {selectedEvent === 'completed' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        {data?.share?.note ? (
                                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border-2 border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                                                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Completion Note
                                                                </div>
                                                                <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>{data.share.note}</div>
                                                                {String(data.share.note || '').length > 240 && (
                                                                    <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-gray-500 italic">No completion note added.</div>
                                                        )}
                                                        {data?.goal?.completedAt && (
                                                            <div className="mt-2">
                                                                <div className="text-xs text-gray-500">Completed</div>
                                                                <div className="text-gray-800 dark:text-gray-200">{new Date(data.goal.completedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {!isMobile && (
                                        <div className="pb-6">
                                            <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800" />
                                            {data?.social?.activityId ? (
                                                <Suspense fallback={null}><ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} /></Suspense>
                                            ) : (
                                                <div className="text-sm text-gray-500 py-4">Comments unavailable</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4 flex items-center gap-2 sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-lg z-10">
                                    <button onClick={handleLike} disabled={liking} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 ${data?.social?.isLiked ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 hover:shadow-md'}`}>
                                        <Heart className={`h-5 w-5 transition-all duration-200 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                        <span className="font-semibold">{data?.social?.likeCount || 0}</span>
                                    </button>
                                    <button onClick={openComments} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-600 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 dark:hover:text-purple-400 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md">
                                        <MessageCircle className="h-5 w-5" />
                                        <span className="font-semibold">{data?.social?.commentCount || 0}</span>
                                    </button>
                                    <button onClick={() => {
                                        try {
                                            const id = data?.social?.activityId || data?.goal?._id;
                                            const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                                            navigator.clipboard.writeText(url);
                                            window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                                        } catch { }
                                    }} className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md" title="Share">
                                        <Send className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full w-full min-h-0">
                            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                                <img
                                    src={data?.user?.avatar || '/api/placeholder/40/40'}
                                    alt={data?.user?.name || 'User'}
                                    className="w-10 h-10 rounded-full cursor-pointer"
                                    onClick={() => handleUserClick(data?.user?.username)} />
                                <div className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleUserClick(data?.user?.username)}>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data?.user?.name}</div>
                                    {data?.user?.username && (<div className="text-xs text-gray-500">@{data.user.username}</div>)}
                                </div>
                                <button onClick={close} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                            </div>
                            <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto scrollbar-hide`}>
                                <div className="p-6 space-y-4">
                                    {/* Title and Timeline Toggle */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-xs text-gray-500">Title</div>
                                            <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{data?.goal?.title}</div>
                                        </div>
                                        <button
                                            onClick={() => setShowTimeline(!showTimeline)}
                                            className={`flex-shrink-0 p-2 rounded-lg border transition-colors ${showTimeline ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 text-purple-600 dark:from-purple-900/20 dark:to-blue-900/20 dark:border-purple-800 dark:text-purple-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}`}
                                            title={showTimeline ? "View Details" : "View Timeline"}
                                        >
                                            {showTimeline ? <Target className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {showTimeline ? (
                                        /* Vertical Timeline View */
                                        <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-800 space-y-8 my-4">
                                            {timelineEvents.map((event, idx) => {
                                                const Icon = event.icon
                                                const isSelected = selectedEvent === event.id
                                                return (
                                                    <div key={event.id} className={`relative pl-6 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-70 hover:opacity-100'}`}>
                                                        {/* Dot on line */}
                                                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900 ${isSelected ? 'border-purple-500 scale-125' : 'border-gray-300 dark:border-gray-600'}`} />

                                                        {/* Content Card */}
                                                        <div
                                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 dark:from-purple-900/10 dark:to-blue-900/10 dark:border-purple-800 shadow-sm' : 'bg-white border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                            onClick={() => handleEventClick(event)}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Icon className={`h-4 w-4 ${event.color}`} />
                                                                <span className={`text-sm font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>{event.title}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-400">{event.description}</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        /* Details View */
                                        <>
                                            {selectedEvent === 'created' && (
                                                <>
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-blue-600 shadow-md">{data?.goal?.category}</div>
                                                    </div>
                                                    <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                        <div className="text-xs text-gray-500">Description</div>
                                                        <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>{data?.goal?.description || '—'}</div>
                                                        {String(data?.goal?.description || '').length > 200 && (
                                                            <button className="mt-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {selectedEvent === 'completed' && (
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    {data?.share?.note ? (
                                                        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                            <div className="text-xs text-gray-500 mb-1">Completion note</div>
                                                            <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${detailsExpanded ? '' : 'line-clamp-6'}`}>{data.share.note}</div>
                                                            {String(data.share.note || '').length > 240 && (
                                                                <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500 italic">No completion note added.</div>
                                                    )}
                                                    {data?.goal?.completedAt && (
                                                        <div className="mt-2">
                                                            <div>
                                                                <div className="text-xs text-gray-500">Completed</div>
                                                                <div className="text-gray-800 dark:text-gray-200">{new Date(data.goal.completedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {!isMobile && (
                                    <div ref={commentsAnchorRef} className="px-6 pb-6">
                                        {data?.social?.activityId ? (
                                            <Suspense fallback={null}><ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} /></Suspense>
                                        ) : (
                                            <div className="text-sm text-gray-500">Comments unavailable</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
                                <button onClick={handleLike} disabled={liking} className={`inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 ${data?.social?.isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 hover:text-red-500'}`}>
                                    <Heart className={`h-5 w-5 transition-all duration-200 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                    <span>{data?.social?.likeCount || 0}</span>
                                </button>
                                <button onClick={openComments} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 hover:scale-110 active:scale-95">
                                    <MessageCircle className="h-5 w-5" />
                                    <span>{data?.social?.commentCount || 0}</span>
                                </button>
                                <button onClick={() => {
                                    try {
                                        const id = data?.social?.activityId || data?.goal?._id;
                                        const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                                        navigator.clipboard.writeText(url);
                                        window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                                    } catch { }
                                }} className="inline-flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-500 transition-all duration-200 hover:scale-110 active:scale-95" title="Share">
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
            {/* Mobile comments bottom sheet */}
            <Suspense fallback={null}><ActivityCommentsModal
                isOpen={!!commentsOpenActivityId}
                onClose={() => setCommentsOpenActivityId(null)}
                activity={{ _id: commentsOpenActivityId }}
            />
            </Suspense>
            {/* Nested Goal Modal for Subgoals */}
            {nestedGoalId && (
                <GoalDetailsModal
                    isOpen={true}
                    goalId={nestedGoalId}
                    onClose={() => setNestedGoalId(null)}
                />
            )}
        </div>
    )
}
