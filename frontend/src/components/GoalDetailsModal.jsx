import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Send, CheckCircle, Target, Calendar, TrendingUp, Plus, ListChecks, X, AlertCircle, Zap, Award, Clock, Sparkles, Trophy, Flag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={close}
                    />
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
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className={`relative w-full ${(!data?.share?.image) ? 'max-w-4xl' : 'max-w-6xl'} 
        mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl 
        ${isMobile ? 'max-h-[90vh] overflow-y-auto scrollbar-hide' : 'overflow-hidden'} 
        border border-gray-200/50 dark:border-gray-700/50
        ${(!data?.share?.image) ? 'h-[85vh]' : 'h-[85vh]'}
        ${(loading || !data) ? 'hidden' : ''}`}
                    >
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
                                {/* Enhanced Header with gradient */}
                                <div className="relative flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-blue-100/20 dark:from-purple-900/5 dark:to-blue-900/5" />
                                    <div className="relative">
                                        <img
                                            src={data?.user?.avatar || '/api/placeholder/48/48'}
                                            alt={data?.user?.name || 'User'}
                                            className="w-12 h-12 rounded-full cursor-pointer ring-2 ring-white dark:ring-gray-800 hover:ring-primary-500 transition-all hover:scale-105"
                                            onClick={() => handleUserClick(data?.user?.username)} />
                                        {data?.goal?.status === 'completed' && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 ring-2 ring-white dark:ring-gray-800">
                                                <CheckCircle className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative flex-1 min-w-0 cursor-pointer"
                                        onClick={() => handleUserClick(data?.user?.username)}>
                                        <div className="text-base font-bold text-gray-900 dark:text-white truncate">{data?.user?.name}</div>
                                        {data?.user?.username && (<div className="text-sm text-gray-500 dark:text-gray-400">@{data.user.username}</div>)}
                                    </div>
                                    <button onClick={close} className="relative p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all hover:rotate-90 duration-200">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto scrollbar-hide px-6 pb-0`}>
                                    <div className="py-6 space-y-5">
                                        {/* Enhanced Title Section with Stats */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Target className="h-4 w-4 text-primary-500" />
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goal</span>
                                                    </div>
                                                    <h2 className="text-gray-900 dark:text-gray-100 font-bold text-xl leading-tight">{data?.goal?.title}</h2>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setShowTimeline(!showTimeline)}
                                                    className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all duration-200 ${showTimeline
                                                        ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 text-primary-600 dark:from-primary-900/30 dark:to-blue-900/30 dark:border-primary-600 dark:text-primary-400 shadow-lg'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:dark:bg-gray-600 shadow-sm'
                                                        }`}
                                                    title={showTimeline ? "View Details" : "View Timeline"}
                                                >
                                                    {showTimeline ? <Target className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                                </motion.button>
                                            </div>

                                            {/* Goal Stats Cards */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-blue-200/50 dark:border-blue-800/50"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                                            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Category</div>
                                                            <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{data?.goal?.category || 'General'}</div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 border border-purple-200/50 dark:border-purple-800/50"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                                            {data?.goal?.status === 'completed' ? (
                                                                <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                            ) : (
                                                                <Flag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Status</div>
                                                            <div className="text-sm font-bold text-purple-900 dark:text-purple-100 capitalize">{data?.goal?.status || 'Active'}</div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </motion.div>

                                        {showTimeline ? (
                                            /* Enhanced Vertical Timeline View */
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="relative pl-6 space-y-6 my-4"
                                            >
                                                {/* Timeline line */}
                                                <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary-300 via-blue-300 to-purple-300 dark:from-primary-700 dark:via-blue-700 dark:to-purple-700" />
                                                
                                                {timelineEvents.map((event, idx) => {
                                                    const Icon = event.icon
                                                    const isSelected = selectedEvent === event.id
                                                    const isFirst = idx === 0
                                                    const isLast = idx === timelineEvents.length - 1
                                                    
                                                    return (
                                                        <motion.div
                                                            key={event.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`relative pl-6 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                                        >
                                                            {/* Enhanced Timeline Dot */}
                                                            <motion.div
                                                                whileHover={{ scale: 1.2 }}
                                                                className={`absolute -left-[18px] top-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected
                                                                    ? 'bg-gradient-to-br from-primary-400 to-blue-500 shadow-lg scale-110 ring-4 ring-primary-100 dark:ring-primary-900/50'
                                                                    : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-md'
                                                                    }`}
                                                            >
                                                                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : event.color}`} />
                                                            </motion.div>

                                                            {/* Enhanced Content Card */}
                                                            <motion.div
                                                                whileHover={{ scale: 1.02, x: 4 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                                                                    ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 dark:from-primary-900/30 dark:to-blue-900/30 dark:border-primary-600 shadow-xl'
                                                                    : 'bg-white border-gray-200 dark:bg-gray-800/80 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-lg'
                                                                    }`}
                                                                onClick={() => handleEventClick(event)}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1.5">
                                                                            <span className={`text-sm font-bold ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                                                                                {event.title}
                                                                            </span>
                                                                            {(isFirst || isLast) && (
                                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isFirst
                                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                                    }`}>
                                                                                    {isFirst ? 'Start' : 'Latest'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                                                                            {event.description}
                                                                        </div>
                                                                        {event.timestamp && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <Clock className="h-3 w-3" />
                                                                                {new Date(event.timestamp).toLocaleString(undefined, {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </motion.div>
                                        ) : (
                                            /* Enhanced Details View */
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="space-y-4"
                                            >
                                                {selectedEvent === 'created' && (
                                                    <>
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.1 }}
                                                            className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border-2 border-emerald-200/50 dark:border-emerald-700/50 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                                                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Description</span>
                                                            </div>
                                                            <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-5'}`}>
                                                                {data?.goal?.description || 'No description provided.'}
                                                            </div>
                                                            {String(data?.goal?.description || '').length > 200 && (
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
                                                                    onClick={() => setDetailsExpanded((v) => !v)}
                                                                >
                                                                    {detailsExpanded ? 'Show less' : 'Read more'}
                                                                    <TrendingUp className={`h-3 w-3 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                                                                </motion.button>
                                                            )}
                                                        </motion.div>

                                                        {/* Goal Metadata */}
                                                        {(data?.goal?.createdAt || data?.goal?.targetDate) && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.2 }}
                                                                className="grid grid-cols-2 gap-3"
                                                            >
                                                                {data?.goal?.createdAt && (
                                                                    <div className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                                            <span className="text-xs font-medium text-gray-500">Created</span>
                                                                        </div>
                                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {new Date(data.goal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {data?.goal?.targetDate && (
                                                                    <div className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Target className="h-3.5 w-3.5 text-purple-500" />
                                                                            <span className="text-xs font-medium text-gray-500">Target</span>
                                                                        </div>
                                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {new Date(data.goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </>
                                                )}

                                                {selectedEvent === 'completed' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                    >
                                                        {data?.share?.note ? (
                                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border-2 border-emerald-200 dark:border-emerald-700/50 shadow-lg">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                                                                        <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                                    </div>
                                                                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">Completion Note</span>
                                                                </div>
                                                                <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>
                                                                    {data.share.note}
                                                                </div>
                                                                {String(data.share.note || '').length > 240 && (
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
                                                                        onClick={() => setDetailsExpanded((v) => !v)}
                                                                    >
                                                                        {detailsExpanded ? 'Show less' : 'Read more'}
                                                                        <TrendingUp className={`h-3 w-3 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                                                                    </motion.button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                                                                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                                                                <div className="text-sm text-gray-500 italic">No completion note was added.</div>
                                                            </div>
                                                        )}
                                                        {data?.goal?.completedAt && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.2 }}
                                                                className="mt-4 bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                                                            >
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                    <span className="text-xs font-medium text-gray-500">Completed On</span>
                                                                </div>
                                                                <div className="text-base font-bold text-gray-800 dark:text-gray-200">
                                                                    {new Date(data.goal.completedAt).toLocaleString(undefined, { 
                                                                        year: 'numeric', 
                                                                        month: 'long', 
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </motion.div>
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
                                <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4 flex items-center gap-2.5 sticky bottom-0 bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl shadow-2xl z-10">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleLike}
                                        disabled={liking}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${data?.social?.isLiked
                                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 dark:hover:text-red-400'
                                            }`}
                                    >
                                        <Heart className={`h-5 w-5 transition-all duration-200 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                        <span className="font-bold">{data?.social?.likeCount || 0}</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={openComments}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-600 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 dark:hover:text-purple-400 transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                        <span className="font-bold">{data?.social?.commentCount || 0}</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 15 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            try {
                                                const id = data?.social?.activityId || data?.goal?._id;
                                                const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                                                navigator.clipboard.writeText(url);
                                                window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                                            } catch { }
                                        }}
                                        className="inline-flex items-center justify-center p-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-600 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 dark:hover:text-green-400 transition-all duration-200 shadow-md hover:shadow-lg"
                                        title="Share"
                                    >
                                        <Send className="h-5 w-5" />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full w-full min-h-0">
                            {/* Enhanced Header */}
                            <div className="relative flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-blue-100/20 dark:from-purple-900/5 dark:to-blue-900/5" />
                                <div className="relative">
                                    <img
                                        src={data?.user?.avatar || '/api/placeholder/40/40'}
                                        alt={data?.user?.name || 'User'}
                                        className="w-12 h-12 rounded-full cursor-pointer ring-2 ring-white dark:ring-gray-800 hover:ring-primary-500 transition-all hover:scale-105"
                                        onClick={() => handleUserClick(data?.user?.username)} />
                                    {data?.goal?.status === 'completed' && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 ring-2 ring-white dark:ring-gray-800">
                                            <CheckCircle className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="relative flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleUserClick(data?.user?.username)}>
                                    <div className="text-base font-bold text-gray-900 dark:text-white truncate">{data?.user?.name}</div>
                                    {data?.user?.username && (<div className="text-sm text-gray-500 dark:text-gray-400">@{data.user.username}</div>)}
                                </div>
                                <button onClick={close} className="relative p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all hover:rotate-90 duration-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto scrollbar-hide`}>
                                <div className="p-6 space-y-5">
                                    {/* Enhanced Title Section with Stats */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Target className="h-4 w-4 text-primary-500" />
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goal</span>
                                                </div>
                                                <h2 className="text-gray-900 dark:text-gray-100 font-bold text-2xl leading-tight">{data?.goal?.title}</h2>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowTimeline(!showTimeline)}
                                                className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all duration-200 shadow-sm ${showTimeline
                                                    ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 text-primary-600 dark:from-primary-900/30 dark:to-blue-900/30 dark:border-primary-600 dark:text-primary-400 shadow-lg'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:dark:bg-gray-600'
                                                    }`}
                                                title={showTimeline ? "View Details" : "View Timeline"}
                                            >
                                                {showTimeline ? <Target className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                            </motion.button>
                                        </div>

                                        {/* Goal Stats Cards */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Category</div>
                                                        <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{data?.goal?.category || 'General'}</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 border border-purple-200/50 dark:border-purple-800/50 shadow-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                                        {data?.goal?.status === 'completed' ? (
                                                            <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                        ) : (
                                                            <Flag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Status</div>
                                                        <div className="text-sm font-bold text-purple-900 dark:text-purple-100 capitalize">{data?.goal?.status || 'Active'}</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>

                                    {showTimeline ? (
                                        /* Enhanced Vertical Timeline View */
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="relative pl-6 space-y-6 my-4"
                                        >
                                            {/* Timeline line */}
                                            <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary-300 via-blue-300 to-purple-300 dark:from-primary-700 dark:via-blue-700 dark:to-purple-700" />
                                            
                                            {timelineEvents.map((event, idx) => {
                                                const Icon = event.icon
                                                const isSelected = selectedEvent === event.id
                                                const isFirst = idx === 0
                                                const isLast = idx === timelineEvents.length - 1
                                                
                                                return (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={`relative pl-6 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                                    >
                                                        {/* Enhanced Timeline Dot */}
                                                        <motion.div
                                                            whileHover={{ scale: 1.2 }}
                                                            className={`absolute -left-[18px] top-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected
                                                                ? 'bg-gradient-to-br from-primary-400 to-blue-500 shadow-lg scale-110 ring-4 ring-primary-100 dark:ring-primary-900/50'
                                                                : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-md'
                                                                }`}
                                                        >
                                                            <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : event.color}`} />
                                                        </motion.div>

                                                        {/* Enhanced Content Card */}
                                                        <motion.div
                                                            whileHover={{ scale: 1.02, x: 4 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                                                                ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-300 dark:from-primary-900/30 dark:to-blue-900/30 dark:border-primary-600 shadow-xl'
                                                                : 'bg-white border-gray-200 dark:bg-gray-800/80 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-lg'
                                                                }`}
                                                            onClick={() => handleEventClick(event)}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <span className={`text-sm font-bold ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                                                                            {event.title}
                                                                        </span>
                                                                        {(isFirst || isLast) && (
                                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isFirst
                                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                                }`}>
                                                                                {isFirst ? 'Start' : 'Latest'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                                                                        {event.description}
                                                                    </div>
                                                                    {event.timestamp && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                            <Clock className="h-3 w-3" />
                                                                            {new Date(event.timestamp).toLocaleString(undefined, {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </motion.div>
                                                )
                                            })}
                                        </motion.div>
                                    ) : (
                                        /* Enhanced Details View */
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-4"
                                        >
                                            {selectedEvent === 'created' && (
                                                <>
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border-2 border-emerald-200/50 dark:border-emerald-700/50 shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                                                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            </div>
                                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Description</span>
                                                        </div>
                                                        <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>
                                                            {data?.goal?.description || 'No description provided.'}
                                                        </div>
                                                        {String(data?.goal?.description || '').length > 200 && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
                                                                onClick={() => setDetailsExpanded((v) => !v)}
                                                            >
                                                                {detailsExpanded ? 'Show less' : 'Read more'}
                                                                <TrendingUp className={`h-3 w-3 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                                                            </motion.button>
                                                        )}
                                                    </motion.div>

                                                    {/* Goal Metadata */}
                                                    {(data?.goal?.createdAt || data?.goal?.targetDate) && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="grid grid-cols-2 gap-3"
                                                        >
                                                            {data?.goal?.createdAt && (
                                                                <div className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                                        <span className="text-xs font-medium text-gray-500">Created</span>
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                        {new Date(data.goal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {data?.goal?.targetDate && (
                                                                <div className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Target className="h-3.5 w-3.5 text-purple-500" />
                                                                        <span className="text-xs font-medium text-gray-500">Target</span>
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                        {new Date(data.goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </>
                                            )}

                                            {selectedEvent === 'completed' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 }}
                                                >
                                                    {data?.share?.note ? (
                                                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border-2 border-emerald-200 dark:border-emerald-700/50 shadow-lg">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                                                                    <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">Completion Note</span>
                                                            </div>
                                                            <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>
                                                                {data.share.note}
                                                            </div>
                                                            {String(data.share.note || '').length > 240 && (
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
                                                                    onClick={() => setDetailsExpanded((v) => !v)}
                                                                >
                                                                    {detailsExpanded ? 'Show less' : 'Read more'}
                                                                    <TrendingUp className={`h-3 w-3 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                                                                </motion.button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                                                            <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                                                            <div className="text-sm text-gray-500 italic">No completion note was added.</div>
                                                        </div>
                                                    )}
                                                    {data?.goal?.completedAt && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="mt-4 bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                                <span className="text-xs font-medium text-gray-500">Completed On</span>
                                                            </div>
                                                            <div className="text-base font-bold text-gray-800 dark:text-gray-200">
                                                                {new Date(data.goal.completedAt).toLocaleString(undefined, { 
                                                                    year: 'numeric', 
                                                                    month: 'long', 
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </motion.div>
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
                            <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 sticky bottom-0 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl shadow-2xl z-10">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLike}
                                    disabled={liking}
                                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${data?.social?.isLiked
                                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 dark:hover:text-red-400'
                                        }`}
                                >
                                    <Heart className={`h-5 w-5 transition-all duration-200 ${data?.social?.isLiked ? 'fill-current' : ''}`} />
                                    <span className="font-bold">{data?.social?.likeCount || 0}</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={openComments}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-600 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 dark:hover:text-purple-400 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    <span className="font-bold">{data?.social?.commentCount || 0}</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        try {
                                            const id = data?.social?.activityId || data?.goal?._id;
                                            const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                                            navigator.clipboard.writeText(url);
                                            window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                                        } catch { }
                                    }}
                                    className="inline-flex items-center justify-center p-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-600 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 dark:hover:text-green-400 transition-all duration-200 shadow-md hover:shadow-lg"
                                    title="Share"
                                >
                                    <Send className="h-5 w-5" />
                                </motion.button>
                            </div>
                        </div>
                    )
                )}
            </motion.div>
            {/* Mobile comments bottom sheet */}
            <Suspense fallback={null}>
                <ActivityCommentsModal
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
        </motion.div>
            )}
        </AnimatePresence>
    )
}
