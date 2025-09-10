import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, Users, Target, Play, User } from 'lucide-react'
import useApiStore from '../store/apiStore'
import AccountMenuSheet from './account/AccountMenuSheet'

const TabButton = ({ active, label, Icon, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-2 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
  >
    <div className="relative">
      <Icon className={`h-6 w-6 ${active ? '' : ''}`} />
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-[11px] leading-3 mt-1">{label}</span>
  </button>
)

const BottomTabBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, unreadNotifications } = useApiStore()
  const [accountOpen, setAccountOpen] = useState(false)

  const path = location.pathname

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-3 pb-safe">
          <div className="glass-card backdrop-blur-lg bg-white/80 dark:bg-gray-800/60 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-stretch">
              <TabButton
                active={path.startsWith('/feed') || path === '/'}
                label="Feed"
                Icon={Activity}
                onClick={() => navigate('/feed')}
              />
              <TabButton
                active={path.startsWith('/discover')}
                label="Discover"
                Icon={Users}
                onClick={() => navigate('/discover')}
              />
              <TabButton
                active={path.startsWith('/leaderboard')}
                label="Leaders"
                Icon={Target}
                onClick={() => navigate('/leaderboard')}
              />
              <TabButton
                active={path.startsWith('/inspiration')}
                label="Inspire"
                Icon={Play}
                onClick={() => navigate('/inspiration')}
              />
              <TabButton
                active={false}
                label={isAuthenticated ? 'Account' : 'Login'}
                Icon={User}
                onClick={() => (isAuthenticated ? setAccountOpen(true) : navigate('/auth'))}
                badge={isAuthenticated ? unreadNotifications : 0}
              />
            </div>
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <AccountMenuSheet open={accountOpen} onClose={() => setAccountOpen(false)} />)
      }
    </>
  )
}

export default BottomTabBar


