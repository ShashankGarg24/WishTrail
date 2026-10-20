import PillTabs, { homeTabs } from './PillTabs'
import MomentumLandscape from './MomentumLandscape'
import ActivePromotion from './ActivePromotion'
import { WeeklyTrailTeaser } from './WeeklyTrail'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, BookOpen, CalendarCheck, Check, ChevronRight, Flame, Plus, Sun, Target, X, Zap } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import HabitCategoryIcon from './HabitCategoryIcon'
import { settingsAPI } from '../services/api'
import { getHomeBanner } from '../utils/homeBanner'

const ACTIONS = [
  {
    key: 'goal',
    label: 'Create Goal',
    webLabel: 'Goal',
    hint: 'Set a new goal and plan your journey',
    Icon: Target,
    tone: 'red',
  },
  {
    key: 'habit',
    label: 'Create Habit',
    webLabel: 'Habit',
    hint: 'Build a new habit',
    Icon: Zap,
    tone: 'amber',
  },
  {
    key: 'journal',
    label: 'Add Journal Entry',
    webLabel: 'Journal',
    hint: 'Write about your day',
    Icon: BookOpen,
    tone: 'violet',
  },
  {
    key: 'progress',
    label: 'Update Progress',
    webLabel: 'Share Update',
    hint: 'Log progress for an existing goal',
    Icon: BarChart3,
    tone: 'orange',
  },
]

const toneClasses = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-rose-100 text-rose-500',
  amber: 'bg-amber-100 text-amber-500',
  violet: 'bg-violet-100 text-violet-600',
  orange: 'bg-orange-100 text-orange-500',
  cyan: 'bg-cyan-100 text-cyan-600',
}

const progressOf = (goal) => Math.max(0, Math.min(100, Math.round(goal?.progress?.percent ?? goal?.progress ?? 0)))
const habitProgress = (habit) => Math.max(0, Math.min(100, Math.round(habit?.weeklyProgress ?? habit?.completionRate ?? 0)))
const relativeTime = (value) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7
    ? `${days}d ago`
    : new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
}

const activityCopy = (activity) => {
  const title = activity?.data?.goalTitle || activity?.data?.goal?.title || activity?.data?.habitName || activity?.content?.title || ''
  const withTitle = (label) => (title ? `${label} “${title}”` : label)
  if (activity?.type === 'habit_created') return withTitle('created habit')
  if (activity?.type === 'habit_logged') return withTitle('logged habit')
  if (activity?.type === 'daily_log_created') return 'created a daily log'
  if (activity?.type === 'goal_created' || (activity?.type === 'goal_activity' && activity?.data?.lastUpdateType === 'created')) return withTitle('created goal')
  if (activity?.type === 'goal_completed') return withTitle('completed goal')
  if (activity?.type === 'goal_activity') return withTitle('logged progress for goal')
  return 'made progress'
}

