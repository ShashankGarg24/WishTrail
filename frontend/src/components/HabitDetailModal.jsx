import { useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, Calendar, Check, CheckCircle2, ChevronLeft, Flame, Frown, LayoutGrid, Meh, RefreshCw, SkipForward, Smile, Sparkles, Target, TrendingUp, X } from 'lucide-react'
import { habitsAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

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
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">Habit analytics</p><p className="mt-0.5 text-[10px] text-slate-400">Performance for the selected period</p></div><label className="text-[10px] font-semibold text-slate-500">Timeframe<select value={days} onChange={event=>onDaysChange(Number(event.target.value))} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-[#0b1746] outline-none focus:border-[#1683ed] dark:border-gray-600 dark:bg-gray-800 dark:text-white"><option value={7}>Last 7 days</option><option value={15}>Last 15 days</option><option value={30}>Last 30 days</option></select></label></div>
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
  const id = habit?.id || habit?._id
  const target = Number(habit?.dailyTargetCount || 1)
  const weeklyDone = Number(habit?.weeklyCompletions ?? Math.min(habit?.totalCompletions || 0,7))
  const weeklyTarget = Math.max(7,target*7)
  const rate = Math.min(100,Number(habit?.completionRate ?? Math.round((weeklyDone/weeklyTarget)*100)))
  const week = useMemo(() => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,index)=>({label,done:index<Math.min(5,weeklyDone),today:((new Date().getDay()+6)%7)===index})),[weeklyDone])

  useEffect(()=>{ if(!isOpen)return; lockBodyScroll(); setView(habit?._openLog?'log':initialView); return unlockBodyScroll },[isOpen,id,habit?._openLog,initialView])
  useEffect(()=>{ if(!isOpen || !id || !['history','analytics'].includes(view))return; let active=true; setLoading(true); const requestDays=view==='analytics'?analyticsDays:30; const analyticsRequest=view==='analytics'?habitsAPI.analytics(id,{days:analyticsDays}):Promise.resolve(null); Promise.all([analyticsRequest,habitsAPI.logs(id,{page:1,limit:40,days:requestDays})]).then(([analyticsResponse,logsResponse])=>{if(!active)return; setLogs(logsResponse?.data?.data?.logs||[]); if(analyticsResponse)setAnalytics(analyticsResponse?.data?.data?.analytics||null)}).catch(()=>{if(active&&view==='analytics')setAnalytics(null)}).finally(()=>active&&setLoading(false)); return()=>{active=false} },[isOpen,id,view,analyticsDays])
  if(!isOpen||!habit)return null

  const saveLog=async()=>{ if(!onLog||saving)return; setSaving(true); try{ const repeats=status==='done'?Math.max(1,count):1; for(let i=0;i<repeats;i+=1) await onLog(status,mood,note); await onHabitStatsChanged?.(); setNote(''); setView('overview') }finally{setSaving(false)} }
  const formatDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}

  if (view === 'analytics') return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose}/><section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-gray-900 sm:h-[min(86dvh,780px)] sm:max-w-[760px] sm:rounded-2xl"><header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900"><button onClick={()=>setView('overview')} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button><strong className="text-sm text-[#0b1746] dark:text-white">{habit.name}</strong></header><nav className="grid shrink-0 grid-cols-3 border-b border-gray-100 px-3 sm:px-6 dark:border-gray-700">{[['overview','Overview'],['analytics','Analytics'],['history','History']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`relative py-3 text-[11px] font-semibold ${view===key?'text-[#1683ed]':'text-gray-500'}`}>{label}{view===key&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#1683ed]"/>}</button>)}</nav><div className="flex-1 overflow-y-auto p-5 sm:p-8">{loading?<p className="py-12 text-center text-sm text-gray-500">Loading analytics…</p>:analytics?<HabitAnalyticsPanel analytics={analytics} fallbackRate={rate} habit={habit} days={analyticsDays} onDaysChange={setAnalyticsDays}/>:<p className="py-12 text-center text-sm text-gray-500">Analytics could not be loaded.</p>}</div></section></div>

  return <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4">
    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose}/>
    <section className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8fafc] shadow-2xl dark:bg-gray-900 sm:h-[min(86dvh,780px)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-[760px] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-gray-700">
      <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-200 bg-white px-5 sm:px-8 dark:border-gray-700 dark:bg-gray-900">
        <button onClick={view==='log'?()=>setView('overview'):onClose} className="absolute left-3 rounded-lg p-2 text-[#0b1746] dark:text-white"><ChevronLeft className="h-5 w-5"/></button>
        <strong className="text-sm text-[#0b1746] dark:text-white">{view==='log'?'Log Habit':habit.name}</strong>
      </header>
      {view!=='log'&&<nav className="grid shrink-0 grid-cols-3 border-b border-gray-100 px-3 sm:px-6 dark:border-gray-700">{[['overview','Overview'],['analytics','Analytics'],['history','History']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`relative py-3 text-[11px] font-semibold ${view===key?'text-[#1683ed]':'text-gray-500'}`}>{label}{view===key&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#1683ed]"/>}</button>)}</nav>}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {view==='overview'&&<div className="space-y-4">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#1683ed]"><BookOpen/></span><div><h2 className="text-lg font-extrabold text-[#0b1746] dark:text-white">{habit.name}</h2><p className="text-xs text-gray-500">{habit.description||'Build consistency one day at a time'}</p></div></div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 dark:border-orange-950 dark:bg-orange-950/20"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-500"><Flame className="h-6 w-6" fill="currentColor"/></span><div><p className="text-[11px] font-semibold text-gray-600">Current Streak</p><p className="text-2xl font-extrabold text-[#0b1746] dark:text-white">{habit.currentStreak||0} days</p></div></div><p className="mt-2 text-center text-[11px] text-gray-500">Keep going! You’re on fire! 🔥</p></div>
          <div className="grid grid-cols-2 gap-3">{[[`${rate}%`,'Completion Rate','Last 30 days'],[`${habit.totalDays||0} / 30`,'Active Days','This month'],[`${target} per day`,'Target',''],[new Date(habit.createdAt||Date.now()).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}),'Started','']].map(([value,label,hint])=><div key={label} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"><p className="text-[10px] text-gray-500">{label}</p><p className="mt-1 text-base font-extrabold text-[#0b1746] dark:text-white">{value}</p>{hint&&<p className="text-[10px] text-gray-400">{hint}</p>}</div>)}</div>
          <div><div className="mb-3 flex justify-between text-xs font-bold"><span>This Week</span><span>{weeklyDone}/{weeklyTarget}</span></div><div className="grid grid-cols-7 gap-2">{week.map(day=><div key={day.label} className="text-center"><span className={`mx-auto grid h-7 w-7 place-items-center rounded-full border text-xs ${day.done?'border-[#1683ed] bg-[#1683ed] text-white':day.today?'border-[#1683ed] text-[#1683ed]':'border-gray-300 text-gray-300'}`}>{day.done?<Check className="h-4 w-4"/>:''}</span><span className="mt-1 block text-[9px] text-gray-500">{day.label}</span></div>)}</div></div>
          <button onClick={()=>setView('log')} className="w-full rounded-xl bg-[#1683ed] py-3 text-sm font-bold text-white">Log Habit</button>
        </div>}
        {view==='log'&&<div className="space-y-5"><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[#1683ed] dark:bg-blue-950/40"><BookOpen/></span><div><b className="text-sm dark:text-white">{habit.name}</b><p className="text-[11px] text-gray-500">Today • {new Date().toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p></div></div>
          <div><p className="mb-2 text-xs font-bold dark:text-white">Did you complete this habit?</p><div className="grid grid-cols-2 gap-2"><button onClick={()=>setStatus('done')} className={`rounded-xl border p-3 text-xs font-bold ${status==='done'?'border-emerald-200 bg-emerald-50 text-emerald-600':'border-gray-200 text-gray-500'}`}><CheckCircle2 className="mr-1 inline h-4 w-4"/>Completed</button><button onClick={()=>setStatus('skipped')} className={`rounded-xl border p-3 text-xs font-bold ${status==='skipped'?'border-red-200 bg-red-50 text-red-500':'border-gray-200 text-gray-500'}`}>Skipped</button></div></div>
          {status==='done'&&<div><p className="mb-2 text-xs font-bold dark:text-white">Completions</p><div className="flex h-11 items-center justify-between rounded-xl bg-gray-50 px-4 dark:bg-gray-900/40"><button onClick={()=>setCount(v=>Math.max(1,v-1))} className="text-xl text-[#1683ed]">−</button><b>{count}</b><button onClick={()=>setCount(v=>v+1)} className="text-xl text-[#1683ed]">+</button></div></div>}
          <div><p className="mb-3 text-xs font-bold dark:text-white">How did you feel?</p><div className="grid grid-cols-5 gap-2">{moods.map(([key,label,Icon])=><button key={key} onClick={()=>setMood(key)} className="text-center"><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full border ${mood===key?'border-[#1683ed] bg-blue-50 text-[#1683ed] ring-2 ring-blue-100':'border-gray-200 text-gray-400'}`}><Icon className="h-4 w-4"/></span><span className="mt-1 block text-[9px] text-gray-500">{label}</span></button>)}</div></div>
          <div><label className="mb-2 block text-xs font-bold dark:text-white">Add a note (optional)</label><textarea value={note} onChange={e=>setNote(e.target.value.slice(0,200))} rows={4} placeholder="How did it go today?" className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[#1683ed] dark:border-gray-600 dark:bg-gray-900 dark:text-white"/><p className="text-right text-[10px] text-gray-400">{note.length}/200</p></div></div>}
        {view==='analytics'&&<div className="space-y-4"><div><p className="text-xs font-semibold text-gray-500">Completion Rate</p><div className="mt-1 flex items-center gap-3"><b className="text-3xl text-[#0b1746] dark:text-white">{rate}%</b><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">↑ 12%</span></div><p className="text-[10px] text-gray-400">Last 30 days</p></div><div className="flex h-40 items-end gap-2 rounded-xl border border-gray-100 p-4 dark:border-gray-700">{Array.from({length:12},(_,i)=><span key={i} className="flex-1 rounded-t bg-[#62aaf2]" style={{height:`${25+((i*17+weeklyDone*7)%70)}%`}}/>)}</div><div><h3 className="mb-3 text-xs font-bold dark:text-white">Weekly Breakdown</h3><div className="grid grid-cols-7 gap-2">{week.map((day,i)=><div key={day.label} className="text-center"><b className="text-[10px]">{day.done?'100%':i<5?'60%':'0%'}</b><div className="mx-auto mt-2 flex h-20 w-4 items-end rounded-t bg-gray-100"><div className="w-full rounded-t bg-[#1683ed]" style={{height:day.done?'100%':'35%'}}/></div><span className="text-[9px] text-gray-500">{day.label}</span></div>)}</div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3 text-center dark:border-gray-700"><Flame className="mx-auto h-5 w-5 text-orange-500"/><b className="mt-1 block text-lg dark:text-white">{habit.longestStreak||0} days</b><span className="text-[10px] text-gray-500">Best Streak</span></div><div className="rounded-xl border p-3 text-center dark:border-gray-700"><CheckCircle2 className="mx-auto h-5 w-5 text-[#1683ed]"/><b className="mt-1 block text-lg dark:text-white">{habit.totalCompletions||0}</b><span className="text-[10px] text-gray-500">Total Completions</span></div></div></div>}
        {view==='history'&&<div>{loading?<p className="py-12 text-center text-sm text-gray-500">Loading history…</p>:<div className="space-y-2">{logs.map((log,index)=><div key={log.id||index} className="flex gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-700"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${log.status==='done'?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}`}>{log.status==='done'?<CheckCircle2 className="h-4 w-4"/>:<X className="h-4 w-4"/>}</span><div className="min-w-0"><p className="text-[10px] text-gray-500">{formatDate(log.dateKey||log.createdAt)}</p><b className={`text-xs ${log.status==='done'?'text-emerald-600':'text-red-500'}`}>{log.status==='done'?'Completed':'Skipped'}</b>{log.note&&<p className="truncate text-xs text-gray-600 dark:text-gray-300">{log.note}</p>}</div></div>)}{!logs.length&&<p className="py-12 text-center text-sm text-gray-500">No habit history yet.</p>}</div>}</div>}
      </div>
      {view==='log'&&<footer className="flex shrink-0 gap-3 border-t border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:px-8 sm:py-5"><button type="button" onClick={()=>setView('overview')} disabled={saving} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button><button type="button" onClick={saveLog} disabled={saving} className="flex-1 rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:opacity-50">{saving?'Saving…':'Save Log'}</button></footer>}
    </section>
  </div>
}
