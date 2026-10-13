import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { X, Target, Heart, Smile, Meh, Frown, CircleSlash2, CheckCircle, ChevronRight, Flag, Share2, MoreHorizontal } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
import toast from 'react-hot-toast';
import ConfirmActionModal from './ConfirmActionModal';
import GoalHero from './GoalHero';
import { goalsAPI } from '../services/api';
import AnalyticsRangeSelect from './AnalyticsRangeSelect';
import ActivityCalendar from './ActivityCalendar';
import { getDateKeyInTimezone } from '../utils/timezoneUtils';
const ShareModal = lazy(() => import('./ShareModal'));

const THEME_COLOR = '#4c99e6'

const EMOTIONS = [
  { id: 'great', label: 'GREAT', icon: Heart },
  { id: 'good', label: 'GOOD', icon: Smile },
  { id: 'okay', label: 'OKAY', icon: Meh },
  { id: 'challenging', label: 'TOUGH', icon: Frown },
  { id: 'neutral', label: 'SKIP', icon: CircleSlash2 }
]

function GoalAnalyticsPanel({ data, fallbackGoal, loading, days, onDaysChange }) {
  const rangePicker = <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-[#0b1746] dark:text-white">Analytics</p><p className="text-[10px] text-slate-500">Metrics for the selected period</p></div><AnalyticsRangeSelect value={days} onChange={onDaysChange}/></div>
  if (loading) return <div>{rangePicker}<p className="py-12 text-center text-sm text-gray-500">Loading analytics…</p></div>
  const goal = data?.goal || fallbackGoal
  const updates = goal?.updates || []
  const metrics = data?.metrics || {}
  const progress = Math.round(Number(metrics.progress ?? (goal?.completedAt ? 100 : goal?.progress?.percent) ?? 0))
  const series = metrics.progressSeries?.length ? metrics.progressSeries : [{ progress: 0 }, { progress }]
  const points = series.map((item, index) => ({ x: 14 + (index * 272 / Math.max(1, series.length - 1)), y: 102 - (Number(item.progress) * .82) }))
  const moodMeta = { great: ['Amazing', 'bg-emerald-500', 'text-emerald-600', '😊'], good: ['Good', 'bg-sky-500', 'text-sky-600', '🙂'], okay: ['Okay', 'bg-amber-400', 'text-amber-600', '😐'], challenging: ['Tough', 'bg-rose-400', 'text-rose-600', '😓'], neutral: ['Neutral', 'bg-slate-400', 'text-slate-500', '•'] }
  return <div className="space-y-5 pb-3">
    {rangePicker}
    <section><h3 className="text-sm font-extrabold text-[#0b1746] dark:text-white">Progress Over Time</h3><div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"><svg viewBox="0 0 300 120" className="h-36 w-full" role="img" aria-label={`Progress is ${progress}%`}><g stroke="#e8eef5">{[20,45,70,95].map(y=><line key={y} x1="14" y1={y} x2="286" y2={y}/>)}</g><polyline points={points.map(point=>`${point.x},${point.y}`).join(' ')} fill="none" stroke="#1683ed" strokeWidth="3" strokeLinecap="round"/>{points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="4" fill="#1683ed" stroke="white" strokeWidth="2"/>)}</svg><div className="flex justify-between px-1 text-[10px] text-slate-400"><span>Start</span><span className="font-bold text-[#1683ed]">{progress}% now</span></div></div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Progress Updates</h3><div className="grid grid-cols-2 gap-2"><MetricCard value={metrics.progressUpdates ?? updates.filter(item=>item.text?.trim()).length} label="Total updates"/><MetricCard value={metrics.activeDays ?? 0} label="Active days"/></div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Consistency</h3><div className="grid grid-cols-2 gap-2"><MetricCard value={`${metrics.consistency ?? 0}%`} label="Recent consistency"/><MetricCard value={metrics.eligibleWeeks ? `${metrics.activeWeeks}/${metrics.eligibleWeeks}` : '—'} label="Active weeks"/></div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Mood Distribution</h3>{(metrics.moodSamples ?? 0) < 2 ? <div className="rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 dark:border-gray-700 dark:bg-gray-800">Log your mood with a few updates to see a meaningful distribution.</div> : <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">{metrics.moodDistribution.map(item=>{const meta=moodMeta[item.emotion]||[item.emotion,'bg-slate-400','text-slate-600','•']; return <div key={item.emotion} className="grid grid-cols-[82px_1fr_34px] items-center gap-2"><span className={`text-[11px] font-semibold ${meta[2]}`}>{meta[3]} {meta[0]}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className={`block h-full rounded-full ${meta[1]}`} style={{width:`${item.percent}%`}}/></span><span className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">{item.percent}%</span></div>})}</div>}</section>
  </div>
}

function MetricCard({ value, label }) { return <div className="rounded-2xl border border-slate-100 bg-white px-3 py-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xl font-extrabold text-[#0b1746] dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div> }

export default function GoalDetailsModal({ goal, isOpen, onClose, onViewPost, initialView = 'overview' }) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareMoment, setShareMoment] = useState(null)
  const [completionSummary, setCompletionSummary] = useState(null)
  useEffect(() => {
    if (!isOpen || !goal?.completedAt) { setCompletionSummary(null); return }
    let active = true
    goalsAPI.getShareContext(goal.id || goal._id, { shareType: 'COMPLETION' }).then(response => { if (active) setCompletionSummary(response.data.data) }).catch(() => {})
    return () => { active = false }
  }, [isOpen, goal?.id, goal?._id, goal?.completedAt])
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState(null)
  const [hasTodayUpdate, setHasTodayUpdate] = useState(false)
  const [isUpdatesPublic, setIsUpdatesPublic] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [activeView, setActiveView] = useState('overview')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [isLoadingView, setIsLoadingView] = useState(false)
  const [journeyHasMore, setJourneyHasMore] = useState(false)
  const [journeyLoadingMore, setJourneyLoadingMore] = useState(false)
  const moreMenuRef = useRef(null)
  const journeyLoaderRef = useRef(null)
  const { user } = useApiStore()

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !goal) return

    const goalId = goal?.id || goal?._id
    const isCompleted = !!goal?.completedAt
    setIsMoreMenuOpen(false)
    setActiveView(initialView)
    setIsUpdatesPublic(goal?.isUpdatesPublic !== false)

    if (!goalId || isCompleted) {
      setUpdateText('')
      setSelectedEmotion(null)
      setHasTodayUpdate(false)
      return
    }

    let isMounted = true
    ;(async () => {
      setIsLoadingUpdate(true)
      const res = await useApiStore.getState().getGoalUpdateToday(goalId)
      if (!isMounted) return

      if (typeof res?.isUpdatesPublic === 'boolean') {
        setIsUpdatesPublic(res.isUpdatesPublic)
      }

      if (res?.success && res.goalUpdate) {
        setUpdateText(res.goalUpdate.text || '')
        setSelectedEmotion(res.goalUpdate.emotion || null)
        setHasTodayUpdate(true)
      } else {
        setUpdateText('')
        setSelectedEmotion(null)
        setHasTodayUpdate(false)
      }

      setIsLoadingUpdate(false)
    })()

    return () => {
      isMounted = false
    }
  }, [goal, initialView, isOpen])

  useEffect(() => {
    if (!isOpen || !goal || activeView === 'log') return
    const id = goal.id || goal._id
    if (!id) return
    let mounted = true
    setIsLoadingView(true)
    ;(async () => {
      if (activeView === 'analytics' || activeView === 'overview') {
        const response = await useApiStore.getState().getGoalAnalytics(id, { days: analyticsDays })
        if (mounted && response?.success) setAnalyticsData(response.data || null)
      } else {
        const response = await useApiStore.getState().getGoalTimeline(id, { limit: 50, offset: 0 })
        const data = response?.data || response
        if (mounted && response?.success) {
          setTimelineEvents(data?.timeline || data?.events || [])
          setJourneyHasMore(Boolean(data?.pagination?.hasMore))
        }
      }
      if (mounted) setIsLoadingView(false)
    })()
    return () => { mounted = false }
  }, [activeView, analyticsDays, goal, isOpen])

  useEffect(() => {
    if (activeView !== 'journey' || !journeyHasMore || journeyLoadingMore || isLoadingView) return
    const target = journeyLoaderRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      observer.disconnect()
      setJourneyLoadingMore(true)
      const id = goal?.id || goal?._id
      useApiStore.getState().getGoalTimeline(id, { limit: 10, offset: timelineEvents.length }).then(response => {
        const data = response?.data || response
        if (!response?.success) { setJourneyHasMore(false); return }
        setTimelineEvents(current => {
          const known = new Set(current.map((event,index) => String(event.id || `${event.type}-${event.timestamp || event.dateKey}-${index}`)))
          return [...current, ...(data?.timeline || []).filter((event,index) => !known.has(String(event.id || `${event.type}-${event.timestamp || event.dateKey}-${index + current.length}`)))]
        })
        setJourneyHasMore(Boolean(data?.pagination?.hasMore))
      }).finally(() => setJourneyLoadingMore(false))
    }, { root: null, rootMargin: '160px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [activeView, goal, isLoadingView, journeyHasMore, journeyLoadingMore, timelineEvents.length])

  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [isOpen])

  if (!isOpen || !goal) {
    return null
  }

  const goalId = goal?.id || goal?._id || ''
  const isCompleted = !!goal?.completedAt
  const trimmedText = updateText.trim()
  const canSubmit = !isCompleted && !isSubmitting && (trimmedText.length > 0 || !!selectedEmotion)
  const isGoalLogBusy = isLoadingUpdate || isSubmitting
  const goalCalendarMarks = (() => {
    const marks = {}
    timelineEvents.forEach(event => {
      const rawDate = event.dateKey || event.date || event.createdAt || event.timestamp
      if (!rawDate) return
      const key = event.dateKey || getDateKeyInTimezone(rawDate)
      marks[key] = { label: 'Progress logged', className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300', dotClassName: 'bg-sky-500' }
    })
    if (goal.createdAt) marks[getDateKeyInTimezone(goal.createdAt)] = { label: 'Goal started', className: 'bg-blue-100 text-blue-800 ring-1 ring-blue-400 dark:bg-blue-950/50 dark:text-blue-200', dotClassName: 'bg-blue-600' }
    if (goal.completedAt) marks[getDateKeyInTimezone(goal.completedAt)] = { label: 'Goal completed', className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200', dotClassName: 'bg-emerald-600' }
    return marks
  })()
  
  const handleViewPost = () => {
    if (!goalId) return
    setIsMoreMenuOpen(false)
    if (onViewPost) {
      onViewPost(goalId)
    } else {
      onClose?.()
      navigate(`/goals/${goalId}`)
    }
  }

  const handleShare = (e) => {
    e?.stopPropagation()
    setIsMoreMenuOpen(false)
    setShareMoment(null)
    setIsShareModalOpen(true)
  }

  const handleToggleUpdatesPublic = () => {
    if (isCompleted || isSubmitting || isLoadingUpdate) return
    setIsUpdatesPublic((prev) => !prev)
  }

  const handleSubmitUpdate = async () => {
    if (!canSubmit || !goalId) return

    setIsSubmitting(true)
    const res = await useApiStore.getState().upsertGoalUpdateToday(goalId, {
      text: trimmedText || null,
      emotion: selectedEmotion || null,
      isUpdatesPublic
    })
    setIsSubmitting(false)

    if (res?.success) {
      setHasTodayUpdate(true)
      toast.success('Update logged successfully')
      return
    }

    toast.error(res?.error || 'Failed to log update')
  }

  const handleClearToday = async () => {
    if (!goalId || isCompleted) return

    setIsClearConfirmOpen(true)
  }

  const confirmClearToday = async () => {
    if (!goalId || isCompleted) return

    setIsSubmitting(true)
    const res = await useApiStore.getState().clearGoalUpdateToday(goalId)
    setIsSubmitting(false)
    if (res?.success) {
      setUpdateText('')
      setSelectedEmotion(null)
      setHasTodayUpdate(false)
      setIsClearConfirmOpen(false)
      toast.success('Update cleared successfully')
      return
    }

    toast.error(res?.error || 'Failed to clear update')
  }

  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} style={{ zIndex: 9998 }} />
      <div
        className="relative flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-gray-900 sm:h-[min(86dvh,780px)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-gray-700"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui', zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <button type="button" onClick={() => activeView === 'log' ? setActiveView('overview') : onClose?.()} aria-label={activeView === 'log' ? 'Back to goal overview' : 'Close goal details'} className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0b1746] hover:bg-slate-100 dark:text-white dark:hover:bg-gray-800 sm:hidden"><ChevronRight className="h-5 w-5 rotate-180"/></button>
            <Target className="hidden h-4 w-4 shrink-0 text-[#1683ed] sm:block" />
            <span className="min-w-0 truncate text-sm">{activeView === 'log' ? 'Log Progress' : goal.title}</span>
          </div>
          <div ref={moreMenuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Goal actions"
              aria-expanded={isMoreMenuOpen}
              onClick={() => setIsMoreMenuOpen(value => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683ed] dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <button type="button" onClick={handleShare} className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-sm text-[#2369aa] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-700">
                  <Share2 className="h-4 w-4" />
                  {isCompleted ? 'Share Achievement' : 'Share Goal'}
                </button>
                {!isCompleted && (
                  <button type="button" onClick={() => { setShareMoment({ shareType: 'PROGRESS' }); setIsMoreMenuOpen(false); setIsShareModalOpen(true) }} className="min-h-[44px] w-full rounded-lg px-3 text-left text-sm text-[#2369aa] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-700">
                    Share Progress
                  </button>
                )}
                <button type="button" onClick={handleViewPost} className="min-h-[44px] w-full rounded-lg px-3 text-left text-sm text-slate-600 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700">
                  View Post
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:flex"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {activeView !== 'log' && <div className="grid grid-cols-3 border-b border-gray-100 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
          {[
            ['overview', 'Overview'],
            ['journey', 'Journey'],
            ['analytics', 'Analytics']
          ].map(([view, label]) => (
            <button key={view} type="button" onClick={() => setActiveView(view)} className={`relative px-2 py-3 text-xs font-semibold transition-colors ${activeView === view ? 'text-[#1683ed]' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              {label}
              {activeView === view && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#1683ed]" />}
            </button>
          ))}
        </div>}

        {activeView !== 'log' && (
          <div className={`min-h-0 flex-1 overflow-y-auto px-5 pt-5 sm:px-8 sm:pt-6 pb-24 sm:pb-28`}>
            {activeView === 'overview' && (
                <div className="space-y-4">
                <GoalHero goal={goal} />
                 {goal.description && <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{goal.description}</p>}
                 <div className="grid grid-cols-2 gap-2"><MetricCard value={goal.targetDate ? new Date(goal.targetDate).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}) : 'No date'} label="Target date"/><MetricCard value={new Date(goal.createdAt).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})} label="Created"/></div>
                 {!isCompleted && <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#0b1746] dark:text-white">Goal Health</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#1683ed] dark:bg-blue-950/40">{goal.healthLabel || 'Getting Started'}</span></div><p className="mt-3 text-xs text-slate-500">{goal.healthReason || 'Log meaningful progress to build your health insight.'}</p></div>}
                 {isCompleted ? <div className="grid grid-cols-3 gap-2">{completionSummary?.journeyDuration !== undefined && <MetricCard value={completionSummary.journeyDuration} label="Journey days"/>}{completionSummary?.progressUpdateCount !== undefined && <MetricCard value={completionSummary.progressUpdateCount} label="Progress updates"/>}{completionSummary?.activeDays !== undefined && <MetricCard value={completionSummary.activeDays} label="Active days"/>}</div> : <div className="grid grid-cols-3 gap-2"><MetricCard value={analyticsData?.metrics?.overdueDays ? `${analyticsData.metrics.overdueDays}d` : analyticsData?.metrics?.daysLeft ?? '—'} label={analyticsData?.metrics?.overdueDays ? 'Overdue' : 'Days left'}/><MetricCard value={analyticsData?.metrics?.progressUpdates ?? 0} label="Updates"/><MetricCard value={`${analyticsData?.metrics?.consistency ?? 0}%`} label="Recent consistency"/></div>}
              </div>
            )}
            {activeView === 'journey' && (
              <>
              <div className="mb-3"><ActivityCalendar title="Calendar view" subtitle="Start, progress logs, and completion" marks={goalCalendarMarks} initialDate={goal.completedAt ? getDateKeyInTimezone(goal.completedAt) : undefined} legend={[{label:'Started',dotClassName:'bg-blue-600'},{label:'Progress log',dotClassName:'bg-sky-500'},{label:'Completed',dotClassName:'bg-emerald-600'}]} /></div>
              <div className="space-y-3"><div className="mb-4"><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your goal journey</p><p className="mt-1 text-xs text-gray-500">From the first step to completion, with meaningful updates in between.</p></div>{isLoadingView && <p className="py-8 text-center text-sm text-gray-500">Loading journey...</p>}{!isLoadingView && (timelineEvents.length ? timelineEvents : [{ type: 'goal_created', title: 'Goal Started', timestamp: goal.createdAt }]).map((event, index, events) => { const isStart = event.type === 'goal_created'; const isDone = event.type === 'goal_completed'; const title = isStart ? 'Goal Started' : isDone ? 'Goal Completed' : event.title || 'Progress Update'; const date = event.dateKey ? `${event.dateKey}T12:00:00` : event.date || event.createdAt || event.timestamp; return <div key={event.id || `${event.type}-${date}-${index}`} className="flex gap-3"><div className="flex flex-col items-center"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600' : isStart ? 'bg-blue-50 text-[#1683ed]' : 'bg-sky-50 text-sky-600'}`}>{isDone ? <CheckCircle className="h-4 w-4"/> : isStart ? <Target className="h-4 w-4"/> : <Flag className="h-4 w-4"/>}</span>{index < events.length - 1 && <span className="my-1 min-h-9 w-px flex-1 bg-blue-200"/>}</div><div className="pb-5"><p className="text-xs text-gray-500">{date ? new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p><p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>{event.description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{event.description}</p>}{event.type === 'milestone' && <button type="button" onClick={() => { setShareMoment({ shareType: 'MILESTONE', eventId: event.id }); setIsShareModalOpen(true) }} className="mt-2 min-h-[44px] text-xs font-semibold text-[#2369aa]">Share milestone</button>}</div></div>})}<div ref={journeyLoaderRef} className="flex min-h-10 items-center justify-center">{journeyLoadingMore&&<span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]"/>}{!journeyHasMore&&timelineEvents.length>0&&<span className="text-[10px] text-slate-400">You’ve reached the beginning.</span>}</div></div>
              </>
            )}
            {activeView === 'analytics' && (
              <GoalAnalyticsPanel data={analyticsData} fallbackGoal={goal} loading={isLoadingView} days={analyticsDays} onDaysChange={setAnalyticsDays}/>
            )}
          </div>
        )}

        {activeView !== 'log' && isCompleted && <div className="absolute inset-x-0 bottom-0 z-20 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900 sm:px-8"><button type="button" onClick={() => setActiveView('journey')} className="min-h-[48px] flex-1 rounded-xl border border-blue-200 px-3 py-3 text-sm font-semibold text-[#2369aa]">View Journey</button><button type="button" onClick={handleShare} className="min-h-[48px] flex-1 rounded-xl bg-[#4c99e6] px-3 py-3 text-sm font-semibold text-white">Share Achievement</button></div>}
        {activeView !== 'log' && !isCompleted && <div className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-gray-700 dark:bg-gray-900 sm:px-8"><button type="button" onClick={() => setActiveView('log')} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white shadow-sm"><Target className="h-4 w-4" /> Log Progress</button></div>}

        {activeView === 'log' && <div className="px-5 py-5 sm:px-8 sm:py-6 space-y-5 overflow-y-auto scrollbar-hide flex-1 min-h-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-[11px] font-bold uppercase tracking-wide text-[#1683ed]">Today’s progress</p><h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{goal.title}</h3></div>

          {isCompleted ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">This goal is completed</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Daily logging is disabled for completed goals.</p>
            </div>
          ) : (
          <div className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">What did you accomplish today?</label>
                <textarea
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value.slice(0, 300))}
                  placeholder="Share your progress, small wins, or lessons learned..."
                  disabled={isCompleted || isLoadingUpdate || isSubmitting}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#4c99e6]/40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{trimmedText.length}/300</span>
                </div>

                {isGoalLogBusy && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-[#4c99e6] animate-spin" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isLoadingUpdate ? 'Loading goal update...' : 'Updating goal log...'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 text-center">How are you feeling about your progress?</p>
                <div className="grid grid-cols-5 gap-3">
                  {EMOTIONS.map((emotion) => {
                    const Icon = emotion.icon
                    const isSelected = selectedEmotion === emotion.id
                    return (
                      <button
                        key={emotion.id}
                        type="button"
                        disabled={isCompleted || isSubmitting}
                        onClick={() => setSelectedEmotion((prev) => prev === emotion.id ? null : emotion.id)}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#4c99e6] border-[#4c99e6] text-white'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-[#4c99e6]' : 'text-gray-400'}`}>
                          {emotion.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Make updates public</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Share progress with the Growth Feed</p>
                </div>
                <button
                  type="button"
                  disabled={isCompleted || isSubmitting || isLoadingUpdate}
                  onClick={handleToggleUpdatesPublic}
                  aria-pressed={isUpdatesPublic}
                  className={`relative inline-flex h-6 w-11 items-center overflow-hidden rounded-full transition-colors ${isUpdatesPublic ? 'bg-[#4c99e6]' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-60`}
                >
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isUpdatesPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
          </div>
          )}
        </div>}

        {activeView === 'log' && <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {hasTodayUpdate && !isCompleted ? (
              <button
                type="button"
                onClick={handleClearToday}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Clear today
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2">
              {!isCompleted && (
                <button
                  type="button"
                  onClick={handleSubmitUpdate}
                  disabled={!canSubmit || isLoadingUpdate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                   {isSubmitting ? 'Saving...' : 'Save Log'}
                </button>
              )}
            </div>
          </div>
        </div>}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <Suspense fallback={null}>
          <ShareModal
            shareType={shareMoment?.shareType}
            eventId={shareMoment?.eventId}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            goal={goal}
            user={user}
          />
        </Suspense>
      )}

      <ConfirmActionModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearToday}
        title="Clear today's update?"
        message="This will remove your goal update for today."
        confirmText="Clear today"
        isLoading={isSubmitting}
      />
    </div>
  )
}
