import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Remembers and restores window scroll per route (pathname+search)
// Applies to: '/', '/feed', '/discover', '/dashboard', '/profile*', '/leaderboard'

const STORAGE_KEY = 'wt_scroll_positions_v1'

function readStore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (_) { return {} }
}

function writeStore(store) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch (_) {}
}

function makeKey(pathname, search) {
  return `${pathname || '/'}${search || ''}`
}

function isTrackedPath(pathname) {
  if (!pathname) return false
  return (
    pathname === '/' ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/dashboardv2') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/inspiration') ||
    pathname.startsWith('/auth')
  )
}

export default function ScrollMemory() {
  const location = useLocation()
  const prevKeyRef = useRef(null)
  const hasRestoredRef = useRef(false)

  // Use manual history restoration so the app controls it
  useEffect(() => {
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual' } catch {}
  }, [])

  // On mount, try to restore current path
  useEffect(() => {
    const store = readStore()
    const key = makeKey(location.pathname, location.search)
    prevKeyRef.current = key
    if (!isTrackedPath(location.pathname)) return
    const y = Number(store[key] ?? 0) || 0
    // Restore immediately and once more after a tick (content/infinite-list readiness)
    try { window.scrollTo(0, y) } catch {}
    const tid = setTimeout(() => { try { window.scrollTo(0, y) } catch {} }, 60)
    hasRestoredRef.current = true
    return () => clearTimeout(tid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On route change: save previous, then restore new
  useEffect(() => {
    const newKey = makeKey(location.pathname, location.search)
    const prevKey = prevKeyRef.current
    // Save previous scroll
    if (prevKey && isTrackedPath(prevKey.split('?')[0])) {
      const store = readStore()
      store[prevKey] = window.scrollY || window.pageYOffset || 0
      writeStore(store)
    }
    prevKeyRef.current = newKey

    // Restore new route scroll
    if (isTrackedPath(location.pathname)) {
      const store = readStore()
      const y = Number(store[newKey] ?? 0) || 0
      try { window.scrollTo(0, y) } catch {}
      const t1 = setTimeout(() => { try { window.scrollTo(0, y) } catch {} }, 50)
      const t2 = setTimeout(() => { try { window.scrollTo(0, y) } catch {} }, 200)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else {
      // Default to top for untracked pages
      try { window.scrollTo(0, 0) } catch {}
    }
  }, [location.pathname, location.search])

  // Save on unload/tab hide
  useEffect(() => {
    const handler = () => {
      const key = prevKeyRef.current
      if (!key) return
      if (!isTrackedPath((key || '').split('?')[0])) return
      const store = readStore()
      store[key] = window.scrollY || window.pageYOffset || 0
      writeStore(store)
    }
    window.addEventListener('beforeunload', handler)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') handler() })
    return () => { window.removeEventListener('beforeunload', handler) }
  }, [])

  return null
}