function ActionIcon({ action, className = '' }) {
  const Icon = action.Icon
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[action.tone]} ${className}`}>
      <Icon className="h-5 w-5" strokeWidth={2.4} />
    </span>
  )
}

function QuickActions({ open, onClose, onAction }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-5">
          <motion.button type="button" aria-label="Close quick actions" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal="true" aria-labelledby="quick-actions-title" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} className="relative w-full rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-gray-900 md:max-w-[560px] md:rounded-2xl md:p-7">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200 md:hidden" />
            <div className="mb-5 flex items-center justify-between">
              <h2 id="quick-actions-title" className="text-xl font-bold text-slate-950 dark:text-white md:text-lg">
                What would you like to do?
              </h2>
              <button type="button" onClick={onClose} className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:block">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {ACTIONS.map((action) => (
                <button key={action.key} type="button" onClick={() => onAction(action.key)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 md:flex-col md:justify-center md:py-5 md:text-center">
                  <ActionIcon action={action} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{action.webLabel}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{action.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300 md:hidden">
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function GoalRow({ goal, index, onClick }) {
  const progress = progressOf(goal)
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-rose-500']
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-gray-700/50">
      <CategoryIcon category={goal.category} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{goal.title}</span>
        <span className="mt-2 flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
            <span className={`block h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${progress}%` }} />
          </span>
          <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-gray-300">{progress}%</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}

function HabitRow({ habit, onClick }) {
  const completedDays = Math.max(0, Number(habit.weeklyCompletedDays) || 0)
  const expectedDays = habit.frequency === 'daily' ? 7 : Math.max(1, new Set(Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek : []).size)
  const progress = Math.min(100, Math.round((completedDays / expectedDays) * 100))
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-gray-700/50">
      <HabitCategoryIcon category={habit.category} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{habit.name}</span>
        <span className="text-xs text-slate-500">
          {completedDays}/{expectedDays} days this week
        </span>
      </span>
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
        <span className="block h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
      </span>
      <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-gray-300">{progress}%</span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}

function FocusItem({ type, item, onOpen }) {
  const isGoal = type === 'goal'
  const title = isGoal ? item?.title : item?.name
  const subtitle = isGoal ? `Goal · ${progressOf(item)}% complete` : `Habit · ${Number(item?.todayCompletionCount || 0) >= Math.max(1, Number(item?.dailyTargetCount || 1)) ? 'Completed today' : item?.todayCompletionCount ? `${item.todayCompletionCount}/${item.dailyTargetCount || 1} today` : item?.frequency === 'daily' ? 'Daily' : 'Custom schedule'}`
  const Icon = isGoal ? Target : Zap

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{isGoal ? 'Goal' : 'Habit'}</span>
      </div>
      {item ? (
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-left">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isGoal ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-500'}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{title}</span>
            <span className="text-xs text-slate-500">{subtitle}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-blue-200 px-3 py-4 text-center text-sm text-slate-500">No active {type}</p>
      )}
    </div>
  )
}

function FocusChoices({ type, items, selected, saving, onSelect }) {
  const isGoal = type === 'goal'
  const Icon = isGoal ? Target : Zap
  const selectedId = selected?.id || selected?._id
  return (
    <section className={isGoal ? '' : 'mt-6'}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{isGoal ? 'Goals' : 'Habits'}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const itemId = item.id || item._id
          const isSelected = String(selectedId) === String(itemId)
          return (
            <button key={itemId} type="button" disabled={saving} onClick={() => onSelect(type, item)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-gray-700'}`}>
              <Icon className={`h-5 w-5 shrink-0 ${isGoal ? 'text-blue-600' : 'text-amber-500'}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{isGoal ? item.title : item.name}</span>
                <span className="text-xs text-slate-500">{isGoal ? `${progressOf(item)}% complete` : `${habitProgress(item)}% consistency`}</span>
              </span>
              {isSelected && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          )
        })}
        {!items.length && <p className="py-3 text-sm text-slate-500">No active {type}s.</p>}
      </div>
    </section>
  )
}

function WebGreetingBanner({ isMorning, bannerImage, bannerOverlay, greeting, firstName, greetingEmoji, greetingMessage, onNew }) {
  return (
    <div className="relative mb-3 min-h-[145px] overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
      <picture>
        <source media="(min-width: 768px)" srcSet={bannerImage} />
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="" fetchPriority="high" width="1600" height="400" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      </picture>
      <div className={`absolute inset-0 ${bannerOverlay}`} />
      {isMorning && (
        <>
          <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-amber-200/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-sky-950/20 to-transparent" />
        </>
      )}
      <div className="relative pt-2 !text-white">
        {isMorning && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            <Sun className="h-3.5 w-3.5 text-amber-200" />
            Fresh start
          </div>
        )}
        <h1 className="text-2xl font-bold !text-white">
          {greeting}, {firstName}! {greetingEmoji}
        </h1>
        <p className="mt-1 max-w-xl text-sm !text-white/90">{greetingMessage}</p>
      </div>
      <button type="button" onClick={onNew} className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-bold !text-white shadow-lg hover:bg-blue-600">
        <Plus className="h-5 w-5" />
        New
      </button>
    </div>
  )
}

function MomentumChart({ series = [], momentum = 0 }) {
  const values = Array.from({ length: 7 }, (_, index) => {
    const point = series[index]
    const value = typeof point === 'number' ? point : point?.value
    return Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : Number(momentum) || 0))
  })
  const width = 600
  const height = 104
  const top = 8
  const bottom = 94
  const points = values.map((value, index) => ({
    x: (index / 6) * width,
    y: bottom - ((bottom - top) * value) / 100,
  }))
  const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[104px]" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="momentum-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#momentum-area)" />
        <path d={line} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

export default function HomeOverview({ loading = false, user, goals = [], habits = [], stats = {}, recentActivities = [], quickActionsOpen, setQuickActionsOpen, onGoal, onHabit, onTab, navigate, onDailyLog }) {
  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const isMorning = hour >= 5 && hour < 12
  const isEvening = hour >= 17 || hour < 5
  const greeting = isEvening ? 'Good evening' : hour >= 12 ? 'Good afternoon' : 'Good morning'
  const greetingEmoji = isEvening ? '🌙' : hour >= 12 ? '🌤️' : '☀️'
  const greetingMessage = isEvening ? 'Reflect on today and keep your momentum going.' : hour >= 12 ? 'Keep the momentum going—one step at a time.' : 'A fresh day, a fresh start. Take one meaningful step toward your goals.'
  const bannerImage = getHomeBanner(hour)
  const bannerOverlay = isMorning ? 'bg-gradient-to-r from-slate-950/70 via-sky-950/25 to-amber-500/5' : 'bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/20'
  const momentum = stats?.weekMomentum ?? stats?.goalProgress ?? 0
  const activeGoals = useMemo(() => goals.filter((g) => !g.completedAt), [goals])
  const featuredGoals = (activeGoals.length ? activeGoals : goals).slice(0, 3)
  const featuredHabits = habits.slice(0, 3)
  const goalsProgressed = activeGoals.filter((goal) => progressOf(goal) > 0).length
  const consistencyTrend = Number.isFinite(Number(stats?.consistencyTrendPoints)) ? Number(stats.consistencyTrendPoints) : null
  const weeklyMomentum = Array.isArray(stats?.weeklyMomentum) ? stats.weeklyMomentum : []
  const rawActivityItems = Array.isArray(recentActivities) ? recentActivities : Array.isArray(recentActivities?.activities) ? recentActivities.activities : []
  const activityItems = rawActivityItems.filter((activity) => {
    const timestamp = new Date(activity.activityAt || activity.createdAt || activity.timestamp).getTime()
    return Number.isFinite(timestamp) && timestamp >= Date.now() - 7 * 24 * 60 * 60 * 1000
  })
  const [todayFocuses, setTodayFocuses] = useState({ goal: null, habit: null })
  const [focusPickerType, setFocusPickerType] = useState(null)
  const [savingFocus, setSavingFocus] = useState(false)
  useEffect(() => {
    let active = true
    settingsAPI
      .getTodayFocus()
      .then((response) => {
        if (!active) return
        const data = response.data.data
        if (data.focuses) setTodayFocuses(data.focuses)
        else if (data.focus)
          setTodayFocuses((previous) => ({
            ...previous,
            [data.focus.type]: data.focus,
          }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const defaultGoal = useMemo(() => [...activeGoals].sort((a, b) => progressOf(a) - progressOf(b))[0] || null, [activeGoals])
  const defaultHabit = useMemo(() => [...habits].sort((a, b) => habitProgress(a) - habitProgress(b))[0] || null, [habits])
  const focusSources = useMemo(() => {
    const resolve = (type, collection, fallback) => {
      const saved = todayFocuses[type]
      if (!saved) return fallback
      return collection.find((item) => String(item.id || item._id) === String(saved.itemId)) || saved.item || fallback
    }
    return {
      goal: resolve('goal', goals, defaultGoal),
      habit: resolve('habit', habits, defaultHabit),
    }
  }, [todayFocuses, goals, habits, defaultGoal, defaultHabit])
  const saveFocus = async (type, item) => {
    const itemId = Number(item.id || item._id)
    setSavingFocus(true)
    try {
      const response = await settingsAPI.updateTodayFocus({ type, itemId })
      setTodayFocuses((previous) => ({
        ...previous,
        [type]: response.data.data.focus,
      }))
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('wt_toast', {
          detail: {
            message: error.response?.data?.message || 'Could not update today’s focus.',
            type: 'error',
          },
        }),
      )
    } finally {
      setSavingFocus(false)
    }
  }
  const runAction = (key) => {
    setQuickActionsOpen(false)
    if (key === 'check-in') onDailyLog()
    else if (key === 'goal') onGoal()
    else if (key === 'habit') onHabit()
    else if (key === 'journal') onDailyLog()
    else if (key === 'progress') onTab('goals')
    else navigate('/feed')
  }
  return (
    <>
      <section className="pb-8">
        <div className="md:hidden">
          <div className="mb-4">
            <h1 className="text-[22px] font-extrabold text-slate-950 dark:text-white">
              {greeting}, {firstName} <span aria-hidden>{greetingEmoji}</span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{greetingMessage}</p>
          </div>
        </div>
        <div className="hidden md:block">
          <WeeklyTrailTeaser userId={user?.id} refreshKey={JSON.stringify(stats)} fallback={<WebGreetingBanner isMorning={isMorning} bannerImage={bannerImage} bannerOverlay={bannerOverlay} greeting={greeting} firstName={firstName} greetingEmoji={greetingEmoji} greetingMessage={greetingMessage} onNew={() => setQuickActionsOpen(true)} />} />
        </div>
        {loading ? (
          <div role="status" aria-label="Loading your dashboard" className="mt-5 grid animate-pulse gap-4 md:grid-cols-2">
            <span className="sr-only">Loading your dashboard</span>
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-gray-800" />
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-gray-800" />
          </div>
        ) : <>
        <ActivePromotion userId={user?.id} />
        <div className="md:hidden">
          <PillTabs layoutId="mobile-home-tabs" items={homeTabs} value="overview" onChange={onTab} className="mb-4" label="Home views" />
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="wt-momentum-card relative min-h-[220px] overflow-hidden px-5 py-5 text-center">
              <MomentumLandscape period={isEvening ? 'night' : isMorning ? 'morning' : 'afternoon'} />
              <div className="relative z-10">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Your Momentum</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <strong className="text-5xl text-slate-950 dark:text-white">{momentum}</strong>
                  {consistencyTrend !== null && (
                    <span className={`rounded-full px-2 py-1 text-sm font-bold ${consistencyTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {consistencyTrend >= 0 ? '↗ +' : '↘ '}
                      {consistencyTrend}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">7-day habit consistency</p>
              </div>
              <MomentumChart series={weeklyMomentum} momentum={momentum} />
            </div>
            <div className="grid grid-cols-2 gap-2 bg-blue-50/40 p-2 dark:bg-gray-800">
              {[
                ['Goals progressed', `${goalsProgressed}/${activeGoals.length}`],
                ['Consistency', `${stats?.weekConsistency ?? 0}%`],
                ['Habit completions', stats?.todayHabitLogs ?? 0],
                ['Active goals', activeGoals.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 text-left dark:border-gray-700 dark:bg-gray-900">
                  <b className="text-xl text-slate-950 dark:text-white">{value}</b>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <WeeklyTrailTeaser userId={user?.id} refreshKey={JSON.stringify(stats)} />
          <div className="mt-6 mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Today’s Focus</h2>
              <p className="text-xs text-slate-500">Your most lagging goal and habit.</p>
            </div>
            <button type="button" onClick={() => setFocusPickerType('all')} className="text-sm font-semibold text-blue-600">
              Choose
            </button>
          </div>
          <div className="grid gap-2">
            <FocusItem type="goal" item={focusSources.goal} onOpen={() => onGoal(focusSources.goal)} />
            <FocusItem type="habit" item={focusSources.habit} onOpen={() => onHabit(focusSources.habit)} />
          </div>
        </div>

        <div className="hidden md:block">
          <div className="mb-4 grid grid-cols-4 gap-3">
            {[
              [Target, 'Active Goals', stats?.activeGoals ?? activeGoals.length, 'bg-rose-50 text-rose-500'],
              [Zap, 'Habits Today', stats?.todayHabitLogs ?? 0, 'bg-blue-50 text-blue-500'],
              [Flame, 'Habit Consistency', `${stats?.weekConsistency ?? 0}%`, 'bg-orange-50 text-orange-500'],
              [BarChart3, 'Goal Progress', `${stats?.goalProgress ?? 0}%`, 'bg-emerald-50 text-emerald-500'],
            ].map(([Icon, label, value, tone]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <b className="block text-lg leading-none text-slate-950 dark:text-white">{value}</b>
                  <span className="text-xs text-slate-500">{label}</span>
                </span>
              </div>
            ))}
          </div>
          <h2 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Quick Actions</h2>
          <div className="mb-4 flex gap-2">
            {ACTIONS.map((action) => (
              <button key={action.key} type="button" onClick={() => runAction(action.key)} className="flex min-w-[108px] flex-1 flex-col items-center rounded-xl border border-slate-100 bg-white px-2 py-3 text-xs font-semibold text-slate-800 shadow-sm hover:border-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <ActionIcon action={action} className="mb-2 h-9 w-9" />
                {action.webLabel}
              </button>
            ))}
          </div>
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">Today’s Focus</h2>
                <p className="text-xs text-slate-500">Your most lagging goal and habit, unless you choose others.</p>
              </div>
              <button type="button" onClick={() => setFocusPickerType('all')} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:bg-gray-900">
                Choose
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FocusItem type="goal" item={focusSources.goal} onOpen={() => onGoal(focusSources.goal)} />
              <FocusItem type="habit" item={focusSources.habit} onOpen={() => onHabit(focusSources.habit)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Panel title="My Goals" onAll={() => onTab('goals')}>
              {featuredGoals.map((goal, i) => (
                <GoalRow key={goal.id || goal._id || i} goal={goal} index={i} onClick={() => onGoal(goal)} />
              ))}
              {!featuredGoals.length && <Empty text="No active goals yet." />}
            </Panel>
            <Panel title="My Habits" onAll={() => onTab('habits')}>
              {featuredHabits.map((habit, i) => (
                <HabitRow key={habit.id || habit._id || i} habit={habit} onClick={() => onHabit(habit)} />
              ))}
              {!featuredHabits.length && <Empty text="No active habits yet." />}
            </Panel>
            <Panel title="Recent Activity" onAll={() => navigate('/feed')}>
              <div className="max-h-[250px] overflow-y-auto pr-1">
                {activityItems.map((activity, i) => (
                  <div key={activity._id || i} className="flex items-start gap-2 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xs font-bold text-blue-600">{activity.user?.avatar || activity.avatar ? <img src={activity.user?.avatar || activity.avatar} alt="" className="h-full w-full object-cover" /> : (activity.user?.name || activity.name || 'W').charAt(0)}</span>
                    <span className="min-w-0 flex-1 text-xs text-slate-500">
                      <b className="text-slate-900 dark:text-white">{activity.user?.name || activity.name || 'You'}</b> {activityCopy(activity)}
                      <span className="block text-[10px]">{relativeTime(activity.activityAt || activity.createdAt || activity.timestamp)}</span>
                    </span>
                  </div>
                ))}
                {!activityItems.length && <Empty text="No activity in the last 7 days." />}
              </div>
            </Panel>
          </div>
        </div>
        </>}
      </section>
      <AnimatePresence>
        {focusPickerType && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.button type="button" aria-label="Close focus picker" onClick={() => setFocusPickerType(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="focus-picker-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl">
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-gray-700">
                <div>
                  <h2 id="focus-picker-title" className="font-bold text-slate-950 dark:text-white">
                    Choose today’s focus
                  </h2>
                  <p className="text-xs text-slate-500">Choose one goal and one habit. You can change them anytime.</p>
                </div>
                <button type="button" onClick={() => setFocusPickerType(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800">
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <FocusChoices type="goal" items={activeGoals} selected={focusSources.goal} saving={savingFocus} onSelect={saveFocus} />
                <FocusChoices type="habit" items={habits} selected={focusSources.habit} saving={savingFocus} onSelect={saveFocus} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <QuickActions open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} onAction={runAction} />
    </>
  )
}

function Panel({ title, onAll, children }) {
  return (
    <div className="min-h-[240px] rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold text-slate-950 dark:text-white">{title}</h2>
        <button type="button" onClick={onAll} className="text-xs font-semibold text-blue-500">
          See all
        </button>
      </div>
      {children}
    </div>
  )
}
function Empty({ text }) {
  return <div className="flex min-h-[145px] items-center justify-center text-center text-sm text-slate-400">{text}</div>
}
