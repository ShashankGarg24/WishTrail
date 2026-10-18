import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, BookOpen, Calendar, Check, CheckCircle2, ChevronLeft, Flame, Frown, LayoutGrid, Meh, MoreVertical, RefreshCw, SkipForward, Smile, Sparkles, Target, TrendingUp, X } from 'lucide-react'
import { habitsAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import HabitCategoryIcon from './HabitCategoryIcon'
import AnalyticsRangeSelect from './AnalyticsRangeSelect'
import { getHabitCategoryLabel } from '../constants/habitCategories'
import ActivityCalendar from './ActivityCalendar'
import { getCurrentDateKey } from '../utils/timezoneUtils'
import ConfirmActionModal from './ConfirmActionModal'

const moods = [['great','Amazing',Sparkles],['good','Good',Smile],['okay','Okay',Meh],['challenging','Tired',Frown],['neutral','Neutral',Meh]]
const moodStyles = {
  great: ['Amazing', 'bg-pink-500', 'text-pink-600 dark:text-pink-400'],
  good: ['Good', 'bg-emerald-500', 'text-emerald-600 dark:text-emerald-400'],
  okay: ['Okay', 'bg-blue-500', 'text-blue-600 dark:text-blue-400'],
  challenging: ['Tired', 'bg-amber-500', 'text-amber-600 dark:text-amber-400'],
  neutral: ['Neutral', 'bg-slate-400', 'text-slate-600 dark:text-slate-300']
}

function MetricCard({ icon: Icon, label, value, hint, accent = 'text-[#1683ed]', children }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-2 flex items-center gap-2"><Icon className={`h-4 w-4 ${accent}`}/><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span></div>
    <p className="text-xl font-extrabold text-[#0b1746] dark:text-white">{value}</p>
    {children}
    {hint&&<p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
  </div>
}

function ComingSoonAnalytics({ weeks }) {
  const previewCards = [
    [TrendingUp, 'Activity Trends'],
    [RefreshCw, 'Status Distribution'],
    [BarChart3, 'Activity Breakdown'],
    [LayoutGrid, 'Activity Heatmap']
  ]
  return <section>
    <h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">More insights</h3>
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 z-10 grid place-items-center bg-white/35 backdrop-blur-[2px] dark:bg-slate-950/30"><span className="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-extrabold text-[#0b1746] shadow-lg dark:border-gray-600 dark:bg-gray-800/95 dark:text-white">Coming Soon</span></div>
      <div className="grid grid-cols-2 gap-3 opacity-70 blur-[1.5px]" aria-hidden="true">
        {previewCards.map(([Icon,label],cardIndex)=><div key={label} className="h-28 rounded-2xl border border-slate-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Icon className="h-4 w-4 text-[#1683ed]"/>{label}</div><div className="mt-4 flex h-14 items-end gap-1">{Array.from({length:7},(_,index)=><span key={index} className="flex-1 rounded-t bg-blue-300" style={{height:`${20+((index*19+cardIndex*13+(weeks.length||1)*7)%70)}%`}}/>)}</div></div>)}
      </div>
    </div>
  </section>
}

function HabitAnalyticsPanel({ analytics, fallbackRate, habit, days, onDaysChange }) {
  const counts = analytics?.statusCounts || {}
  const completionRate = Math.round(Number(analytics?.consistency ?? fallbackRate ?? 0))
  const weeks = (analytics?.weeklyData || []).slice(-8)
  const stats = analytics?.stats || {}
  const activeDays = Number(counts.activeDays ?? counts.done ?? 0)
  const periodDays = analytics?.rangeStart && analytics?.rangeEnd ? Math.max(1,Math.round((new Date(`${analytics.rangeEnd}T12:00:00Z`)-new Date(`${analytics.rangeStart}T12:00:00Z`))/86400000)+1) : days
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
  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">Habit analytics</p><p className="mt-0.5 text-[10px] text-slate-400">Performance for the selected period</p></div><AnalyticsRangeSelect value={days} onChange={onDaysChange}/></div>
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon={Target} label="Daily Target" value={`${dailyTarget} per day`} hint="completions on each scheduled day"/>
      {targetValue&&<MetricCard icon={Calendar} label="Days Progress" value={targetValue} hint={`${targetPercent}% of target`}><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className="block h-full rounded-full bg-[#1683ed]" style={{width:`${targetPercent}%`}}/></div></MetricCard>}
      <MetricCard icon={Calendar} label="Active Days" value={`${activeDays} / ${periodDays}`} hint="active days in this period"/>
      <MetricCard icon={CheckCircle2} label="Total Count" value={stats.totalCompletions||habit.totalCompletions||0} hint="all-time completions"/>
      <MetricCard icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} hint={analytics?.trendPoints==null?'No previous-period comparison':`${analytics.trendPoints>0?'↑':analytics.trendPoints<0?'↓':'→'} ${Math.abs(analytics.trendPoints)} pts vs previous period`}/>
      <MetricCard icon={SkipForward} label="Follow-through" value={`${Math.round(Number(analytics?.followThroughRate||0))}%`} hint="excluding intentional skips"/>
      <MetricCard icon={Flame} label="Current Streak" value={`${stats.currentStreak||habit.currentStreak||0} days`} hint={`Personal best: ${stats.longestStreak||habit.longestStreak||0} days`} accent="text-orange-500"/>
    </div>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Status overview</h3><div className="grid grid-cols-3 gap-2">{[[counts.done||0,'Completed','text-emerald-600'],[counts.skipped||0,'Skipped','text-amber-600'],[counts.missed||0,'Missed','text-rose-500']].map(([value,label,color])=><div key={label} className="rounded-xl border border-slate-100 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800"><b className={`text-lg ${color}`}>{value}</b><span className="block text-[10px] text-slate-500">{label}</span></div>)}</div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Weekly Breakdown</h3><div className="flex h-40 items-end gap-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">{weeks.map((item,index)=>{const expected=Math.max(1,Number(item.expectedDays||item.expected||0));const done=Number(item.completions||item.done||item.completed||0);return <div key={item.weekStart||index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-slate-400">{done}</span><span className="w-full rounded-t bg-[#62aaf2]" style={{height:`${Math.max(4,Math.min(100,(done/expected)*100))}%`}}/><span className="max-w-full truncate text-[8px] text-slate-400">W{index+1}</span></div>})}{!weeks.length&&<p className="m-auto text-xs text-slate-500">No activity in this period.</p>}</div></section>
    <section><h3 className="mb-3 text-sm font-extrabold text-[#0b1746] dark:text-white">Mood Distribution</h3>{moodTotal===0?<div className="rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 dark:border-gray-700 dark:bg-gray-800">Log how you feel when completing this habit to see your mood distribution.</div>:<div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">{Object.entries(moodCounts).filter(([,count])=>count>0).map(([key,count])=>{const [label,bar,color]=moodStyles[key];const percent=Math.round((count/moodTotal)*100);return <div key={key} className="grid grid-cols-[62px_1fr_34px] items-center gap-2"><span className={`text-[11px] font-semibold ${color}`}>{label}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className={`block h-full rounded-full ${bar}`} style={{width:`${percent}%`}}/></span><span className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">{percent}%</span></div>})}</div>}</section>
    <ComingSoonAnalytics weeks={weeks}/>
  </div>
}

const dateKeyOf = log => String(log?.dateKey || log?.createdAt || '').slice(0, 10)
const moodMeta = key => {
  const item = moods.find(([mood]) => mood === key) || moods[moods.length - 1]
  const [, label, Icon] = item
  return { label, Icon, color: moodStyles[key]?.[2] || moodStyles.neutral[2] }
}

function HabitHistoryPanel({ logs, loading, loadingMore, hasMore, loaderRef, openMenuId, onToggleMenu, onEdit, onDelete }) {
  const ordered = useMemo(() => [...logs].sort((a,b) => dateKeyOf(b).localeCompare(dateKeyOf(a))), [logs])
  const groups = useMemo(() => ordered.reduce((result, log) => {
    const key = dateKeyOf(log)
    const date = new Date(`${key}T12:00:00`)
    const label = Number.isNaN(date.getTime()) ? 'Earlier' : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    ;(result[label] ||= []).push(log)
    return result
  }, {}), [ordered])
  const calendarMarks = useMemo(() => logs.reduce((result, log) => {
    const key = dateKeyOf(log)
    if (!key) return result
    const done = log.status === 'done'
    result[key] = done
      ? { label: 'Habit completed', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300', dotClassName: 'bg-emerald-500' }
      : { label: 'Habit skipped', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300', dotClassName: 'bg-rose-500' }
    return result
  }, {}), [logs])

  return <div className="space-y-5">
    <div className="flex items-end justify-between gap-3">
      <div><h2 className="text-base font-extrabold text-[#0b1746] dark:text-white">Habit history</h2><p className="text-[11px] text-slate-500">Your daily counts and how you felt.</p></div>
    </div>
    <ActivityCalendar title="Calendar view" subtitle="Completed and skipped habit days" marks={calendarMarks} initialDate={ordered[0] ? dateKeyOf(ordered[0]) : undefined} legend={[{label:'Completed',dotClassName:'bg-emerald-500'},{label:'Skipped',dotClassName:'bg-rose-500'}]} />
    {loading ? <p className="py-12 text-center text-sm text-gray-500">Loading history…</p> : Object.entries(groups).map(([label,items])=><section key={label}>
      <div className="mb-2 flex items-center gap-3"><h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</h3><span className="h-px flex-1 bg-slate-200 dark:bg-gray-700"/></div>
      <div className="space-y-2">{items.map((log,index)=>{const done=log.status==='done';const meta=moodMeta(log.averageMood);const MoodIcon=meta.Icon;const menuId=String(log.id||index);return <article key={menuId} className="relative flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done?'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30':'bg-rose-50 text-rose-500 dark:bg-rose-950/30'}`}>{done?<CheckCircle2 className="h-5 w-5"/>:<X className="h-5 w-5"/>}</span>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#0b1746] dark:text-white">{new Date(`${dateKeyOf(log)}T12:00:00`).toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${done?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-500'}`}>{done?'Completed':'Skipped'}</span>{done&&<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{Number(log.completionCount||0)} {Number(log.completionCount||0)===1?'completion':'completions'}</span>}{done&&log.averageMood&&<span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.color}`}><MoodIcon className="h-3.5 w-3.5"/>{meta.label}</span>}</div></div>
        <button type="button" aria-label="Log actions" onClick={()=>onToggleMenu(openMenuId===menuId?null:menuId)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-gray-700"><MoreVertical className="h-4 w-4"/></button>
        {openMenuId===menuId&&<div className="absolute right-3 top-11 z-20 w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"><button type="button" onClick={()=>onEdit(log)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1683ed] dark:text-slate-200 dark:hover:bg-gray-800">Edit log</button><button type="button" onClick={()=>onDelete(log)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">Delete log</button></div>}
      </article>})}</div>
    </section>)}
    {!loading&&!ordered.length&&<div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800"><Calendar className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">No habit history yet.</p></div>}
    {!loading&&<div ref={loaderRef} className="flex min-h-10 items-center justify-center">{loadingMore&&<span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]"/>}{!hasMore&&ordered.length>0&&<span className="text-[10px] text-slate-400">You’ve reached the beginning.</span>}</div>}
  </div>
}

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete, onPause, onHabitStatsChanged, initialView = 'overview' }) {
  const [view,setView] = useState('overview')
  const [mood,setMood] = useState('good')
  const [status,setStatus] = useState('done')
  const [note,setNote] = useState('')
  const [count,setCount] = useState(1)
  const [logs,setLogs] = useState([])
  const [loading,setLoading] = useState(false)
  const [analytics,setAnalytics] = useState(null)
  const [analyticsDays,setAnalyticsDays] = useState(30)
  const [saving,setSaving] = useState(false)
  const [historyPage,setHistoryPage] = useState(1)
  const [historyHasMore,setHistoryHasMore] = useState(false)
  const [historyLoadingMore,setHistoryLoadingMore] = useState(false)
  const [openLogMenu,setOpenLogMenu] = useState(null)
  const [editingLog,setEditingLog] = useState(null)
  const [savingEdit,setSavingEdit] = useState(false)
  const [historyRefresh,setHistoryRefresh] = useState(0)
  const [logToDelete,setLogToDelete] = useState(null)
  const [deletingLog,setDeletingLog] = useState(false)
  const historyLoaderRef = useRef(null)
  const id = habit?.id || habit?._id
  const target = Number(habit?.dailyTargetCount || 1)
  const weeklyDone = Number(habit?.weeklyCompletedDays || 0)
  const weeklyTarget = habit?.frequency === 'custom'
    ? Math.max(1, habit?.daysOfWeek?.length || 1)
    : habit?.frequency === 'weekly' ? 1 : 7
  const rate = Math.max(0, Math.min(100, Math.round(Number(analytics?.consistency ?? habit?.completionRate ?? 0))))
  const activeDays = Number(analytics?.statusCounts?.activeDays ?? 0)
  const week = useMemo(() => {
    const todayKey = getCurrentDateKey()
    const today = new Date(`${todayKey}T12:00:00Z`)
    const monday = new Date(today)
    monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7))
    const completed = new Set((analytics?.timeline || []).filter(entry => entry.status === 'done').map(entry => entry.date))
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,index) => {
      const date = new Date(monday)
      date.setUTCDate(monday.getUTCDate() + index)
      const key = date.toISOString().slice(0, 10)
      return { label, done: completed.has(key), today: key === todayKey }
    })
  }, [analytics])

  useEffect(()=>{ if(!isOpen)return; lockBodyScroll(); setView(habit?._openLog?'log':initialView); return unlockBodyScroll },[isOpen,id,habit?._openLog,initialView])
  useEffect(()=>{if(!isOpen||!id||!['overview','analytics'].includes(view))return;let active=true;setLoading(view==='analytics');habitsAPI.analytics(id,{days:analyticsDays}).then(analyticsResponse=>{if(active)setAnalytics(analyticsResponse?.data?.data?.analytics||null)}).catch(()=>active&&setAnalytics(null)).finally(()=>active&&setLoading(false));return()=>{active=false}},[isOpen,id,view,analyticsDays,historyRefresh])
  useEffect(()=>{if(!isOpen||!id||view!=='history')return;let active=true;setLoading(true);habitsAPI.logs(id,{page:1,limit:50}).then(response=>{if(!active)return;const data=response?.data?.data||{};setLogs(data.logs||[]);setHistoryPage(1);setHistoryHasMore(Boolean(data.pagination?.hasMore))}).catch(()=>active&&setLogs([])).finally(()=>active&&setLoading(false));return()=>{active=false}},[isOpen,id,view,historyRefresh])
  useEffect(()=>{if(view!=='history'||!historyHasMore||historyLoadingMore||loading)return;const target=historyLoaderRef.current;if(!target)return;const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)return;observer.disconnect();setHistoryLoadingMore(true);const nextPage=historyPage+1;habitsAPI.logs(id,{page:nextPage,limit:50}).then(response=>{const data=response?.data?.data||{};setLogs(current=>{const known=new Set(current.map(log=>String(log.id)));return [...current,...(data.logs||[]).filter(log=>!known.has(String(log.id)))]});setHistoryPage(nextPage);setHistoryHasMore(Boolean(data.pagination?.hasMore))}).catch(()=>setHistoryHasMore(false)).finally(()=>setHistoryLoadingMore(false))},{root:null,rootMargin:'160px'});observer.observe(target);return()=>observer.disconnect()},[view,id,historyHasMore,historyLoadingMore,loading,historyPage])
  if(!isOpen||!habit)return null

  const closeLogView=()=>{const wasEditing=Boolean(editingLog);setEditingLog(null);setView(wasEditing?'history':'overview')}
  const saveLog=async()=>{if(editingLog){await saveEditedLog();return}if(!onLog||saving)return;setSaving(true);try{const repeats=status==='done'?Math.max(1,count):1;for(let i=0;i<repeats;i+=1)await onLog(status,mood,note);await onHabitStatsChanged?.();setNote('');setView('overview')}finally{setSaving(false)}}
  const beginEditLog=log=>{setOpenLogMenu(null);setEditingLog(log);setStatus(log.status==='done'?'done':'skipped');setCount(Math.max(1,Number(log.completionCount||1)));setMood(log.averageMood||'neutral');setNote('');setView('log')}
  const saveEditedLog=async()=>{if(!editingLog||savingEdit)return;setSavingEdit(true);try{await habitsAPI.replaceLog(id,editingLog.id,{status,mood,count:status==='done'?Math.max(1,Number(count)||1):0,dateKey:dateKeyOf(editingLog),entries:editingLog.completionTimesMood||[]});setEditingLog(null);setView('history');setHistoryRefresh(value=>value+1);await onHabitStatsChanged?.()}catch(error){window.dispatchEvent(new CustomEvent('wt_toast',{detail:{message:error.response?.data?.message||'Could not update this log.',type:'error'}}))}finally{setSavingEdit(false)}}
  const requestDeleteLog=log=>{setOpenLogMenu(null);setLogToDelete(log)}
  const confirmDeleteLog=async()=>{if(!logToDelete||deletingLog)return;setDeletingLog(true);try{await habitsAPI.deleteLog(id,logToDelete.id);setLogs(current=>current.filter(log=>String(log.id)!==String(logToDelete.id)));setLogToDelete(null);setHistoryRefresh(value=>value+1);await onHabitStatsChanged?.()}catch(error){window.dispatchEvent(new CustomEvent('wt_toast',{detail:{message:error.response?.data?.message||'Could not delete this log.',type:'error'}}))}finally{setDeletingLog(false)}}

  if (view === 'analytics') return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose}/><section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-gray-900 sm:h-[min(86dvh,780px)] sm:max-w-[760px] sm:rounded-2xl"><header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900"><button onClick={()=>setView('overview')} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button><strong className="text-sm text-[#0b1746] dark:text-white">{habit.name}</strong></header><nav className="grid shrink-0 grid-cols-3 border-b border-gray-100 px-3 sm:px-6 dark:border-gray-700">{[['overview','Overview'],['history','History'],['analytics','Analytics']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`relative py-3 text-[11px] font-semibold ${view===key?'text-[#1683ed]':'text-gray-500'}`}>{label}{view===key&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#1683ed]"/>}</button>)}</nav><div className="flex-1 overflow-y-auto p-5 sm:p-8">{loading?<p className="py-12 text-center text-sm text-gray-500">Loading analytics…</p>:analytics?<HabitAnalyticsPanel analytics={analytics} fallbackRate={rate} habit={habit} days={analyticsDays} onDaysChange={setAnalyticsDays}/>:<p className="py-12 text-center text-sm text-gray-500">Analytics could not be loaded.</p>}</div></section></div>

  return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={view==='log'&&editingLog?closeLogView:onClose}/>
    <section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-gray-900 sm:h-[min(86dvh,780px)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-gray-700">
      <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white px-5 sm:px-8 dark:border-gray-700 dark:bg-gray-900">
        <button onClick={view==='log'?closeLogView:onClose} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button>
        <strong className="text-sm text-[#0b1746] dark:text-white">{view==='log'?(editingLog?'Update Habit Log':'Log Habit'):habit.name}</strong>
      </header>
      {view!=='log'&&<nav className="grid shrink-0 grid-cols-3 border-b border-gray-100 px-3 sm:px-6 dark:border-gray-700">{[['overview','Overview'],['history','History'],['analytics','Analytics']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`relative py-3 text-[11px] font-semibold ${view===key?'text-[#1683ed]':'text-gray-500'}`}>{label}{view===key&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#1683ed]"/>}</button>)}</nav>}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {view==='overview'&&<div className="space-y-4">
          <div className="flex items-center gap-3"><HabitCategoryIcon category={habit.category} size="lg"/><div><h2 className="text-lg font-extrabold text-[#0b1746] dark:text-white">{habit.name}</h2><p className="text-[10px] font-bold uppercase tracking-wide text-[#1683ed]">{getHabitCategoryLabel(habit.category)}</p><p className="text-xs text-gray-500">{habit.description||'Build consistency one day at a time'}</p></div></div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 dark:border-orange-950 dark:bg-orange-950/20"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-500"><Flame className="h-6 w-6" fill="currentColor"/></span><div><p className="text-[11px] font-semibold text-gray-600">Current Streak</p><p className="text-2xl font-extrabold text-[#0b1746] dark:text-white">{habit.currentStreak||0} days</p></div></div><p className="mt-2 text-center text-[11px] text-gray-500">Keep going! You’re on fire! 🔥</p></div>
          <div className="grid grid-cols-2 gap-3">{[[`${rate}%`,'Completion Rate','Last 30 days'],[`${activeDays} / 30`,'Active Days','Last 30 days'],[`${target} per day`,'Target',''],[new Date(habit.createdAt||Date.now()).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}),'Started','']].map(([value,label,hint])=><div key={label} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"><p className="text-[10px] text-gray-500">{label}</p><p className="mt-1 text-base font-extrabold text-[#0b1746] dark:text-white">{value}</p>{hint&&<p className="text-[10px] text-gray-400">{hint}</p>}</div>)}</div>
          <div><div className="mb-3 flex justify-between text-xs font-bold"><span>This Week</span><span>{weeklyDone}/{weeklyTarget}</span></div><div className="grid grid-cols-7 gap-2">{week.map(day=><div key={day.label} className="text-center"><span className={`mx-auto grid h-7 w-7 place-items-center rounded-full border text-xs ${day.done?'border-[#1683ed] bg-[#1683ed] text-white':day.today?'border-[#1683ed] text-[#1683ed]':'border-gray-300 text-gray-300'}`}>{day.done?<Check className="h-4 w-4"/>:''}</span><span className="mt-1 block text-[9px] text-gray-500">{day.label}</span></div>)}</div></div>
          <button onClick={()=>{setEditingLog(null);setStatus('done');setCount(1);setMood('good');setNote('');setView('log')}} className="w-full rounded-xl bg-[#1683ed] py-3 text-sm font-bold text-white">Log Habit</button>
        </div>}
        {view==='log'&&<div className="space-y-5"><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><HabitCategoryIcon category={habit.category} size="md"/><div><b className="text-sm dark:text-white">{habit.name}</b><p className="text-[11px] text-gray-500">{editingLog?'Editing':'Today'} • {(editingLog?new Date(`${dateKeyOf(editingLog)}T12:00:00`):new Date()).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p></div></div>
          <div><p className="mb-2 text-xs font-bold dark:text-white">Did you complete this habit?</p><div className="grid grid-cols-2 gap-2"><button onClick={()=>setStatus('done')} className={`rounded-xl border p-3 text-xs font-bold ${status==='done'?'border-emerald-200 bg-emerald-50 text-emerald-600':'border-gray-200 text-gray-500'}`}><CheckCircle2 className="mr-1 inline h-4 w-4"/>Completed</button><button onClick={()=>setStatus('skipped')} className={`rounded-xl border p-3 text-xs font-bold ${status==='skipped'?'border-red-200 bg-red-50 text-red-500':'border-gray-200 text-gray-500'}`}>Skipped</button></div></div>
          {status==='done'&&<div><p className="mb-2 text-xs font-bold dark:text-white">Completions</p><div className="flex h-11 items-center justify-between rounded-xl bg-gray-50 px-4 dark:bg-gray-900/40"><button onClick={()=>setCount(v=>Math.max(1,v-1))} className="text-xl text-[#1683ed]">−</button><b>{count}</b><button onClick={()=>setCount(v=>v+1)} className="text-xl text-[#1683ed]">+</button></div></div>}
          <div><p className="mb-3 text-xs font-bold dark:text-white">How did you feel?</p><div className="grid grid-cols-5 gap-2">{moods.map(([key,label,Icon])=><button key={key} onClick={()=>setMood(key)} className="text-center"><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full border ${mood===key?'border-[#1683ed] bg-blue-50 text-[#1683ed] ring-2 ring-blue-100':'border-gray-200 text-gray-400'}`}><Icon className="h-4 w-4"/></span><span className="mt-1 block text-[9px] text-gray-500">{label}</span></button>)}</div></div>
          {!editingLog&&<div><label className="mb-2 block text-xs font-bold dark:text-white">Add a note (optional)</label><textarea value={note} onChange={e=>setNote(e.target.value.slice(0,200))} rows={4} placeholder="How did it go today?" className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[#1683ed] dark:border-gray-600 dark:bg-gray-900 dark:text-white"/><p className="text-right text-[10px] text-gray-400">{note.length}/200</p></div>}</div>}
        {view==='history'&&<HabitHistoryPanel logs={logs} loading={loading} loadingMore={historyLoadingMore} hasMore={historyHasMore} loaderRef={historyLoaderRef} openMenuId={openLogMenu} onToggleMenu={setOpenLogMenu} onEdit={beginEditLog} onDelete={requestDeleteLog}/>}
      </div>
      {view==='log'&&<footer className="flex shrink-0 gap-3 border-t border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:px-8 sm:py-5"><button type="button" onClick={closeLogView} disabled={saving||savingEdit} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button><button type="button" onClick={saveLog} disabled={saving||savingEdit} className="flex-1 rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-50">{saving||savingEdit?(editingLog?'Updating…':'Saving…'):(editingLog?'Update Log':'Save Log')}</button></footer>}
    </section>
    <ConfirmActionModal isOpen={!!logToDelete} onClose={()=>setLogToDelete(null)} onConfirm={confirmDeleteLog} title="Delete this habit log?" message="This removes the entire day’s log and recalculates your habit totals and streaks. This cannot be undone." confirmText="Delete log" isLoading={deletingLog}/>
  </div>
}
