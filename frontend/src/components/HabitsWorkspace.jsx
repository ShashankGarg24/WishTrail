import { useMemo, useState } from 'react'
import {
  Apple, BarChart3, BookOpen, CheckCircle2, ChevronDown, ChevronLeft,
  Code2, Copy, Dumbbell, Edit3, Flame, MoreVertical,
  PauseCircle, Plus, Search, SlidersHorizontal, Sparkles, Trash2, TrendingDown, TrendingUp
} from 'lucide-react'

const ACCENTS = [
  { bg: '#edf6ff', color: '#1683ed', bar: '#1d8cf8' },
  { bg: '#fff4e8', color: '#ef6c24', bar: '#ff9c50' },
  { bg: '#f2ecff', color: '#7c4dff', bar: '#8b5cf6' },
  { bg: '#e8fbf3', color: '#0ca678', bar: '#20c997' },
  { bg: '#fff0f3', color: '#ef476f', bar: '#fb5f7d' },
]

function habitVisual(habit, index) {
  const name = String(habit?.name || '').toLowerCase()
  if (/read|book|journal/.test(name)) return { Icon: BookOpen, emoji: '📖', ...ACCENTS[0] }
  if (/run|walk|gym|exercise|fitness/.test(name)) return { Icon: Dumbbell, emoji: '🏃', ...ACCENTS[1] }
  if (/meditat|mind|breath/.test(name)) return { Icon: Sparkles, emoji: '🔥', ...ACCENTS[2] }
  if (/code|dsa|program/.test(name)) return { Icon: Code2, emoji: '</>', ...ACCENTS[3] }
  if (/eat|food|diet|health/.test(name)) return { Icon: Apple, emoji: '🍎', ...ACCENTS[4] }
  return { Icon: CheckCircle2, emoji: '✓', ...ACCENTS[index % ACCENTS.length] }
}

function getProgress(habit) {
  if (Number.isFinite(Number(habit?.completionRate))) return Math.min(100, Math.max(0, Number(habit.completionRate)))
  const done = Number(habit?.weeklyCompletions ?? habit?.totalCompletions ?? 0)
  return Math.min(100, done ? Math.max(20, (done % 8) * 14) : 0)
}

