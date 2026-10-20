import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { shallow } from 'zustand/shallow'
import useApiStore from '../store/apiStore'
import { scrollToSection } from '../utils/sectionScroll'

const Header = () => {
  const {
    isAuthenticated,
    unreadNotifications,
    getNotifications,
    user: currentUser,
  } = useApiStore(state => ({
    isAuthenticated: state.isAuthenticated,
    unreadNotifications: state.unreadNotifications,
    getNotifications: state.getNotifications,
    user: state.user,
  }), shallow)
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        document.getElementById('landing-menu-toggle')?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  const dashboardTab =
    location.pathname === '/home' || location.pathname === '/dashboard'
      ? new URLSearchParams(location.search).get('tab')
      : null
  const isFocusedDashboard =
    dashboardTab === 'goals' || dashboardTab === 'habits'
  const isDiscoverActive = location.pathname.startsWith('/discover')
  const isNotificationsActive = location.pathname.startsWith('/notifications')
  const mobilePageTitle = [
    ['/feed', 'Feed'],
    ['/discover', 'Discover'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
  ].find(([path]) => location.pathname.startsWith(path))?.[1]

  // Main navigation links
  const mainNavigation = [
    { name: 'Home', href: '/home' },
    { name: 'Feed', href: '/feed' },
    { name: 'Discover', href: '/discover' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Profile', href: `/profile/@${currentUser?.username || ''}` },
  ]

  const isActive = (href) => {
    try {
      const url = new URL(href, window.location.origin)
      const path = url.pathname
      return path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(path)
    } catch (_) {
      if (href === '/' && location.pathname === '/') return true
      if (href !== '/' && location.pathname.startsWith(href)) return true
      return false
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      getNotifications({}, { force: true })
    }
  }, [isAuthenticated])

  return (
    <header
      className={`wt-header sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${isFocusedDashboard ? 'hidden md:block' : ''}`}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex h-14 items-center sm:h-16">
          {mobilePageTitle && (
            <h1 className="shrink-0 font-manrope text-xl font-bold text-gray-900 dark:text-white md:hidden">
              {mobilePageTitle}
            </h1>
          )}
          <Link
            to="/"
            className={`${mobilePageTitle ? 'hidden md:flex' : 'flex'} shrink-0 items-center gap-1`}
          >
            <img
              src="/logo-small.png"
              alt="WishTrail"
              width="40"
              height="40"
              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            />
            <span className="-ml-2 font-manrope text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              ishTrail
            </span>
          </Link>

          {!isAuthenticated && location.pathname === '/' && (
            <>
              <nav
                aria-label="Product navigation"
                className="ml-8 hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex"
              >
                <a
                  href="#how-it-works"
                  onClick={(event) => scrollToSection(event, 'how-it-works')}
                  className="hover:text-blue-700"
                >
                  How it works
                </a>
                <a
                  href="#your-journey"
                  onClick={(event) => scrollToSection(event, 'your-journey')}
                  className="hover:text-blue-700"
                >
                  Your Trail
                </a>
                <a
                  href="#community"
                  onClick={(event) => scrollToSection(event, 'community')}
                  className="hover:text-blue-700"
                >
                  Community
                </a>
              </nav>
              <Link
                to="/auth"
                className="ml-auto hidden min-h-[44px] items-center rounded-lg bg-[#4c99e6] px-4 text-sm font-bold text-[#102d4d] hover:bg-[#70afea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 lg:inline-flex"
              >
                Get Started
              </Link>
              <button
                id="landing-menu-toggle"
                type="button"
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50 lg:hidden"
                aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            </>
          )}

          {isAuthenticated && (
            <nav
              aria-label="Global navigation"
              className="hidden items-stretch self-stretch lg:ml-8 lg:flex xl:ml-12"
            >
              {mainNavigation.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative flex items-center px-3 text-sm font-semibold transition-colors ${isActive(link.href) ? 'text-[#4c99e6] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#4c99e6]' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="mx-4 hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-600 transition hover:border-blue-200 md:flex dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400"
            >
              <Search className="h-4 w-4" />
              Search goals and people...
            </button>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/discover')}
              aria-label="Discover"
              aria-current={isDiscoverActive ? 'page' : undefined}
              className={`ml-auto rounded-xl p-2 transition-colors md:hidden ${isDiscoverActive ? 'bg-blue-50 text-[#1683ed] dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-gray-800 dark:hover:text-slate-200'}`}
            >
              <Search
                className="h-5 w-5"
                strokeWidth={isDiscoverActive ? 2.5 : 2}
              />
            </button>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              aria-current={isNotificationsActive ? 'page' : undefined}
              className={`relative ml-1 shrink-0 rounded-xl p-2 transition-colors md:ml-auto ${isNotificationsActive ? 'bg-blue-50 text-[#1683ed] dark:bg-blue-950/50 dark:text-blue-400' : 'text-gray-500 hover:bg-slate-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'}`}
            >
              <Bell
                className="h-5 w-5"
                strokeWidth={isNotificationsActive ? 2.5 : 2}
              />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#4c99e6]" />
              )}
            </button>
          )}
        </div>
      </div>
      {!isAuthenticated && location.pathname === '/' && menuOpen && (
        <nav id="landing-mobile-menu" aria-label="Mobile product navigation" className="border-t border-slate-100 bg-white px-5 py-3 lg:hidden">
          {[
            ['How it works', 'how-it-works'],
            ['Your Trail', 'your-journey'],
            ['Community', 'community'],
            ['Leaderboard', 'leaderboard-showcase'],
          ].map(([label, id]) => (
            <a key={id} href={`#${id}`} className="flex min-h-[44px] items-center text-sm font-semibold text-slate-700" onClick={(event) => {
              setMenuOpen(false)
              scrollToSection(event, id)
            }}>{label}</a>
          ))}
          <Link to="/auth" className="my-2 flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">Get Started</Link>
        </nav>
      )}
    </header>
  )
}

export default Header
