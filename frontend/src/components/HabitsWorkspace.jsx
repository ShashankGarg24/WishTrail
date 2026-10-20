import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, CheckCircle2, ChevronDown,
  Copy, Edit3, Lightbulb, MoreVertical,
  PauseCircle, Plus, Search, SlidersHorizontal, Sparkles, Trash2, TrendingDown, TrendingUp
} from 'lucide-react'
import HabitCategoryIcon from './HabitCategoryIcon'
import { HABIT_CATEGORIES, getHabitCategory, normalizeHabitCategory } from '../constants/habitCategories'

export default function HabitsWorkspace({ habits = [], stats = {}, selectedYear, availableYears = [], onYearChange, onCreate, onDiscover, onOpen, onEdit, onDelete, onLog, onAnalytics, onPause }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('all')
  const [frequency, setFrequency] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(null)
  const [menuHabit, setMenuHabit] = useState(null)

  useEffect(() => {
    if (!desktopFilterOpen) return undefined
    const closeDropdown = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && event.target.closest('[data-habit-filter-dropdown]')) return
      setDesktopFilterOpen(null)
    }
    document.addEventListener('pointerdown', closeDropdown)
    document.addEventListener('keydown', closeDropdown)
    return () => {
      document.removeEventListener('pointerdown', closeDropdown)
      document.removeEventListener('keydown', closeDropdown)
    }
  }, [desktopFilterOpen])

  const counts = useMemo(() => ({
    all: habits.length,
    active: habits.filter(h => !h.isArchived && h.isActive !== false).length,
    paused: habits.filter(h => h.isArchived || h.isActive === false).length,
    completed: habits.filter(h => h.completedAt).length,
  }), [habits])

  const visible = useMemo(() => habits.filter(habit => {
    const matchesSearch = !query || `${habit.name || ''} ${habit.description || ''} ${getHabitCategory(habit.category).label}`.toLowerCase().includes(query.toLowerCase())
    const isPaused = Boolean(habit.isArchived || habit.isActive === false)
    const matchesTab = tab === 'all' || (tab === 'active' ? !isPaused && !habit.completedAt : tab === 'paused' ? isPaused : Boolean(habit.completedAt))
    const matchesCategory = category === 'all' || normalizeHabitCategory(habit.category) === category
    const matchesFrequency = frequency === 'all' || String(habit.frequency || 'daily').toLowerCase() === frequency
    return matchesSearch && matchesTab && matchesCategory && matchesFrequency
  }), [habits, query, tab, category, frequency])

  const consistency = Math.min(100, Math.max(0, Number(stats?.weekConsistency) || 0))
  const consistencyTrend = stats?.consistencyTrendPoints != null && Number.isFinite(Number(stats.consistencyTrendPoints))
    ? Number(stats.consistencyTrendPoints)
    : null

  return (
    <section className="habits-workspace wt-home-tab-content">
      <header className="mb-4 hidden items-center justify-between gap-2 sm:flex">
        <div>
          <h1 className="text-left text-2xl font-bold tracking-tight text-[#0b1746] dark:text-white">My Habits</h1>
          <p className="mt-1 text-sm text-[#526392]">Small daily actions create big changes. Track your consistency and build lasting routines.</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526392]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search habits..." className="w-40 rounded-lg border border-[#dce5f4] bg-white py-2 pl-9 pr-3 text-xs text-[#0b1746] outline-none focus:border-[#1683ed] lg:w-48 dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
          {[
            { key: 'category', label: category === 'all' ? 'Category' : getHabitCategory(category).label, value: category, setValue: setCategory, options: [['all', 'All categories'], ...HABIT_CATEGORIES.map(key => [key, getHabitCategory(key).label])] },
            { key: 'status', label: tab === 'all' ? 'Status' : tab.charAt(0).toUpperCase() + tab.slice(1), value: tab, setValue: setTab, options: [['all', `All habits (${counts.all})`], ['active', `Active (${counts.active})`], ['paused', `Paused (${counts.paused})`], ['completed', `Completed (${counts.completed})`]] },
            { key: 'frequency', label: frequency === 'all' ? 'Frequency' : frequency.charAt(0).toUpperCase() + frequency.slice(1), value: frequency, setValue: setFrequency, options: [['all', 'All frequencies'], ['daily', 'Daily'], ['custom', 'Custom']] },
          ].map(filter => <div key={filter.key} className="relative" data-habit-filter-dropdown>
            <button type="button" aria-haspopup="listbox" data-filter-active={filter.value !== 'all'} aria-expanded={desktopFilterOpen === filter.key} onClick={() => setDesktopFilterOpen(open => open === filter.key ? null : filter.key)} className="flex items-center gap-1.5 rounded-lg border border-[#dce5f4] bg-white px-3 py-2 text-xs font-medium text-[#253663] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{filter.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${desktopFilterOpen === filter.key ? 'rotate-180' : ''}`}/></button>
            {desktopFilterOpen === filter.key && <div role="listbox" className="absolute right-0 top-full z-30 mt-2 max-h-72 min-w-44 overflow-y-auto rounded-xl border border-[#dce5f4] bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">{filter.options.map(([value, label]) => <button key={value} type="button" role="option" aria-selected={filter.value === value} onClick={() => { filter.setValue(value); setDesktopFilterOpen(null) }} className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs transition-colors ${filter.value === value ? 'bg-blue-50 font-semibold text-[#1683ed] dark:bg-blue-950/40' : 'text-[#253663] hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700'}`}>{label}</button>)}</div>}
          </div>)}
          <label className="sr-only" htmlFor="habit-year-filter">Habit year</label>
          <select id="habit-year-filter" value={selectedYear} onChange={event => onYearChange?.(Number(event.target.value))} className="h-9 rounded-lg border border-[#dce5f4] bg-white px-3 text-xs font-semibold text-[#253663] outline-none focus:border-[#1683ed] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="button" onClick={onDiscover} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#dce5f4] bg-white px-3 text-xs font-semibold text-[#526392] transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-[#1683ed] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-950/30"><Lightbulb className="h-4 w-4"/><span>Suggestions</span></button>
          <button type="button" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1683ed] px-4 py-2 text-xs font-semibold text-white shadow-sm" onClick={onCreate}><Plus className="h-4 w-4"/> Create Habit</button>
        </div>
      </header>

      <div className="mb-3 flex items-center justify-between sm:hidden">
        <select aria-label="Habit year" value={selectedYear} onChange={event => onYearChange?.(Number(event.target.value))} className="h-9 rounded-lg border border-[#dce5f4] bg-white px-3 text-sm font-bold text-[#0b1746] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce5f4] bg-white text-[#526392]" aria-label="View habit suggestions" title="View habit suggestions" onClick={onDiscover}><Lightbulb size={16}/></button>
          <button type="button" onClick={onCreate} aria-label="Create Habit" className="grid h-9 w-9 place-items-center rounded-lg bg-[#1683ed] text-white shadow-sm"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
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
      <div className="habits-mobile-search"><label className="habit-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search habits..." /></label><button data-filter-active={category !== 'all' || frequency !== 'all' || tab !== 'all'} aria-label="Filter habits" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={17}/></button></div>
      {filtersOpen && <><button type="button" className="habits-filter-backdrop" aria-label="Close filters" onClick={() => setFiltersOpen(false)} /><div className="habits-mobile-filters">
        <div className="habits-filter-title"><strong>Filter habits</strong><button type="button" onClick={() => setFiltersOpen(false)}>×</button></div>
        <label>Status<select value={tab} onChange={e => setTab(e.target.value)}><option value="all">All habits ({counts.all})</option><option value="active">Active ({counts.active})</option><option value="paused">Paused ({counts.paused})</option><option value="completed">Completed ({counts.completed})</option></select></label>
        <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{HABIT_CATEGORIES.map(key => <option key={key} value={key}>{getHabitCategory(key).label}</option>)}</select></label>
        <label>Frequency<select value={frequency} onChange={e => setFrequency(e.target.value)}><option value="all">All frequencies</option><option value="daily">Daily</option><option value="custom">Custom</option></select></label>
        <div className="habits-filter-actions"><button type="button" onClick={() => { setTab('all'); setCategory('all'); setFrequency('all') }}>Clear</button><button type="button" onClick={() => setFiltersOpen(false)}>Apply</button></div>
      </div></>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((habit) => {
          const id = habit.id || habit._id
          const visual = getHabitCategory(habit.category)
          const dailyTarget = Math.max(1, Number(habit.dailyTargetCount) || 1)
          const scheduledDays = habit.frequency === 'daily'
            ? 7
            : Math.max(1, new Set(Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : []).size)
          const weekly = Math.max(0, Number(habit.weeklyCompletions ?? habit.todayCompletionCount) || 0)
          const target = dailyTarget * scheduledDays
          const fallbackProgress = Math.min(100, Math.max(0, Math.round((weekly / target) * 100)))
          const progress = Math.min(100, Math.max(0, Math.round(Number(habit.last7CompletionRate ?? fallbackProgress))))
          const trend = habit.last7TrendPoints != null && Number.isFinite(Number(habit.last7TrendPoints)) ? Number(habit.last7TrendPoints) : null
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
                <HabitCategoryIcon category={habit.category} size="lg"/>
                <span className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-[#0b1746] dark:text-white sm:text-base">{habit.name}</h3><span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: visual.accent }}>{visual.label} · {habit.year || new Date(habit.createdAt || Date.now()).getFullYear()}</span></span>
                <button type="button" className="-mr-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700" aria-label={`Actions for ${habit.name}`} onClick={e => { e.stopPropagation(); setMenuHabit(habit) }}><MoreVertical className="h-5 w-5"/></button>
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-gray-500">{habit.description || 'Build consistency one day at a time'}</p>
              <div className="mt-2 flex items-center justify-between"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{status}</span><span className="text-xs font-bold text-[#0b1746] dark:text-white">{progress}% completion</span></div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e9eef5] dark:bg-gray-700"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: visual.accent }}/></div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                <span>Last 7 days</span>
              </div>
            </div>
          </article>
        })}
      </div>
      {!visible.length && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-800"><Sparkles className="mx-auto h-9 w-9 text-blue-300"/><h3 className="mt-3 font-bold text-gray-900 dark:text-white">No habits found</h3><p className="mt-1 text-sm text-gray-500">Adjust your filters or create a new habit.</p><button type="button" onClick={onCreate} className="mt-4 rounded-lg bg-[#1683ed] px-4 py-2 text-sm font-semibold text-white">Create Habit</button></div>}
      {menuHabit && (() => { return <div className="habit-actions-sheet fixed inset-0 z-[206] flex items-end justify-center sm:items-center sm:p-4">
        <button type="button" aria-label="Close habit actions" onClick={() => setMenuHabit(null)} className="absolute inset-0 bg-black/40" />
        <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
          <div className="mb-4 flex items-center gap-3"><HabitCategoryIcon category={menuHabit.category} size="lg"/><div className="min-w-0"><h2 className="truncate text-base font-bold text-gray-900 dark:text-white">{menuHabit.name}</h2><p className="text-xs text-gray-500">{getHabitCategory(menuHabit.category).label} · Quick actions</p></div></div>
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