export default function HabitsWorkspace({ habits = [], stats = {}, onCreate, onOpen, onEdit, onDelete, onLog, onAnalytics, onPause }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('all')
  const [frequency, setFrequency] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [menuHabit, setMenuHabit] = useState(null)

  const counts = useMemo(() => ({
    all: habits.length,
    active: habits.filter(h => !h.isArchived && h.isActive !== false).length,
    paused: habits.filter(h => h.isArchived || h.isActive === false).length,
    completed: habits.filter(h => h.completedAt).length,
  }), [habits])

  const visible = useMemo(() => habits.filter(habit => {
    const matchesSearch = !query || `${habit.name || ''} ${habit.description || ''}`.toLowerCase().includes(query.toLowerCase())
    const isPaused = Boolean(habit.isArchived || habit.isActive === false)
    const matchesTab = tab === 'all' || (tab === 'active' ? !isPaused && !habit.completedAt : tab === 'paused' ? isPaused : Boolean(habit.completedAt))
    const matchesCategory = category === 'all' || String(habit.category || '').toLowerCase() === category
    const matchesFrequency = frequency === 'all' || String(habit.frequency || 'daily').toLowerCase() === frequency
    return matchesSearch && matchesTab && matchesCategory && matchesFrequency
  }), [habits, query, tab, category, frequency])

  const consistency = Math.min(100, Math.max(0, Number(stats?.weekConsistency) || 0))
  const consistencyTrend = stats?.consistencyTrendPoints != null && Number.isFinite(Number(stats.consistencyTrendPoints))
    ? Number(stats.consistencyTrendPoints)
    : null

  return (
    <section className="habits-workspace">
      <header className="mb-4 hidden items-center justify-between gap-2 sm:flex">
        <div>
          <h1 className="text-left text-2xl font-bold tracking-tight text-[#0b1746] dark:text-white">My Habits</h1>
          <p className="mt-1 text-sm text-[#526392]">Small daily actions create big changes. Track your consistency and build lasting routines.</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526392]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search habits..." className="w-40 rounded-lg border border-[#dce5f4] bg-white py-2 pl-9 pr-3 text-xs text-[#0b1746] outline-none focus:border-[#1683ed] lg:w-48 dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
          <label className="relative flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Category <ChevronDown className="h-3.5 w-3.5"/><select className="absolute inset-0 cursor-pointer opacity-0" aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option><option value="personal growth">Personal Growth</option><option value="health">Health</option><option value="fitness">Fitness</option></select></label>
          <label className="relative flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Status <ChevronDown className="h-3.5 w-3.5"/><select className="absolute inset-0 cursor-pointer opacity-0" aria-label="Status" value={tab} onChange={e => setTab(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
          <label className="relative flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Frequency <ChevronDown className="h-3.5 w-3.5"/><select className="absolute inset-0 cursor-pointer opacity-0" aria-label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value)}><option value="all">All</option><option value="daily">Daily</option><option value="custom">Custom</option></select></label>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1683ed] px-4 py-2 text-xs font-semibold text-white shadow-sm" onClick={onCreate}><Plus className="h-4 w-4"/> Create Habit</button>
        </div>
      </header>

      <div className="habits-mobile-bar"><button aria-label="Back" onClick={() => window.history.back()}><ChevronLeft size={21}/></button><strong>My Habits</strong><button className="mobile-add" aria-label="Create Habit" onClick={onCreate}><Plus size={20}/></button></div>
      <div className="habit-consistency-card">
        <div className="habit-consistency-heading">
          <span>7-Day Consistency</span>
          <div className="habit-consistency-value">
            <strong>{consistency}%</strong>
            {consistencyTrend !== null && <span className={consistencyTrend >= 0 ? 'is-up' : 'is-down'}>
              {consistencyTrend >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {consistencyTrend >= 0 ? '+' : ''}{consistencyTrend} pts
            </span>}
          </div>
        </div>
        <div className="habit-consistency-track"><span style={{ width: `${consistency}%` }}/></div>
        <p>{consistencyTrend === null ? 'Complete scheduled habits to start your trend.' : 'Compared with the previous 7 days'}</p>
      </div>
      <div className="habits-mobile-search"><label className="habit-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search habits..." /></label><button aria-label="Filter habits" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={17}/></button></div>
      {filtersOpen && <><button type="button" className="habits-filter-backdrop" aria-label="Close filters" onClick={() => setFiltersOpen(false)} /><div className="habits-mobile-filters">
        <div className="habits-filter-title"><strong>Filter habits</strong><button type="button" onClick={() => setFiltersOpen(false)}>×</button></div>
        <label>Status<select value={tab} onChange={e => setTab(e.target.value)}><option value="all">All habits ({counts.all})</option><option value="active">Active ({counts.active})</option><option value="paused">Paused ({counts.paused})</option><option value="completed">Completed ({counts.completed})</option></select></label>
        <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option><option value="personal growth">Personal Growth</option><option value="health">Health</option><option value="fitness">Fitness</option></select></label>
        <label>Frequency<select value={frequency} onChange={e => setFrequency(e.target.value)}><option value="all">All frequencies</option><option value="daily">Daily</option><option value="custom">Custom</option></select></label>
        <div className="habits-filter-actions"><button type="button" onClick={() => { setTab('all'); setCategory('all'); setFrequency('all') }}>Clear</button><button type="button" onClick={() => setFiltersOpen(false)}>Apply</button></div>
      </div></>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((habit, index) => {
          const id = habit.id || habit._id
          const visual = habitVisual(habit, index)
          const progress = getProgress(habit)
          const weekly = Number(habit.weeklyCompletions ?? habit.todayCompletionCount ?? Math.min(habit.totalCompletions || 0, 7))
          const target = Math.max(1, Number(habit.weeklyTarget || (habit.frequency === 'daily' ? 7 : habit.daysOfWeek?.length) || 7))
          const schedule = habit.frequency === 'daily' ? 'Daily' : `${habit.daysOfWeek?.length || 3}x per week`
          const isPaused = habit.isArchived || habit.isActive === false
          const status = habit.completedAt ? 'Completed' : isPaused ? 'Paused' : progress >= 60 ? 'Strong' : 'Active'
          const statusClass = habit.completedAt || progress >= 60
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
            : isPaused
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
          return <article key={id} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOpen?.(habit) }} className={`group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${isPaused ? 'opacity-70' : ''}`} onClick={() => onOpen?.(habit)}>
            <div className="min-w-0 flex-1 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: visual.bg, color: visual.color }}><visual.Icon size={21}/></span>
                <h3 className="min-w-0 flex-1 truncate pt-1 text-sm font-bold text-[#0b1746] dark:text-white sm:text-base">{habit.name}</h3>
                <button type="button" className="-mr-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700" aria-label={`Actions for ${habit.name}`} onClick={e => { e.stopPropagation(); setMenuHabit(habit) }}><MoreVertical className="h-5 w-5"/></button>
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-gray-500">{habit.description || 'Build consistency one day at a time'}</p>
              <div className="mt-2 flex items-center justify-between"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{status}</span><span className="text-xs font-bold text-[#0b1746] dark:text-white">{progress}%</span></div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e9eef5] dark:bg-gray-700"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: visual.bar }}/></div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500"/><b className="font-semibold text-gray-700 dark:text-gray-300">{habit.currentStreak || 0}</b> day streak</span>
                <span>{weekly}/{target} this week · {schedule}</span>
              </div>
            </div>
          </article>
        })}
      </div>
      {!visible.length && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-800"><Sparkles className="mx-auto h-9 w-9 text-blue-300"/><h3 className="mt-3 font-bold text-gray-900 dark:text-white">No habits found</h3><p className="mt-1 text-sm text-gray-500">Adjust your filters or create a new habit.</p><button type="button" onClick={onCreate} className="mt-4 rounded-lg bg-[#1683ed] px-4 py-2 text-sm font-semibold text-white">Create Habit</button></div>}
      {menuHabit && (() => { const menuVisual = habitVisual(menuHabit, 0); return <div className="habit-actions-sheet fixed inset-0 z-[206] flex items-end justify-center sm:items-center sm:p-4">
        <button type="button" aria-label="Close habit actions" onClick={() => setMenuHabit(null)} className="absolute inset-0 bg-black/40" />
        <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
          <div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{background:menuVisual.bg,color:menuVisual.color}}><menuVisual.Icon size={22}/></span><div className="min-w-0"><h2 className="truncate text-base font-bold text-gray-900 dark:text-white">{menuHabit.name}</h2><p className="text-xs text-gray-500">Quick actions for this habit</p></div></div>
          <div className="space-y-1">
            <button type="button" onClick={() => { onLog?.({ ...menuHabit, _openLog: true }); setMenuHabit(null) }} className="habit-sheet-action"><CheckCircle2/> Log Habit</button>
            <button type="button" onClick={() => { onAnalytics?.(menuHabit); setMenuHabit(null) }} className="habit-sheet-action"><BarChart3/> View Analytics</button>
            <button type="button" onClick={() => { onEdit?.(menuHabit); setMenuHabit(null) }} className="habit-sheet-action"><Edit3/> Edit Habit</button>
            <button type="button" onClick={() => { onPause?.(menuHabit); setMenuHabit(null) }} className="habit-sheet-action"><PauseCircle/> {menuHabit.isArchived || menuHabit.isActive === false ? 'Resume Habit' : 'Pause Habit'}</button>
            <button type="button" onClick={() => { onCreate?.(menuHabit); setMenuHabit(null) }} className="habit-sheet-action"><Copy/> Duplicate Habit</button>
            <button type="button" onClick={() => { onDelete?.(menuHabit); setMenuHabit(null) }} className="habit-sheet-action danger"><Trash2/> Delete Habit</button>
          </div>
          <button type="button" onClick={() => setMenuHabit(null)} className="mt-4 w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Cancel</button>
        </div>
      </div> })()}
    </section>
  )
}
