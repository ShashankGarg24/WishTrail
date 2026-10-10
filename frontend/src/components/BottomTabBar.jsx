import { lazy, Suspense, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, BookOpen, CalendarCheck, Home, LayoutGrid, Plus, Search, Target, User, Zap } from 'lucide-react'
import useApiStore from '../store/apiStore'
import AccountMenuSheet from './account/AccountMenuSheet'

const CreateGoalWizard = lazy(() => import('./CreateGoalWizard'))
const CreateHabitModal = lazy(() => import('./CreateHabitModal'))
const DailyLogsPromptModal = lazy(() => import('./DailyLogsPromptModal'))

const TabButton = ({ active, label, Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    title={label}
    className={`flex flex-1 items-center justify-center py-3 transition-colors duration-200 ${active ? 'text-[#1683ed]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
  >
    <span className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${active ? 'bg-blue-50 dark:bg-blue-950/50' : ''}`}>
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
    </span>
  </button>
)

const BottomTabBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user: currentUser } = useApiStore()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [openAction, setOpenAction] = useState(null)
  const path = location.pathname

  if (!isAuthenticated) return null

  const actions = [
    ['daily-log', 'Daily Check-in', "Log today's progress and mood", CalendarCheck, null, 'bg-blue-100 text-blue-600'],
    ['goal', 'Create Goal', 'Set a new goal and plan your journey', Target, null, 'bg-rose-100 text-rose-500'],
    ['habit', 'Create Habit', 'Build a new habit', Zap, null, 'bg-amber-100 text-amber-500'],
    ['journal', 'Add Journal Entry', 'Write about your day', BookOpen, `/profile/@${currentUser?.username || ''}?tab=daily-logs`, 'bg-violet-100 text-violet-600'],
    ['progress', 'Update Progress', 'Log progress for an existing goal', BarChart3, '/home?tab=goals', 'bg-orange-100 text-orange-500']
  ]

  const runAction = (action, destination) => {
    setQuickActionsOpen(false)
    if (action === 'goal' || action === 'habit' || action === 'daily-log') {
      setOpenAction(action)
    } else {
      navigate(destination)
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="relative w-full pb-safe">
          <button
            type="button"
            onClick={() => setQuickActionsOpen(true)}
            aria-label="Open quick actions"
            className="absolute left-1/2 top-[-28px] z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#4c99e6] shadow-lg transition-transform hover:bg-[#3d88d5] active:scale-95"
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          </button>
          <div className="border-t border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="flex w-full items-stretch px-2">
              <TabButton active={path.startsWith('/home') || path.startsWith('/dashboard')} label="Home" Icon={Home} onClick={() => navigate('/home')} />
              <TabButton active={path.startsWith('/feed')} label="Feed" Icon={LayoutGrid} onClick={() => navigate('/feed')} />
              <div className="flex-1" />
              <TabButton active={path.startsWith('/discover')} label="Discover" Icon={Search} onClick={() => navigate('/discover')} />
              <TabButton
                active={path.startsWith('/profile')}
                label="Profile"
                Icon={User}
                onClick={() => setAccountMenuOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
      {quickActionsOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center md:hidden">
          <motion.button
            type="button"
            aria-label="Close quick actions"
            onClick={() => setQuickActionsOpen(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-quick-actions-title"
            className="relative w-full rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-gray-900"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200" />
            <h2 id="bottom-quick-actions-title" className="mb-5 text-xl font-bold text-slate-950 dark:text-white">What would you like to do?</h2>
            <div className="space-y-2">
              {actions.map(([action, label, hint, Icon, destination, tone]) => (
                <button key={action} type="button" onClick={() => runAction(action, destination)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" strokeWidth={2.4} /></span>
                  <span className="min-w-0"><span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{hint}</span></span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setQuickActionsOpen(false)} className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">Cancel</button>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AccountMenuSheet open={accountMenuOpen} onClose={() => setAccountMenuOpen(false)} />

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
          onCreated={() => {
            setOpenAction(null)
            useApiStore.getState().loadHabits?.({ page: 1, force: true })
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
  )
}

export default BottomTabBar
