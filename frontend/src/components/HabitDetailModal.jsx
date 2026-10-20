import PillTabs from './PillTabs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Calendar, Check, CheckCircle2, ChevronLeft, Flame, Frown, Meh, MoreVertical, SkipForward, Smile, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Trophy, X } from 'lucide-react'
import { habitsAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import HabitCategoryIcon from './HabitCategoryIcon'
import AnalyticsRangeSelect from './AnalyticsRangeSelect'
import { getHabitCategoryLabel } from '../constants/habitCategories'
import ActivityCalendar from './ActivityCalendar'
import { getCurrentDateKey, getDateKeyInTimezone } from '../utils/timezoneUtils'
import ConfirmActionModal from './ConfirmActionModal'
import { usePremiumStatus } from '../hooks/usePremium'

const moods = [['great','Amazing',Sparkles],['good','Good',Smile],['okay','Okay',Meh],['challenging','Tired',Frown],['neutral','Neutral',Meh]]
const moodStyles = {
  great: ['Amazing', 'bg-pink-500', 'text-pink-600 dark:text-pink-400'],
  good: ['Good', 'bg-emerald-500', 'text-emerald-600 dark:text-emerald-400'],
  okay: ['Okay', 'bg-blue-500', 'text-blue-600 dark:text-blue-400'],
  challenging: ['Tired', 'bg-amber-500', 'text-amber-600 dark:text-amber-400'],
  neutral: ['Neutral', 'bg-slate-400', 'text-slate-600 dark:text-muted']
}

function MetricCard({ icon: Icon, label, value, hint, accent = 'text-[#1683ed]', children }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-line dark:bg-surface">
    <div className="mb-2 flex items-center gap-2"><Icon className={`h-4 w-4 ${accent}`}/><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-muted">{label}</span></div>
    <p className="text-xl font-extrabold text-[#0b1746] dark:text-white">{value}</p>
    {children}
    {hint&&<p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
  </div>
}

function HabitDateCard({ date }) {
  const formattedDate = new Date(date || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm dark:border-line dark:bg-surface">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1683ed] dark:bg-blue-950/40 dark:text-blue-300"><Calendar className="h-[18px] w-[18px]"/></span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 dark:text-muted">Started</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700 dark:text-ink">{formattedDate}</p>
      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-muted">Your routine began here</p>
    </div>
  </div>
}

function HabitAnalyticsPanel({ analytics, fallbackRate, habit, days, onDaysChange, maxDays }) {
  const counts = analytics?.statusCounts || {}
  const completionRate = Math.round(Number(analytics?.consistency ?? fallbackRate ?? 0))
  const weeks = (analytics?.weeklyData || []).slice(-8)
  const stats = analytics?.stats || {}
  const activeDays = Number(counts.activeDays ?? counts.done ?? 0)
  const expectedDays = Number(counts.expected||0)
  const dailyTarget = Number(stats.dailyTargetCount || habit.dailyTargetCount || 1)
  const targetDays = Number(stats.targetDays || habit.targetDays || 0)
  const targetValue = targetDays ? `${stats.totalDays||0}/${targetDays}` : null
  const targetPercent = targetDays ? Math.min(100,Math.round(((stats.totalDays||0)/targetDays)*100)) : 0
  const moodCounts = Object.fromEntries(Object.keys(moodStyles).map(key=>[key,0]))
  ;(analytics?.timeline||[]).forEach(entry=>{
    const recorded = Array.isArray(entry.completionTimesMood) ? entry.completionTimesMood : []
    if(recorded.length) recorded.forEach(item=>{const key=typeof item==='object'?item.mood:null;if(key in moodCounts)moodCounts[key]+=1})
    else if(entry.mood in moodCounts) moodCounts[entry.mood]+=Math.max(1,Number(entry.completionCount||1))
  })
  const moodTotal = Object.values(moodCounts).reduce((sum,value)=>sum+value,0)
  const activityMarks = Object.fromEntries((analytics?.timeline||[]).filter(entry=>entry.scheduled!==false).map(entry=>{
    const styles = entry.status==='done'
      ? ['Completed target','bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300','bg-emerald-500']
      : entry.status==='partial'
        ? [`Partial · ${entry.completionCount||0}/${dailyTarget}`,'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300','bg-blue-500']
        : entry.status==='skipped'
          ? ['Skipped','bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300','bg-amber-500']
          : entry.status==='pending'
            ? ['Pending today','bg-slate-50 text-slate-600 dark:bg-surface dark:text-muted','bg-slate-400']
            : ['Missed','bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300','bg-rose-500']
    return [entry.date,{label:styles[0],className:styles[1],dotClassName:styles[2]}]
  }))
  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">Habit analytics</p><p className="mt-0.5 text-[10px] text-slate-400">Performance on scheduled days</p></div><AnalyticsRangeSelect value={days} onChange={onDaysChange} maxDays={maxDays}/></div>
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-950 dark:from-blue-950/30 dark:to-surface"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Completion Rate</p><p className="mt-1 text-3xl font-extrabold text-[#0b1746] dark:text-white">{completionRate}%</p><p className="mt-1 text-xs text-slate-500">{activeDays} of {expectedDays} scheduled days completed</p></div><TrendingUp className="h-7 w-7 text-[#1683ed]"/></div><p className={`mt-3 text-xs font-semibold ${analytics?.trendPoints>0?'text-emerald-600':analytics?.trendPoints<0?'text-amber-600':'text-slate-500'}`}>{analytics?.trendPoints==null?'No previous-period comparison':`${analytics.trendPoints>0?'+':''}${analytics.trendPoints} percentage points vs previous period`}</p></section>
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon={Target} label="Target Hit Rate" value={`${Math.round(Number(analytics?.targetHitRate||0))}%`} hint={`Target reached on ${activeDays} of ${activeDays+Number(counts.partial||0)} attempted days`}/>
      <MetricCard icon={CheckCircle2} label="Average Count" value={Number(analytics?.averageCompletionsPerScheduledDay||0).toFixed(1)} hint="completions per scheduled day"/>
      <MetricCard icon={SkipForward} label="Follow-through" value={`${Math.round(Number(analytics?.followThroughRate||0))}%`} hint="completion rate excluding skips"/>
      <MetricCard icon={Calendar} label="Daily Target" value={`${dailyTarget}`} hint="completions required per scheduled day"/>
    </div>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Status overview</h3><div className="grid grid-cols-4 gap-2">{[[counts.done||0,'Completed','text-emerald-600'],[counts.partial||0,'Partial','text-blue-600'],[counts.skipped||0,'Skipped','text-amber-600'],[counts.missed||0,'Missed','text-rose-500']].map(([value,label,color])=><div key={label} className="rounded-xl border border-slate-100 bg-white p-3 text-center dark:border-line dark:bg-surface"><b className={`text-lg ${color}`}>{value}</b><span className="block text-[10px] text-slate-500">{label}</span></div>)}</div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Weekly completion rate</h3><div className="flex h-40 items-end gap-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-line dark:bg-surface">{weeks.map((item,index)=>{const expected=Math.max(0,Number(item.expectedDays||0));const completed=Number(item.activeDays||0);const weeklyRate=expected>0?Math.round((completed/expected)*100):0;return <div key={item.weekStart||index} title={`${completed} of ${expected} scheduled days · ${item.completions||0} completions`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-slate-400">{weeklyRate}%</span><span className="w-full rounded-t bg-[#62aaf2]" style={{height:`${Math.max(4,weeklyRate)}%`}}/><span className="max-w-full truncate text-[8px] text-slate-400">W{index+1}</span></div>})}{!weeks.length&&<p className="m-auto text-xs text-slate-500">No scheduled days in this period.</p>}</div></section>
    <ActivityCalendar title="Completion calendar" subtitle="Completed, partial, skipped, missed, and pending days" marks={activityMarks} initialDate={analytics?.rangeEnd} legend={[{label:'Completed',dotClassName:'bg-emerald-500'},{label:'Partial',dotClassName:'bg-blue-500'},{label:'Skipped',dotClassName:'bg-amber-500'},{label:'Missed',dotClassName:'bg-rose-500'},{label:'Pending',dotClassName:'bg-slate-400'}]}/>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Mood Distribution</h3>{moodTotal===0?<div className="rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 dark:border-line dark:bg-surface">Log how you feel when completing this habit to see your mood distribution.</div>:<div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-line dark:bg-surface">{Object.entries(moodCounts).filter(([,count])=>count>0).map(([key,count])=>{const [label,bar,color]=moodStyles[key];const percent=Math.round((count/moodTotal)*100);return <div key={key} className="grid grid-cols-[62px_1fr_34px] items-center gap-2"><span className={`text-[11px] font-semibold ${color}`}>{label}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-elevated"><span className={`block h-full rounded-full ${bar}`} style={{width:`${percent}%`}}/></span><span className="text-right text-[11px] font-bold text-slate-600 dark:text-muted">{percent}%</span></div>})}</div>}</section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">All-time progress</h3><div className="grid grid-cols-2 gap-3"><MetricCard icon={CheckCircle2} label="Total Count" value={stats.totalCompletions||habit.totalCompletions||0} hint="all recorded completions"/><MetricCard icon={Flame} label="Current Streak" value={`${stats.currentStreak||habit.currentStreak||0} days`} hint={`Personal best: ${stats.longestStreak||habit.longestStreak||0} days`} accent="text-orange-500"/>{targetValue&&<MetricCard icon={Calendar} label="Days Progress" value={targetValue} hint={`${targetPercent}% of target`}><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-elevated"><span className="block h-full rounded-full bg-[#1683ed]" style={{width:`${targetPercent}%`}}/></div></MetricCard>}</div></section>
  </div>
}

const dateKeyOf = log => String(log?.dateKey || log?.createdAt || '').slice(0, 10)
const moodMeta = key => {
  const item = moods.find(([mood]) => mood === key) || moods[moods.length - 1]
  const [, label, Icon] = item
  return { label, Icon, color: moodStyles[key]?.[2] || moodStyles.neutral[2] }
}

const completionTimeLabel = completion => {
  const value = completion?.timestamp || completion
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function CompletionList({ entries, onDelete, deleting }) {
  return <section>
    <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold dark:text-white">Saved completions</p><span className="text-[10px] font-semibold text-slate-400">{entries.length} total</span></div>
    <div className="space-y-2">{entries.map((entry,index)=>{const meta=moodMeta(entry?.mood);const MoodIcon=meta.Icon;return <div key={`${entry?.timestamp||'completion'}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-line dark:bg-surface"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><Check className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-700 dark:text-ink">Completion {index+1}</p><p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500"><span>{completionTimeLabel(entry)}</span><span>·</span><MoodIcon className="h-3 w-3"/><span>{meta.label}</span></p></div><button type="button" aria-label={`Delete completion ${index+1}`} disabled={deleting} onClick={()=>onDelete(index,entry)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4"/></button></div>})}</div>
  </section>
}

function HabitJourneyEvent({ event, isLast, openMenuId, onToggleMenu, onEdit, onDelete }) {
  const isStart = event.type === 'start'
  const isTarget = event.type === 'target'
  const isLog = event.type === 'log'
  const done = event.log?.status === 'done'
  const meta = isLog ? moodMeta(event.log?.averageMood) : null
  const MoodIcon = meta?.Icon
  const menuId = isLog ? String(event.log.id) : null
  const MarkerIcon = isStart ? Target : isTarget ? Trophy : done ? CheckCircle2 : BookOpen
  const markerColors = isStart
    ? 'bg-blue-100 text-[#1683ed] ring-blue-50 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-950/30'
    : isTarget
      ? 'bg-amber-100 text-amber-700 ring-amber-50 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-950/30'
      : done
        ? 'bg-emerald-100 text-emerald-700 ring-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-950/30'
        : 'bg-rose-100 text-rose-600 ring-rose-50 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-950/30'
  const title = isStart ? 'Habit started' : isTarget ? 'Target achieved' : done ? 'Habit completed' : 'Habit skipped'
  const dateLabel = event.date ? new Date(`${event.date}T12:00:00`).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}) : ''

  return <article className="flex gap-3">
    <div className="flex flex-col items-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ${markerColors}`}><MarkerIcon className="h-[18px] w-[18px]"/></span>{!isLast&&<span className="my-1 min-h-6 w-0.5 flex-1 rounded-full bg-gradient-to-b from-blue-200 to-slate-100 dark:from-blue-800 dark:to-elevated"/>}</div>
    <div className={`relative mb-4 min-w-0 flex-1 ${isLog?'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-line dark:bg-surface':'pb-3 pt-0.5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{dateLabel}</p><h3 className={`mt-1 font-bold text-slate-900 dark:text-white ${isLog?'text-sm':'text-[15px]'}`}>{title}</h3></div><div className="flex items-center gap-1">{isLog&&done&&event.log.averageMood&&<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.color}`}><MoodIcon className="h-3 w-3"/>{meta.label}</span>}{isLog&&<button type="button" aria-label="Habit log actions" onClick={()=>onToggleMenu(openMenuId===menuId?null:menuId)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-elevated"><MoreVertical className="h-4 w-4"/></button>}</div></div>
      {isStart&&<p className="mt-1.5 text-xs text-slate-500">Your routine began here.</p>}
      {isTarget&&<p className="mt-1.5 text-xs text-slate-500">Completed {event.targetDays} scheduled {event.targetDays===1?'day':'days'}.</p>}
      {isLog&&<div className={`mt-3 border-l-2 pl-3 text-xs ${done?'border-emerald-200 text-slate-600 dark:border-emerald-800 dark:text-muted':'border-rose-200 text-slate-500 dark:border-rose-800'}`}><p>{done?<>{Number(event.log.completionCount||0)} {Number(event.log.completionCount||0)===1?'completion':'completions'}</>:<>Marked as skipped</>}</p></div>}
      {isLog&&openMenuId===menuId&&<div className="absolute right-3 top-14 z-20 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-line dark:bg-canvas"><button type="button" onClick={()=>onEdit(event.log)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1683ed] dark:text-ink dark:hover:bg-surface">Edit log</button><button type="button" onClick={()=>onDelete(event.log)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">Delete log</button></div>}
    </div>
  </article>
}

function HabitHistoryPanel({ habit, logs, targetCompletedDate, loading, error, loadingMore, hasMore, loaderRef, openMenuId, onToggleMenu, onEdit, onDelete }) {
  const ordered = useMemo(() => [...logs].sort((a,b) => dateKeyOf(b).localeCompare(dateKeyOf(a))), [logs])
  const startDate = habit?.createdAt ? getDateKeyInTimezone(habit.createdAt) : ''
  const targetDate = targetCompletedDate ? String(targetCompletedDate).slice(0,10) : ''
  const calendarMarks = useMemo(() => {
    const marks = {}
    const addMark = (key, indicator, label) => {
      if (!key) return
      const mark = marks[key] || { labels: [], indicators: [] }
      if (!mark.labels.includes(label)) mark.labels.push(label)
      if (!mark.indicators.includes(indicator)) mark.indicators.push(indicator)
      marks[key] = mark
    }
    logs.forEach(log=>addMark(dateKeyOf(log),'log',log.status==='done'?'Habit completed':'Habit skipped'))
    addMark(startDate,'start','Habit started')
    if(targetDate)addMark(targetDate,'target','Target achieved')
    Object.values(marks).forEach(mark=>{mark.label=mark.labels.join(' · ');mark.className=mark.indicators.includes('target')?'bg-amber-50 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-700':mark.indicators.includes('start')?'bg-blue-50 text-blue-800 ring-1 ring-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-700':'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'})
    return marks
  },[logs,startDate,targetDate])
  const events = useMemo(()=>[
    ...(startDate?[{id:'habit-start',type:'start',date:startDate}]:[]),
    ...ordered.map(log=>({id:`log-${log.id}`,type:'log',date:dateKeyOf(log),log})),
    ...(targetDate?[{id:'habit-target',type:'target',date:targetDate,targetDays:Number(habit?.targetDays||0)}]:[])
  ].sort((a,b)=>b.date.localeCompare(a.date)||({target:0,log:1,start:2}[a.type]-({target:0,log:1,start:2}[b.type]))),[ordered,startDate,targetDate,habit?.targetDays])

  return <div className="space-y-5">
    <div><h2 className="text-base font-extrabold text-[#0b1746] dark:text-white">Habit journey</h2><p className="mt-1 text-[11px] text-slate-500">Latest activity first, back to where the habit began.</p></div>
    <ActivityCalendar title="Calendar view" subtitle="Start, habit logs, and target achievement" marks={calendarMarks} initialDate={targetDate||dateKeyOf(ordered[0])||startDate||undefined} legend={[{label:'Started',type:'start'},{label:'Habit log',type:'log'},{label:'Target achieved',type:'target'}]}/>
    {loading?<p className="py-12 text-center text-sm text-gray-500">Loading journey…</p>:error?<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>:<div>{events.map((event,index)=><HabitJourneyEvent key={event.id} event={event} isLast={index===events.length-1} openMenuId={openMenuId} onToggleMenu={onToggleMenu} onEdit={onEdit} onDelete={onDelete}/>)}</div>}
    {!loading&&!error&&events.length<=1&&<div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center dark:border-line dark:bg-surface"><BookOpen className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-2 text-sm font-semibold text-slate-600 dark:text-muted">Your habit logs will build this journey.</p></div>}
    {!loading&&<div ref={loaderRef} className="flex min-h-10 items-center justify-center">{loadingMore&&<span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]"/>}{!hasMore&&ordered.length>0&&<span className="text-[10px] text-slate-400">You’ve reached the beginning.</span>}</div>}
  </div>
}

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete, onPause, onHabitStatsChanged, initialView = 'overview' }) {
  const { isPremium } = usePremiumStatus()
  const [view,setView] = useState('overview')
  const [mood,setMood] = useState('good')
  const [status,setStatus] = useState('done')
  const [count,setCount] = useState(1)
  const [logs,setLogs] = useState([])
  const [loading,setLoading] = useState(false)
  const [analytics,setAnalytics] = useState(null)
  const [overviewAnalytics,setOverviewAnalytics] = useState(null)
  const [analyticsDays,setAnalyticsDays] = useState(30)
  const [saving,setSaving] = useState(false)
  const [historyPage,setHistoryPage] = useState(1)
  const [historyHasMore,setHistoryHasMore] = useState(false)
  const [historyTargetCompletedDate,setHistoryTargetCompletedDate] = useState(null)
  const [historyError,setHistoryError] = useState('')
  const [historyLoadingMore,setHistoryLoadingMore] = useState(false)
  const [openLogMenu,setOpenLogMenu] = useState(null)
  const [editingLog,setEditingLog] = useState(null)
  const [savingEdit,setSavingEdit] = useState(false)
  const [historyRefresh,setHistoryRefresh] = useState(0)
  const [logToDelete,setLogToDelete] = useState(null)
  const [deletingLog,setDeletingLog] = useState(false)
  const [completionToDelete,setCompletionToDelete] = useState(null)
  const [deletingCompletion,setDeletingCompletion] = useState(false)
  const historyLoaderRef = useRef(null)
  const id = habit?.id || habit?._id
  const target = Number(habit?.dailyTargetCount || 1)
  const weeklyDone = Number(habit?.weeklyCompletedDays || 0)
  const weeklyTarget = habit?.frequency === 'custom'
    ? Math.max(1, habit?.daysOfWeek?.length || 1)
    : habit?.frequency === 'weekly' ? 1 : 7
  const rate = Math.max(0, Math.min(100, Math.round(Number(overviewAnalytics?.consistency ?? habit?.last7CompletionRate ?? habit?.completionRate ?? 0))))
  const activeDays = Number(overviewAnalytics?.statusCounts?.activeDays ?? habit?.last7CompletedDays ?? 0)
  const expectedDays = Number(overviewAnalytics?.statusCounts?.expected ?? habit?.last7ExpectedDays ?? 0)
  const trendPoints = overviewAnalytics?.trendPoints ?? habit?.last7TrendPoints ?? null
  const currentStreak = Number(overviewAnalytics?.stats?.currentStreak ?? habit?.currentStreak ?? 0)
  const longestStreak = Number(overviewAnalytics?.stats?.longestStreak ?? habit?.longestStreak ?? 0)
  const todayCount = Number(habit?.todayCompletionCount || 0)
  const week = useMemo(() => {
    const todayKey = getCurrentDateKey()
    const today = new Date(`${todayKey}T12:00:00Z`)
    const monday = new Date(today)
    monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7))
    const completed = new Set((overviewAnalytics?.timeline || []).filter(entry => entry.status === 'done').map(entry => entry.date))
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,index) => {
      const date = new Date(monday)
      date.setUTCDate(monday.getUTCDate() + index)
      const key = date.toISOString().slice(0, 10)
      return { label, done: completed.has(key), today: key === todayKey }
    })
  }, [overviewAnalytics])

  useEffect(()=>{ if(!isOpen)return; lockBodyScroll(); setView(habit?._openLog?'log':initialView); return unlockBodyScroll },[isOpen,id,habit?._openLog,initialView])
  useEffect(()=>{if(!isOpen||!id||view!=='overview')return;let active=true;habitsAPI.analytics(id,{days:7}).then(analyticsResponse=>{if(active)setOverviewAnalytics(analyticsResponse?.data?.data?.analytics||null)}).catch(()=>active&&setOverviewAnalytics(null));return()=>{active=false}},[isOpen,id,view,historyRefresh])
  useEffect(()=>{if(!isOpen||!id||view!=='analytics')return;let active=true;setLoading(true);habitsAPI.analytics(id,{days:analyticsDays}).then(analyticsResponse=>{if(active)setAnalytics(analyticsResponse?.data?.data?.analytics||null)}).catch(()=>active&&setAnalytics(null)).finally(()=>active&&setLoading(false));return()=>{active=false}},[isOpen,id,view,analyticsDays,historyRefresh])
  useEffect(()=>{if(!isOpen||!id||view!=='history')return;let active=true;setLoading(true);setHistoryError('');habitsAPI.logs(id,{page:1,limit:50}).then(response=>{if(!active)return;const data=response?.data?.data||{};setLogs(data.logs||[]);setHistoryPage(1);setHistoryHasMore(Boolean(data.pagination?.hasMore));setHistoryTargetCompletedDate(data.targetCompletedDate||null)}).catch(error=>{if(active){setLogs([]);setHistoryTargetCompletedDate(null);setHistoryError(error.response?.data?.message||'Could not load habit history.')}}).finally(()=>active&&setLoading(false));return()=>{active=false}},[isOpen,id,view,historyRefresh])
  useEffect(()=>{if(view!=='history'||!historyHasMore||historyLoadingMore||loading)return;const target=historyLoaderRef.current;if(!target)return;const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)return;observer.disconnect();setHistoryLoadingMore(true);const nextPage=historyPage+1;habitsAPI.logs(id,{page:nextPage,limit:50}).then(response=>{const data=response?.data?.data||{};setLogs(current=>{const known=new Set(current.map(log=>String(log.id)));return [...current,...(data.logs||[]).filter(log=>!known.has(String(log.id)))]});setHistoryPage(nextPage);setHistoryHasMore(Boolean(data.pagination?.hasMore))}).catch(()=>setHistoryHasMore(false)).finally(()=>setHistoryLoadingMore(false))},{root:null,rootMargin:'160px'});observer.observe(target);return()=>observer.disconnect()},[view,id,historyHasMore,historyLoadingMore,loading,historyPage])
  if(!isOpen||!habit)return null

  const closeLogView=()=>{const wasEditing=Boolean(editingLog);setEditingLog(null);setView(wasEditing?'history':'overview')}
  const saveLog=async()=>{if(editingLog){await saveEditedLog();return}if(!onLog||saving)return;setSaving(true);try{const result=await onLog(status,mood,status==='done'?Math.max(1,Number(count)||1):0);if(result?.success===false)return;await onHabitStatsChanged?.();setView('overview')}finally{setSaving(false)}}
  const beginEditLog=log=>{setOpenLogMenu(null);setEditingLog(log);setStatus(log.status==='done'?'done':'skipped');setCount(Math.max(1,Number(log.completionCount||1)));setMood(log.averageMood||'neutral');setView('log')}
  const saveEditedLog=async()=>{if(!editingLog||savingEdit)return;setSavingEdit(true);try{await habitsAPI.replaceLog(id,editingLog.id,{status,mood,count:status==='done'?Math.max(1,Number(count)||1):0,dateKey:dateKeyOf(editingLog),entries:editingLog.completionTimesMood||[]});setEditingLog(null);setView('history');setHistoryRefresh(value=>value+1);await onHabitStatsChanged?.()}catch(error){window.dispatchEvent(new CustomEvent('wt_toast',{detail:{message:error.response?.data?.message||'Could not update this log.',type:'error'}}))}finally{setSavingEdit(false)}}
  const requestDeleteCompletion=(index,entry)=>setCompletionToDelete({index,entry})
  const confirmDeleteCompletion=async()=>{if(!editingLog||!completionToDelete||deletingCompletion)return;setDeletingCompletion(true);try{const response=await habitsAPI.deleteLogCompletionEntry(id,editingLog.id,completionToDelete.index);const data=response?.data?.data||{};setCompletionToDelete(null);if(data.deleted||!data.log){setEditingLog(null);setView('history')}else{setEditingLog(data.log);setCount(Math.max(1,Number(data.log.completionCount||1)));setLogs(current=>current.map(log=>String(log.id)===String(data.log.id)?data.log:log))}setHistoryRefresh(value=>value+1);await onHabitStatsChanged?.()}catch(error){window.dispatchEvent(new CustomEvent('wt_toast',{detail:{message:error.response?.data?.message||'Could not delete this completion.',type:'error'}}))}finally{setDeletingCompletion(false)}}
  const requestDeleteLog=log=>{setOpenLogMenu(null);setLogToDelete(log)}
  const confirmDeleteLog=async()=>{if(!logToDelete||deletingLog)return;setDeletingLog(true);try{await habitsAPI.deleteLog(id,logToDelete.id);setLogs(current=>current.filter(log=>String(log.id)!==String(logToDelete.id)));setLogToDelete(null);setHistoryRefresh(value=>value+1);await onHabitStatsChanged?.()}catch(error){window.dispatchEvent(new CustomEvent('wt_toast',{detail:{message:error.response?.data?.message||'Could not delete this log.',type:'error'}}))}finally{setDeletingLog(false)}}

  if (view === 'analytics') return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose}/><section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-canvas sm:h-[min(86dvh,780px)] sm:max-w-[760px] sm:rounded-2xl"><header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white dark:border-line dark:bg-canvas"><button onClick={()=>setView('overview')} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button><strong className="text-sm text-[#0b1746] dark:text-white">{habit.name}</strong></header><PillTabs className="shrink-0 m-3" label="Habit views" value={view} onChange={setView} items={['overview', 'history', 'analytics'].map(value => ({ value, label: value }))} /><div className="flex-1 overflow-y-auto p-5 sm:p-8">{loading?<p className="py-12 text-center text-sm text-gray-500">Loading analytics…</p>:analytics?<HabitAnalyticsPanel analytics={analytics} fallbackRate={rate} habit={habit} days={analyticsDays} onDaysChange={setAnalyticsDays} maxDays={isPremium?365:30}/>:<p className="py-12 text-center text-sm text-gray-500">Analytics could not be loaded.</p>}</div></section></div>

  return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={view==='log'&&editingLog?closeLogView:onClose}/>
    <section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-canvas sm:h-[min(86dvh,780px)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-gray-700">
      <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white px-5 sm:px-8 dark:border-line dark:bg-canvas">
        <button onClick={view==='log'?closeLogView:onClose} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button>
        <strong className="text-sm text-[#0b1746] dark:text-white">{view==='log'?(editingLog?'Update Habit Log':'Log Habit'):habit.name}</strong>
      </header>
      {view!=='log'&&<PillTabs className="shrink-0 m-3" label="Habit views" value={view} onChange={setView} items={['overview', 'history', 'analytics'].map(value => ({ value, label: value }))} />}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {view==='overview'&&<div className="space-y-4">
          <div className="flex items-center gap-3"><HabitCategoryIcon category={habit.category} size="lg"/><div><h2 className="text-lg font-extrabold text-[#0b1746] dark:text-white">{habit.name}</h2><p className="text-[10px] font-bold uppercase tracking-wide text-[#1683ed]">{getHabitCategoryLabel(habit.category)} · {habit.year || new Date(habit.createdAt || Date.now()).getFullYear()}</p><p className="text-xs text-gray-500">{habit.description||'Build consistency one day at a time'}</p></div></div>
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-950 dark:from-blue-950/30 dark:to-surface"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-[#1683ed] dark:bg-blue-950/60 dark:text-blue-300"><TrendingUp className="h-6 w-6"/></span><div><p className="text-[11px] font-semibold text-gray-600 dark:text-muted">Completion Rate · Last 7 Days</p><p className="text-2xl font-extrabold text-[#0b1746] dark:text-white">{rate}%</p></div></div><p className={`mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold ${trendPoints > 0 ? 'text-emerald-600 dark:text-emerald-400' : trendPoints < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>{trendPoints > 0 ? <TrendingUp className="h-3.5 w-3.5"/> : trendPoints < 0 ? <TrendingDown className="h-3.5 w-3.5"/> : null}{trendPoints == null ? 'Complete scheduled days to start your comparison' : `${trendPoints > 0 ? '+' : ''}${trendPoints} points vs previous 7 days`}</p></div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Flame} label="Current Streak" value={`${currentStreak} days`} hint={`Personal best: ${longestStreak} days`} accent="text-orange-500"/>
            <MetricCard icon={CheckCircle2} label="Scheduled Days" value={`${activeDays} / ${expectedDays}`} hint="Completed in the last 7 days"/>
            <MetricCard icon={Target} label="Today's Target" value={`${Math.min(todayCount,target)} / ${target}`} hint={todayCount>=target?'Target completed':'Completions today'}/>
            <HabitDateCard date={habit.createdAt}/>
          </div>
          <div><div className="mb-3 flex justify-between text-xs font-bold"><span>This Week</span><span>{weeklyDone}/{weeklyTarget}</span></div><div className="grid grid-cols-7 gap-2">{week.map(day=><div key={day.label} className="text-center"><span className={`mx-auto grid h-7 w-7 place-items-center rounded-full border text-xs ${day.done?'border-[#1683ed] bg-[#1683ed] text-white':day.today?'border-[#1683ed] text-[#1683ed]':'border-gray-300 text-gray-300'}`}>{day.done?<Check className="h-4 w-4"/>:''}</span><span className="mt-1 block text-[9px] text-gray-500">{day.label}</span></div>)}</div></div>
        </div>}
        {view==='log'&&<div className="space-y-5"><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-line dark:bg-surface"><HabitCategoryIcon category={habit.category} size="md"/><div><b className="text-sm dark:text-white">{habit.name}</b><p className="text-[11px] text-gray-500">{editingLog?'Editing':'Today'} • {(editingLog?new Date(`${dateKeyOf(editingLog)}T12:00:00`):new Date()).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p></div></div>
          <div><p className="mb-2 text-xs font-bold dark:text-white">Did you complete this habit?</p><div className="grid grid-cols-2 gap-2"><button onClick={()=>setStatus('done')} className={`rounded-xl border p-3 text-xs font-bold ${status==='done'?'border-emerald-200 bg-emerald-50 text-emerald-600':'border-gray-200 text-gray-500'}`}><CheckCircle2 className="mr-1 inline h-4 w-4"/>Completed</button><button onClick={()=>setStatus('skipped')} className={`rounded-xl border p-3 text-xs font-bold ${status==='skipped'?'border-red-200 bg-red-50 text-red-500':'border-gray-200 text-gray-500'}`}>Skipped</button></div></div>
          {status==='done'&&editingLog&&editingLog.completionTimesMood?.length>0?<CompletionList entries={editingLog.completionTimesMood} onDelete={requestDeleteCompletion} deleting={deletingCompletion}/>:status==='done'&&<div><p className="mb-2 text-xs font-bold dark:text-white">Completions to add</p><div className="flex h-11 items-center justify-between rounded-xl bg-gray-50 px-4 dark:bg-gray-900/40"><button onClick={()=>setCount(v=>Math.max(1,v-1))} className="text-xl text-[#1683ed]">−</button><b>{count}</b><button onClick={()=>setCount(v=>Math.min(100,v+1))} className="text-xl text-[#1683ed]">+</button></div></div>}
          {(!editingLog||!editingLog.completionTimesMood?.length)&&<div><p className="mb-3 text-xs font-bold dark:text-white">How did you feel?</p><div className="grid grid-cols-5 gap-2">{moods.map(([key,label,Icon])=><button key={key} onClick={()=>setMood(key)} className="text-center"><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full border ${mood===key?'border-[#1683ed] bg-blue-50 text-[#1683ed] ring-2 ring-blue-100':'border-gray-200 text-gray-400'}`}><Icon className="h-4 w-4"/></span><span className="mt-1 block text-[9px] text-gray-500">{label}</span></button>)}</div></div>}</div>}
        {view==='history'&&<HabitHistoryPanel habit={habit} logs={logs} targetCompletedDate={historyTargetCompletedDate} loading={loading} error={historyError} loadingMore={historyLoadingMore} hasMore={historyHasMore} loaderRef={historyLoaderRef} openMenuId={openLogMenu} onToggleMenu={setOpenLogMenu} onEdit={beginEditLog} onDelete={requestDeleteLog}/>}
      </div>
      {view==='log'&&<footer className="flex shrink-0 gap-3 border-t border-slate-200 bg-white p-4 dark:border-line dark:bg-canvas sm:px-8 sm:py-5"><button type="button" onClick={closeLogView} disabled={saving||savingEdit} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-line dark:text-muted dark:hover:bg-surface">Cancel</button><button type="button" onClick={saveLog} disabled={saving||savingEdit} className="flex-1 rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-50">{saving||savingEdit?(editingLog?'Updating…':'Saving…'):(editingLog?'Update Log':'Save Log')}</button></footer>}
      {view!=='log'&&<footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-line dark:bg-canvas sm:px-8"><button type="button" onClick={()=>{setEditingLog(null);setStatus('done');setCount(1);setMood('good');setView('log')}} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white shadow-sm"><Target className="h-4 w-4"/> Log Progress</button></footer>}
    </section>
    <ConfirmActionModal isOpen={!!logToDelete} onClose={()=>setLogToDelete(null)} onConfirm={confirmDeleteLog} title="Delete this habit log?" message="This removes the entire day’s log and recalculates your habit totals and streaks. This cannot be undone." confirmText="Delete log" isLoading={deletingLog}/>
    <ConfirmActionModal isOpen={!!completionToDelete} onClose={()=>setCompletionToDelete(null)} onConfirm={confirmDeleteCompletion} title="Delete this completion?" message="This removes only this completion from the daily log and recalculates habit progress." confirmText="Delete completion" isLoading={deletingCompletion}/>
  </div>
}
