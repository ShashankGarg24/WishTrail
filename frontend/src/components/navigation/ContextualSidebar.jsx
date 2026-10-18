import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, Bell, BookOpen, CalendarCheck, ChevronLeft, ChevronRight, Compass,
  Globe2, Heart, ListChecks, MessageSquare, Plus, Settings,
  Sparkles, Target, User, UserRound, Zap,
} from 'lucide-react'
import useApiStore from '../../store/apiStore'

const CreateGoalWizard = lazy(() => import('../CreateGoalWizard'))
const CreateHabitModal = lazy(() => import('../CreateHabitModal'))
const DailyLogsPromptModal = lazy(() => import('../DailyLogsPromptModal'))

const item = (label, Icon, href, match, action) => ({ label, Icon, href, match, action })

const getSection = pathname => {
  if (pathname === '/home' || pathname === '/dashboard' || pathname.startsWith('/goals/') || pathname.startsWith('/habits/')) return 'home'
  if (pathname === '/feed' || pathname.startsWith('/goal/')) return 'feed'
  if (pathname === '/discover') return 'discover'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname.startsWith('/weekly-trail') || pathname.startsWith('/profile/') || pathname === '/settings' || pathname === '/notifications') return 'profile'
  return null
}

const queryValue = (search, key, fallback) => new URLSearchParams(search).get(key) || fallback

export default function ContextualSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useApiStore()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('wt_sidebar_collapsed') === 'true')
  const [openAction, setOpenAction] = useState(null)
  const section = getSection(location.pathname)
  const username = user?.username || ''

  useEffect(() => localStorage.setItem('wt_sidebar_collapsed', String(collapsed)), [collapsed])

  const groups = useMemo(() => {
    const feedback = () => window.dispatchEvent(new CustomEvent('wt_open_feedback'))
    const shared = [
      { label: '', items: [item('Settings', Settings, '/settings'), item('Feedback', MessageSquare, null, null, feedback)] },
    ]
    if (section === 'home') return [
      { label: 'Home', items: [item('Overview', Compass, '/home?tab=overview', () => queryValue(location.search, 'tab', 'overview') === 'overview'), item('Goals', Target, '/home?tab=goals', () => queryValue(location.search, 'tab', 'overview') === 'goals'), item('Habits', Zap, '/home?tab=habits', () => queryValue(location.search, 'tab', 'overview') === 'habits')] },
      { label: 'Quick actions', items: [item('New Goal', Plus, null, null, () => setOpenAction('goal')), item('New Habit', Plus, null, null, () => setOpenAction('habit')), item('Daily Check-in', CalendarCheck, null, null, () => setOpenAction('daily-log'))] },
      { label: 'My activity', items: [item('My Trail', Activity, `/profile/@${username}?tab=trail`), item('Journal', BookOpen, `/profile/@${username}?tab=daily-logs`)] },
      ...shared,
    ]
    if (section === 'feed') return [
      { label: 'Feed', items: [item('For You', Sparkles, '/feed?view=for-you', () => true)] },
      { label: 'Quick actions', items: [item('New Goal', Plus, null, null, () => setOpenAction('goal')), item('New Habit', Plus, null, null, () => setOpenAction('habit')), item('Daily Check-in', CalendarCheck, null, null, () => setOpenAction('daily-log'))] },
      ...shared,
    ]
    if (section === 'discover') {
      const interests = (user?.interests || []).slice(0, 6)
      return [
        { label: 'Discover', items: [item('Goals', Target, '/discover?tab=goals', () => queryValue(location.search, 'tab', 'goals') === 'goals'), item('People', UserRound, '/discover?tab=people', () => queryValue(location.search, 'tab', 'goals') === 'people')] },
        ...(interests.length ? [{ label: 'Interests', items: interests.map(name => item(name, Heart, `/discover?tab=goals&interest=${encodeURIComponent(name)}`, () => queryValue(location.search, 'interest', '') === name)) }] : []),
        { label: '', items: [item('Edit Interests', Settings, '/settings?section=personal-info&focus=interests')] },
      ]
    }
    if (section === 'leaderboard') return [
      { label: 'Leaderboard', items: [item('Global', Globe2, '/leaderboard', () => true)] },
    ]
    return [
      { label: 'Profile', items: [item('Overview', User, `/profile/@${username}?tab=overview`, () => queryValue(location.search, 'tab', 'overview') === 'overview' && location.pathname.startsWith('/profile/')), item('My Trail', Activity, `/profile/@${username}?tab=trail`, () => queryValue(location.search, 'tab', 'overview') === 'trail'), item('Goals', Target, `/profile/@${username}?tab=goals`, () => queryValue(location.search, 'tab', 'overview') === 'goals'), item('Habits', ListChecks, `/profile/@${username}?tab=habits`, () => queryValue(location.search, 'tab', 'overview') === 'habits'), item('Journal', BookOpen, `/profile/@${username}?tab=daily-logs`, () => queryValue(location.search, 'tab', 'overview') === 'daily-logs')] },
      { label: 'Account', items: [item('Settings', Settings, '/settings', () => location.pathname === '/settings'), item('Notifications', Bell, '/notifications', () => location.pathname === '/notifications')] },
      { label: '', items: [item('Feedback', MessageSquare, null, null, feedback), item("What's New", Sparkles, '/whats-new')] },
    ]
  }, [section, location.pathname, location.search, user?.interests, username])

  if (!section) return null
  return <>
    <aside className={`wt-context-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label={`${section} navigation`}>
      <button className="wt-sidebar-toggle" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
      <nav>
        {groups.map((group, index) => <section className="wt-sidebar-group" key={`${group.label}-${index}`}>
          {group.label && <h2>{group.label}</h2>}
          {group.items.map(({ label, Icon, href, match, action }) => {
            const active = match ? match() : href ? `${location.pathname}${location.search}` === href : false
            return <button key={label} type="button" onClick={() => action ? action() : navigate(href)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} aria-label={label} title={collapsed ? label : undefined}><Icon /><span>{label}</span></button>
          })}
        </section>)}
      </nav>
    </aside>
    <Suspense fallback={null}>
      <CreateGoalWizard
        isOpen={openAction === 'goal'}
        onClose={() => setOpenAction(null)}
        year={new Date().getFullYear()}
        onSaved={() => {
          useApiStore.getState().getGoals?.({ year: new Date().getFullYear(), page: 1, limit: 1000 }, { force: true })
          useApiStore.getState().getDashboardStats?.({ force: true, year: new Date().getFullYear() })
        }}
      />
      <CreateHabitModal
        isOpen={openAction === 'habit'}
        onClose={() => setOpenAction(null)}
        year={new Date().getFullYear()}
        onCreated={() => {
          useApiStore.getState().loadHabits?.({ page: 1, year: new Date().getFullYear(), force: true })
          useApiStore.getState().getDashboardStats?.({ force: true, year: new Date().getFullYear() })
        }}
      />
      <DailyLogsPromptModal
        isOpen={openAction === 'daily-log'}
        onClose={() => setOpenAction(null)}
        onSubmitted={() => {
          setOpenAction(null)
          useApiStore.getState().getDashboardStats?.({ force: true, year: new Date().getFullYear() })
        }}
      />
    </Suspense>
  </>
}
