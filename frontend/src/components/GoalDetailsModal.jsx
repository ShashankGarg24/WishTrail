import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { Eye, BarChart3, X, Target, Heart, Smile, Meh, Frown, CircleSlash2, ChevronDown, CheckCircle, Calendar, ChevronRight, Flag } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
import toast from 'react-hot-toast';
import ConfirmActionModal from './ConfirmActionModal';
import GoalHero from './GoalHero';
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
  const rangePicker = <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#0b1746] dark:text-white">Analytics</p><p className="text-[10px] text-slate-500">Metrics for the selected period</p></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-gray-800" role="group" aria-label="Analytics date range">{[7,15,30].map(option=><button key={option} type="button" onClick={()=>onDaysChange?.(option)} aria-pressed={days===option} className={`min-w-11 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${days===option?'bg-white text-[#1683ed] shadow-sm dark:bg-gray-700':'text-slate-500'}`}>{option}d</button>)}</div></div>
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
  const moreMenuRef = useRef(null)
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
        const response = await useApiStore.getState().getGoalTimeline(id)
        const data = response?.data || response
        if (mounted && response?.success) setTimelineEvents(data?.timeline || data?.events || [])
      }
      if (mounted) setIsLoadingView(false)
    })()
    return () => { mounted = false }
  }, [activeView, analyticsDays, goal, isOpen])

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
  
  const handleAnalytics = () => {
    setIsMoreMenuOpen(false)
    setActiveView('analytics')
  }

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
        <div className="px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-gray-700 flex-shrink-0 relative bg-white dark:bg-gray-900">
          <div className="flex items-center justify-center gap-2 px-10 text-gray-900 dark:text-white font-semibold sm:justify-start sm:px-0 sm:pr-10">
            <button type="button" onClick={() => activeView === 'log' ? setActiveView('overview') : onClose?.()} aria-label={activeView === 'log' ? 'Back to goal overview' : 'Close goal details'} className="-ml-2 rounded-lg p-1 text-[#0b1746] dark:text-white sm:hidden"><ChevronRight className="h-5 w-5 rotate-180"/></button>
            <Target className="hidden h-4 w-4 text-[#1683ed] sm:block" />
            <span className="truncate text-sm">{activeView === 'log' ? 'Log Progress' : goal.title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-4 hidden rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 sm:block"
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
          <div className={`min-h-0 flex-1 overflow-y-auto px-5 pt-5 sm:px-8 sm:pt-6 ${!isCompleted ? 'pb-24 sm:pb-28' : 'pb-5 sm:pb-6'}`}>
            {activeView === 'overview' && (
                <div className="space-y-4">
                <GoalHero goal={goal} />
                 {goal.description && <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{goal.description}</p>}
                 <div className="grid grid-cols-2 gap-2"><MetricCard value={goal.targetDate ? new Date(goal.targetDate).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}) : 'No date'} label="Target date"/><MetricCard value={new Date(goal.createdAt).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})} label="Created"/></div>
                 <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#0b1746] dark:text-white">Goal Health</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#1683ed] dark:bg-blue-950/40">{goal.healthLabel || 'Getting Started'}</span></div><p className="mt-3 text-xs text-slate-500">{goal.healthReason || 'Log meaningful progress to build your health insight.'}</p></div>
                 <div className="grid grid-cols-3 gap-2"><MetricCard value={analyticsData?.metrics?.overdueDays ? `${analyticsData.metrics.overdueDays}d` : analyticsData?.metrics?.daysLeft ?? '—'} label={analyticsData?.metrics?.overdueDays ? 'Overdue' : 'Days left'}/><MetricCard value={analyticsData?.metrics?.progressUpdates ?? 0} label="Updates"/><MetricCard value={`${analyticsData?.metrics?.consistency ?? 0}%`} label="Consistency"/></div>
              </div>
            )}
            {activeView === 'journey' && (
              <div className="space-y-3"><div className="mb-4"><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your goal journey</p><p className="mt-1 text-xs text-gray-500">From the first step to completion, with meaningful updates in between.</p></div>{isLoadingView && <p className="py-8 text-center text-sm text-gray-500">Loading journey...</p>}{!isLoadingView && (timelineEvents.length ? timelineEvents : [{ type: 'goal_created', title: 'Goal Started', timestamp: goal.createdAt }]).map((event, index, events) => { const isStart = event.type === 'goal_created'; const isDone = event.type === 'goal_completed'; const title = isStart ? 'Goal Started' : isDone ? 'Goal Completed' : event.title || 'Progress Update'; const date = event.dateKey ? `${event.dateKey}T12:00:00` : event.date || event.createdAt || event.timestamp; return <div key={event.id || `${event.type}-${date}-${index}`} className="flex gap-3"><div className="flex flex-col items-center"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600' : isStart ? 'bg-blue-50 text-[#1683ed]' : 'bg-sky-50 text-sky-600'}`}>{isDone ? <CheckCircle className="h-4 w-4"/> : isStart ? <Target className="h-4 w-4"/> : <Flag className="h-4 w-4"/>}</span>{index < events.length - 1 && <span className="my-1 min-h-9 w-px flex-1 bg-blue-200"/>}</div><div className="pb-5"><p className="text-xs text-gray-500">{date ? new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p><p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>{event.description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{event.description}</p>}</div></div>})}</div>
            )}
            {activeView === 'analytics' && (
              <GoalAnalyticsPanel data={analyticsData} fallbackGoal={goal} loading={isLoadingView} days={analyticsDays} onDaysChange={setAnalyticsDays}/>
            )}
          </div>
        )}

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
              <div
                ref={moreMenuRef}
                className="relative"
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && isMoreMenuOpen) {
                    event.stopPropagation();
                    setIsMoreMenuOpen(false);
                    moreMenuRef.current?.querySelector('button')?.focus();
                  }
                }}
                onBlur={(event) => {
                  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsMoreMenuOpen(false);
                }}
              >
                <button
                  type="button"
                  aria-expanded={isMoreMenuOpen}
                  aria-controls="goal-detail-more-actions"
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  More <ChevronDown className={`h-4 w-4 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMoreMenuOpen && (
                  <div id="goal-detail-more-actions" className={`absolute ${isCompleted ? 'right-0' : 'left-1/2 -translate-x-1/2'} bottom-full mb-2 z-10 w-48 sm:w-56 max-w-[calc(100vw-3rem)] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden`}>
                    <button
                      type="button"
                      onClick={handleAnalytics}
                      className="w-full min-h-[48px] rounded-lg px-3 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-gray-700 inline-flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" /> Analytics
                    </button>
                    <button
                      type="button"
                      onClick={handleViewPost}
                      className="w-full min-h-[48px] rounded-lg px-3 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-gray-700 inline-flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Post
                    </button>
                  </div>
                )}
              </div>
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
