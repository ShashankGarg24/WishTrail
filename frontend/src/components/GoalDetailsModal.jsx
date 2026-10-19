import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { X, Target, Heart, Smile, Meh, Frown, CircleSlash2, CheckCircle, ChevronRight, Flag, Share2, MoreHorizontal, MoreVertical, CalendarDays, CalendarClock, BookOpen, Activity, CalendarCheck, MessageSquare } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
import toast from 'react-hot-toast';
import ConfirmActionModal from './ConfirmActionModal';
import GoalHero from './GoalHero';
import { goalsAPI } from '../services/api';
import AnalyticsRangeSelect from './AnalyticsRangeSelect';
import ActivityCalendar from './ActivityCalendar';
import { formatDateInTimezone, getCurrentDateKey, getDateKeyInTimezone } from '../utils/timezoneUtils';
const ShareModal = lazy(() => import('./ShareModal'));

const THEME_COLOR = '#4c99e6'

const journeyEventTime = event => {
  const value = event?.timestamp || event?.dateKey || event?.createdAt
  const time = new Date(value || 0).getTime()
  return Number.isNaN(time) ? 0 : time
}

const EMOTIONS = [
  { id: 'great', label: 'GREAT', icon: Heart },
  { id: 'good', label: 'GOOD', icon: Smile },
  { id: 'okay', label: 'OKAY', icon: Meh },
  { id: 'challenging', label: 'TOUGH', icon: Frown },
  { id: 'neutral', label: 'SKIP', icon: CircleSlash2 }
]

