import { lazy, Suspense, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, Users, Trophy, BarChart3, User, Newspaper } from 'lucide-react'
import useApiStore from '../store/apiStore'
const AccountMenuSheet = lazy(() => import('./account/AccountMenuSheet'));

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
  const { isAuthenticated } = useApiStore()
  const [accountOpen, setAccountOpen] = useState(false)

  const path = location.pathname

  return (
    <>
      {isAuthenticated && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="w-full pb-safe">
            <div className="backdrop-blur bg-white/90 dark:bg-gray-900/90 border-t border-gray-200 dark:border-gray-800 shadow-2xl rounded-none">
              <div className="flex items-stretch w-full">
                <TabButton
                  active={path.startsWith('/feed') || path === '/'}
                  label="Feed"
                  Icon={Newspaper}
                  onClick={() => navigate('/feed')}
                />
                {(
                  <TabButton
                    active={path.startsWith('/communities')}
                    label="Communities"
                    Icon={Users}
                    onClick={() => navigate('/communities')}
                  />
                )}
                <TabButton
                  active={path.startsWith('/dashboard')}
                  label="Dashboard"
                  Icon={BarChart3}
                  onClick={() => navigate('/dashboard')}
                />
                {(
                  <TabButton
                    active={path.startsWith('/leaderboard')}
                    label="Leaderboard"
                    Icon={Trophy}
                    onClick={() => navigate('/leaderboard')}
                  />
                )}
                <TabButton
                  active={false}
                  label={isAuthenticated ? 'Account' : 'Login'}
                  Icon={User}
                  onClick={() => (isAuthenticated ? setAccountOpen(true) : navigate('/auth'))}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {isAuthenticated && (
        <Suspense fallback={null}>
          <AccountMenuSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
        </Suspense>
      )
      }
    </>
  )
}

export default BottomTabBar


