import { lazy, Suspense, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, LayoutGrid, Search, Sparkles, TrendingUp, Plus, User } from 'lucide-react'
import useApiStore from '../store/apiStore'
const AccountMenuSheet = lazy(() => import('./account/AccountMenuSheet'));

const TabButton = ({ active, label, Icon, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-colors ${
      active 
        ? 'text-[#4c99e6]' 
        : 'text-gray-500 dark:text-gray-400'
    }`}
  >
    <div className="relative">
      <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#4c99e6] text-white text-[10px] font-semibold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className={`text-[10px] font-medium mt-1 uppercase tracking-wide ${active ? 'font-semibold' : ''}`}>
      {label}
    </span>
  </button>
)

const BottomTabBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user: currentUser } = useApiStore()
  const [accountOpen, setAccountOpen] = useState(false)

  const path = location.pathname

  return (
    <>
      {isAuthenticated && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="w-full pb-safe">
            {/* FAB Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-14 h-14 rounded-full bg-[#4c99e6] shadow-lg flex items-center justify-center hover:bg-[#3d88d5] active:scale-95 transition-all"
              >
                <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Bottom Bar */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
              <div className="flex items-stretch w-full px-2">
                <TabButton
                  active={path.startsWith('/feed')}
                  Icon={LayoutGrid}
                  onClick={() => navigate('/feed')}
                />
                <TabButton
                  active={path.startsWith('/discover')}
                  Icon={Search}
                  onClick={() => navigate('/discover')}
                />
                {/* Spacer for FAB */}
                <div className="flex-1" />
                <TabButton
                  active={path.startsWith('/leaderboard')}
                  Icon={TrendingUp}
                  onClick={() => navigate('/leaderboard')}
                />
                <button
                  onClick={() => setAccountOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    {currentUser?.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
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