const JOURNEY_MOODS = {
  great: { label: 'Amazing', icon: Heart, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  good: { label: 'Good', icon: Smile, className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  okay: { label: 'Okay', icon: Meh, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  challenging: { label: 'Tough', icon: Frown, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  neutral: { label: 'Neutral', icon: CircleSlash2, className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
}

function GoalAnalyticsPanel({ data, fallbackGoal, loading, days, onDaysChange }) {
  const rangePicker = <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-[#0b1746] dark:text-white">Analytics</p><p className="text-[10px] text-slate-500">Metrics for the selected period</p></div><AnalyticsRangeSelect value={days} onChange={onDaysChange}/></div>
  if (loading) return <div>{rangePicker}<p className="py-12 text-center text-sm text-gray-500">Loading analytics…</p></div>
  const goal = data?.goal || fallbackGoal
  const updates = goal?.updates || []
  const metrics = data?.metrics || {}
  const progress = Math.round(Number(metrics.progress ?? (goal?.completedAt ? 100 : goal?.progress?.percent) ?? 0))
  const activityDays = metrics.activityDays || []
  const weeklyActivity = metrics.weeklyActivity || []
  const maxWeeklyUpdates = Math.max(1, ...weeklyActivity.map(item => Number(item.progressUpdates || 0)))
  const moodMeta = {
    great: ['Amazing', 'bg-emerald-500', 'text-emerald-600', Heart],
    good: ['Good', 'bg-sky-500', 'text-sky-600', Smile],
    okay: ['Okay', 'bg-amber-400', 'text-amber-600', Meh],
    challenging: ['Tough', 'bg-rose-400', 'text-rose-600', Frown],
    neutral: ['Neutral', 'bg-slate-400', 'text-slate-500', CircleSlash2]
  }
  const recencyCopy = metrics.daysSinceLastCheckIn == null
    ? 'No check-ins yet. Your first log will start the activity picture.'
    : metrics.daysSinceLastCheckIn === 0
      ? 'You checked in today.'
      : `Your latest check-in was ${metrics.daysSinceLastCheckIn} ${metrics.daysSinceLastCheckIn === 1 ? 'day' : 'days'} ago.`
  return <div className="space-y-5 pb-3">
    {rangePicker}
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/30 dark:to-gray-800">
      <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1683ed]">Current progress</p><p className="mt-1 text-3xl font-extrabold text-[#0b1746] dark:text-white">{progress}%</p></div><Target className="h-7 w-7 text-blue-300 dark:text-blue-600" /></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-blue-100 dark:bg-gray-700 dark:ring-blue-900"><span className="block h-full rounded-full bg-[#1683ed] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Current completion from your goal components. Historical progress snapshots are not recorded, so no artificial trend line is shown.</p>
    </section>

    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Activity at a glance</h3><div className="grid grid-cols-3 gap-2"><AnalyticsMetric icon={MessageSquare} value={metrics.goalLogs ?? updates.length} label="Goal logs"/><AnalyticsMetric icon={CalendarCheck} value={metrics.checkInDays ?? metrics.activeDays ?? 0} label="Check-in days"/><AnalyticsMetric icon={Activity} value={metrics.progressUpdates ?? updates.filter(item=>item.text?.trim()).length} label="Written updates"/></div><p className="mt-2 text-[10px] text-slate-400">Last {days} days · mood-only check-ins count as logs, not written progress.</p></section>

    <section><div className="mb-3"><h3 className="text-sm font-extrabold text-[#0b1746] dark:text-white">Activity rhythm</h3><p className="mt-0.5 text-[10px] text-slate-500">Each square is one day</p></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="grid w-fit grid-cols-7 gap-1.5">{activityDays.map(item=><span key={item.date} title={`${formatDateInTimezone(`${item.date}T12:00:00`, { month: 'short', day: 'numeric' })}: ${item.logs} ${item.logs === 1 ? 'log' : 'logs'}`} className={`h-5 w-5 rounded-[5px] ring-1 sm:h-6 sm:w-6 ${item.progressUpdates > 0 ? 'bg-blue-500 ring-blue-500' : item.logs > 0 ? 'bg-violet-300 ring-violet-300 dark:bg-violet-600 dark:ring-violet-600' : 'bg-slate-50 ring-slate-100 dark:bg-gray-700 dark:ring-gray-700'}`} />)}</div><div className="mt-3 flex flex-wrap gap-3 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-500"/>Written update</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-violet-300 dark:bg-violet-600"/>Mood check-in</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-100 dark:bg-gray-700"/>No log</span></div><p className="mt-3 border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-500 dark:border-gray-700 dark:text-slate-400">{recencyCopy}</p></div></section>

    <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#0b1746] dark:text-white">Weekly consistency</h3><span className="text-sm font-extrabold text-[#1683ed]">{metrics.consistency ?? 0}%</span></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className="block h-full rounded-full bg-[#1683ed]" style={{width:`${metrics.consistency ?? 0}%`}}/></div><p className="mt-2 text-[10px] text-slate-500">Meaningful progress in {metrics.activeWeeks ?? 0} of {metrics.eligibleWeeks ?? 0} eligible weeks.</p>{weeklyActivity.length > 0 && <div className="mt-4 flex h-24 items-end gap-2 border-t border-slate-100 pt-3 dark:border-gray-700">{weeklyActivity.map(item=><div key={item.weekStart} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-semibold text-slate-500">{item.progressUpdates}</span><span className={`w-full max-w-12 rounded-t-md ${item.progressUpdates ? 'bg-[#62aaf2]' : 'bg-slate-100 dark:bg-gray-700'}`} style={{height:`${item.progressUpdates ? Math.max(12,(item.progressUpdates/maxWeeklyUpdates)*100) : 6}%`}}/><span className="text-[8px] text-slate-400">{formatDateInTimezone(`${item.weekStart}T12:00:00`, { month: 'short', day: 'numeric' })}</span></div>)}</div>}</div></section>

    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">How progress felt</h3>{(metrics.moodSamples ?? 0) < 2 ? <div className="rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 dark:border-gray-700 dark:bg-gray-800">Add a mood to at least two goal logs to see a useful pattern.</div> : <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">{metrics.moodDistribution.map(item=>{const meta=moodMeta[item.emotion]||[item.emotion,'bg-slate-400','text-slate-600',CircleSlash2];const MoodIcon=meta[3];return <div key={item.emotion} className="grid grid-cols-[88px_1fr_38px] items-center gap-2"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${meta[2]}`}><MoodIcon className="h-3.5 w-3.5"/>{meta[0]}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className={`block h-full rounded-full ${meta[1]}`} style={{width:`${item.percent}%`}}/></span><span className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">{item.percent}%</span></div>})}<p className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-gray-700">Based on {metrics.moodSamples} mood check-ins in this period.</p></div>}</section>
  </div>
}

function AnalyticsMetric({ icon: Icon, value, label }) { return <div className="rounded-2xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"><Icon className="mx-auto h-4 w-4 text-blue-400"/><p className="mt-1.5 text-lg font-extrabold text-[#0b1746] dark:text-white">{value}</p><p className="mt-0.5 text-[9px] leading-tight text-slate-500">{label}</p></div> }

function MetricCard({ value, label }) { return <div className="rounded-2xl border border-slate-100 bg-white px-3 py-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xl font-extrabold text-[#0b1746] dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div> }

function GoalDateCard({ icon: Icon, label, date, emptyLabel, detail, tone = 'blue' }) {
  const colors = tone === 'amber'
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    : 'bg-blue-50 text-[#1683ed] dark:bg-blue-950/40 dark:text-blue-300'
  const formattedDate = date ? formatDateInTimezone(date, { day: 'numeric', month: 'short', year: 'numeric' }) : emptyLabel

  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colors}`}><Icon className="h-[18px] w-[18px]" /></span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{formattedDate}</p>
      {detail && <p className={`mt-0.5 text-[10px] ${tone === 'amber' ? 'font-semibold text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>{detail}</p>}
    </div>
  </div>
}

function JourneyEvent({ event, isLast, openMenuId, onToggleMenu, onEditLog, onDeleteLog, onShareMilestone }) {
  const isStart = event.type === 'goal_created'
  const isDone = event.type === 'goal_completed'
  const isLog = event.type === 'progress_update'
  const date = event.dateKey ? `${event.dateKey}T12:00:00` : event.date || event.createdAt || event.timestamp
  const title = isStart ? 'Goal started' : isDone ? 'Goal completed' : isLog ? 'Goal log' : event.title || 'Milestone'
  const mood = isLog ? JOURNEY_MOODS[String(event.emotion || '').toLowerCase()] : null
  const MoodIcon = mood?.icon
  const MarkerIcon = isDone ? CheckCircle : isLog ? BookOpen : isStart ? Target : Flag
  const markerColors = isDone
    ? 'bg-emerald-100 text-emerald-700 ring-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-950/30'
    : isLog
      ? 'bg-sky-100 text-sky-700 ring-sky-50 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-950/30'
      : 'bg-blue-100 text-[#1683ed] ring-blue-50 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-950/30'

  return <article className="flex gap-3">
    <div className="flex flex-col items-center">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ${markerColors}`}><MarkerIcon className="h-[18px] w-[18px]" /></span>
      {!isLast && <span className="my-1 min-h-6 w-0.5 flex-1 rounded-full bg-gradient-to-b from-blue-200 to-slate-100 dark:from-blue-800 dark:to-gray-700" />}
    </div>
    <div className={`relative mb-4 min-w-0 flex-1 ${isLog ? 'rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-sky-900/60 dark:bg-gray-800' : 'pb-3 pt-0.5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{date ? formatDateInTimezone(date, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
          <h3 className={`mt-1 font-bold text-slate-900 dark:text-white ${isLog ? 'text-sm' : 'text-[15px]'}`}>{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {mood && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${mood.className}`}><MoodIcon className="h-3 w-3" />{mood.label}</span>}
          {isLog && event.updateId != null && <button type="button" aria-label="Goal log actions" onClick={() => onToggleMenu(openMenuId === String(event.updateId) ? null : String(event.updateId))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-gray-700"><MoreVertical className="h-4 w-4" /></button>}
        </div>
      </div>
      {event.description
        ? <p className={`${isLog ? 'mt-3 whitespace-pre-wrap border-l-2 border-sky-200 pl-3 text-sm leading-relaxed text-slate-600 dark:border-sky-800 dark:text-slate-300' : 'mt-1.5 text-xs leading-relaxed text-slate-500'}`}>{event.description}</p>
        : isLog && <p className="mt-3 text-xs italic text-slate-400">Mood check-in</p>}
      {event.type === 'milestone' && <button type="button" onClick={() => onShareMilestone(event.id)} className="mt-2 min-h-[44px] text-xs font-semibold text-[#2369aa]">Share milestone</button>}
      {isLog && openMenuId === String(event.updateId) && <div className="absolute right-3 top-14 z-20 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"><button type="button" onClick={() => onEditLog(event)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1683ed] dark:text-slate-200 dark:hover:bg-gray-800">Edit log</button><button type="button" onClick={() => onDeleteLog(event)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">Delete log</button></div>}
    </div>
  </article>
}

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
  const [journeyCalendarEvents, setJourneyCalendarEvents] = useState([])
  const [isLoadingView, setIsLoadingView] = useState(false)
  const [journeyHasMore, setJourneyHasMore] = useState(false)
  const [journeyLoadingMore, setJourneyLoadingMore] = useState(false)
  const [openJourneyLogMenu, setOpenJourneyLogMenu] = useState(null)
  const [editingGoalLog, setEditingGoalLog] = useState(null)
  const [goalLogToDelete, setGoalLogToDelete] = useState(null)
  const [isDeletingGoalLog, setIsDeletingGoalLog] = useState(false)
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
    setOpenJourneyLogMenu(null)
    setEditingGoalLog(null)
    setGoalLogToDelete(null)
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
        setTimelineEvents([])
        setJourneyCalendarEvents([])
        const response = await useApiStore.getState().getGoalTimeline(id, { limit: 50, offset: 0 })
        const data = response?.data || response
        if (mounted && response?.success) {
          setTimelineEvents(data?.timeline || data?.events || [])
          setJourneyCalendarEvents(data?.calendarEvents || data?.timeline || data?.events || [])
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
  const displayedTimelineEvents = [...(timelineEvents.length ? timelineEvents : [{ type: 'goal_created', title: 'Goal Started', timestamp: goal.createdAt }])]
    .sort((a, b) => journeyEventTime(b) - journeyEventTime(a))
  const goalMetrics = analyticsData?.metrics
  const targetDateDetail = goal.targetDate
    ? isCompleted
      ? null
      : goalMetrics?.overdueDays
      ? `${goalMetrics.overdueDays} ${goalMetrics.overdueDays === 1 ? 'day' : 'days'} overdue`
      : goalMetrics?.daysLeft === 0
        ? 'Due today'
        : goalMetrics?.daysLeft != null
          ? `${goalMetrics.daysLeft} ${goalMetrics.daysLeft === 1 ? 'day' : 'days'} left`
          : null
    : 'Add one when you are ready'
  const trimmedText = updateText.trim()
  const canSubmit = (!isCompleted || !!editingGoalLog) && !isSubmitting && (trimmedText.length > 0 || !!selectedEmotion)
  const isGoalLogBusy = isLoadingUpdate || isSubmitting
  const goalCalendarMarks = (() => {
    const marks = {}
    const addMark = (key, indicator, label) => {
      if (!key) return
      const mark = marks[key] || { labels: [], indicators: [] }
      if (!mark.labels.includes(label)) mark.labels.push(label)
      if (!mark.indicators.includes(indicator)) mark.indicators.push(indicator)
      marks[key] = mark
    }
    ;(journeyCalendarEvents.length ? journeyCalendarEvents : timelineEvents).forEach(event => {
      if (event.type !== 'progress_update') return
      const rawDate = event.dateKey || event.date || event.createdAt || event.timestamp
      if (rawDate) addMark(event.dateKey || getDateKeyInTimezone(rawDate), 'log', 'Goal log')
    })
    if (goal.createdAt) addMark(getDateKeyInTimezone(goal.createdAt), 'start', 'Goal started')
    if (goal.completedAt) addMark(getDateKeyInTimezone(goal.completedAt), 'end', 'Goal completed')
    Object.values(marks).forEach(mark => {
      mark.label = mark.labels.join(' · ')
      mark.className = mark.indicators.includes('end')
        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-700'
        : mark.indicators.includes('start')
          ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-700'
          : 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
    })
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
    if (editingGoalLog) {
      try {
        const response = await goalsAPI.updateGoalUpdate(goalId, editingGoalLog.updateId, {
          text: trimmedText || null,
          emotion: selectedEmotion || null
        })
        const updated = response?.data?.data?.goalUpdate
        setTimelineEvents(events => events.map(event => String(event.updateId) === String(editingGoalLog.updateId)
          ? { ...event, description: updated?.text || null, emotion: updated?.emotion || null }
          : event))
        useApiStore.setState({ cacheGoalAnalytics: {} })
        setAnalyticsData(null)
        setEditingGoalLog(null)
        setActiveView('journey')
        toast.success('Goal log updated successfully')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update goal log')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

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

  const beginEditGoalLog = event => {
    setOpenJourneyLogMenu(null)
    setEditingGoalLog(event)
    setUpdateText(event.description || '')
    setSelectedEmotion(event.emotion || null)
    setActiveView('log')
  }

  const closeGoalLogView = () => {
    const returnToJourney = Boolean(editingGoalLog)
    setEditingGoalLog(null)
    setActiveView(returnToJourney ? 'journey' : 'overview')
  }

  const requestDeleteGoalLog = event => {
    setOpenJourneyLogMenu(null)
    setGoalLogToDelete(event)
  }

  const confirmDeleteGoalLog = async () => {
    if (!goalLogToDelete?.updateId || isDeletingGoalLog) return
    setIsDeletingGoalLog(true)
    try {
      await goalsAPI.deleteGoalUpdate(goalId, goalLogToDelete.updateId)
      setTimelineEvents(events => events.filter(event => String(event.updateId) !== String(goalLogToDelete.updateId)))
      setJourneyCalendarEvents(events => events.filter(event => String(event.id) !== String(goalLogToDelete.id)))
      useApiStore.setState({ cacheGoalAnalytics: {} })
      setAnalyticsData(null)
      if (goalLogToDelete.dateKey === getCurrentDateKey()) {
        setUpdateText('')
        setSelectedEmotion(null)
        setHasTodayUpdate(false)
      }
      setGoalLogToDelete(null)
      toast.success('Goal log deleted successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete goal log')
    } finally {
      setIsDeletingGoalLog(false)
    }
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
            <button type="button" onClick={() => activeView === 'log' ? closeGoalLogView() : onClose?.()} aria-label={activeView === 'log' ? (editingGoalLog ? 'Back to goal journey' : 'Back to goal overview') : 'Close goal details'} className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0b1746] hover:bg-slate-100 dark:text-white dark:hover:bg-gray-800 sm:hidden"><ChevronRight className="h-5 w-5 rotate-180"/></button>
            <Target className="hidden h-4 w-4 shrink-0 text-[#1683ed] sm:block" />
            <span className="min-w-0 truncate text-sm">{activeView === 'log' ? (editingGoalLog ? 'Update Goal Log' : 'Log Progress') : goal.title}</span>
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
                 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                   <GoalDateCard icon={CalendarDays} label="Started" date={goal.createdAt} detail="Your journey began here" />
                   <GoalDateCard icon={CalendarClock} label="Target" date={goal.targetDate} emptyLabel="No target date" detail={targetDateDetail} tone={!isCompleted && goalMetrics?.overdueDays ? 'amber' : 'blue'} />
                 </div>
                 {isCompleted ? <div className="grid grid-cols-3 gap-2">{completionSummary?.journeyDuration !== undefined && <MetricCard value={completionSummary.journeyDuration} label="Journey days"/>}{completionSummary?.progressUpdateCount !== undefined && <MetricCard value={completionSummary.progressUpdateCount} label="Progress updates"/>}{completionSummary?.activeDays !== undefined && <MetricCard value={completionSummary.activeDays} label="Active days"/>}</div> : <div className="grid grid-cols-3 gap-2"><MetricCard value={goalMetrics?.activeDays ?? 0} label="Active days"/><MetricCard value={goalMetrics?.progressUpdates ?? 0} label="Updates"/><MetricCard value={`${goalMetrics?.consistency ?? 0}%`} label="Recent consistency"/></div>}
              </div>
            )}
            {activeView === 'journey' && (
              <>
              <div className="mb-3"><ActivityCalendar title="Calendar view" subtitle="Start, goal logs, and completion" marks={goalCalendarMarks} initialDate={goal.completedAt ? getDateKeyInTimezone(goal.completedAt) : undefined} legend={[{label:'Started',type:'start'},{label:'Goal log',type:'log'},{label:'Completed',type:'end'}]} /></div>
              <div className="space-y-3"><div className="mb-4"><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your goal journey</p><p className="mt-1 text-xs text-gray-500">Latest activity first, back to where the journey began.</p></div>{isLoadingView && <p className="py-8 text-center text-sm text-gray-500">Loading journey...</p>}{!isLoadingView && displayedTimelineEvents.map((event, index, events) => <JourneyEvent key={event.id || `${event.type}-${event.timestamp || event.dateKey}-${index}`} event={event} isLast={index === events.length - 1} openMenuId={openJourneyLogMenu} onToggleMenu={setOpenJourneyLogMenu} onEditLog={beginEditGoalLog} onDeleteLog={requestDeleteGoalLog} onShareMilestone={eventId => { setShareMoment({ shareType: 'MILESTONE', eventId }); setIsShareModalOpen(true) }} />)}<div ref={journeyLoaderRef} className="flex min-h-10 items-center justify-center">{journeyLoadingMore&&<span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]"/>}{!journeyHasMore&&timelineEvents.length>0&&<span className="text-[10px] text-slate-400">You’ve reached the beginning.</span>}</div></div>
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
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="text-[11px] font-bold uppercase tracking-wide text-[#1683ed]">{editingGoalLog ? `Editing · ${formatDateInTimezone(`${editingGoalLog.dateKey}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Today’s progress'}</p><h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{goal.title}</h3></div>

          {isCompleted && !editingGoalLog ? (
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
                  disabled={(!editingGoalLog && isCompleted) || isLoadingUpdate || isSubmitting}
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
                        disabled={(!editingGoalLog && isCompleted) || isSubmitting}
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

              {!editingGoalLog && <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 flex items-center justify-between">
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
              </div>}
          </div>
          )}
        </div>}

        {activeView === 'log' && <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {editingGoalLog ? (
              <button
                type="button"
                onClick={closeGoalLogView}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            ) : hasTodayUpdate && !isCompleted ? (
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
              {(!isCompleted || editingGoalLog) && (
                <button
                  type="button"
                  onClick={handleSubmitUpdate}
                  disabled={!canSubmit || isLoadingUpdate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                   {isSubmitting ? 'Saving...' : editingGoalLog ? 'Update Log' : 'Save Log'}
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
      <ConfirmActionModal
        isOpen={!!goalLogToDelete}
        onClose={() => setGoalLogToDelete(null)}
        onConfirm={confirmDeleteGoalLog}
        title="Delete this goal log?"
        message="This removes the update from your Journey, calendar, and goal analytics. This cannot be undone."
        confirmText="Delete log"
        isLoading={isDeletingGoalLog}
      />
    </div>
  )
}
