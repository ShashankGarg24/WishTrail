import React from 'react'

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
    pathname.startsWith('/profile') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/inspiration') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/communities')
  )
}

export default class ScrollMemory extends React.Component {
  constructor(props) {
    super(props)
    this.prevKey = null
    this.timers = []
    this.origPush = null
    this.origReplace = null
    this.onPopState = this.onPopState.bind(this)
    this.onBeforeUnload = this.onBeforeUnload.bind(this)
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
  }

  componentDidMount() {
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual' } catch {}

    window.addEventListener('popstate', this.onPopState)
    window.addEventListener('beforeunload', this.onBeforeUnload)
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    try {
      this.origPush = window.history.pushState
      this.origReplace = window.history.replaceState
      const dispatch = () => { try { window.dispatchEvent(new Event('popstate')) } catch {} }
      window.history.pushState = (...args) => { const r = this.origPush.apply(window.history, args); dispatch(); return r }
      window.history.replaceState = (...args) => { const r = this.origReplace.apply(window.history, args); dispatch(); return r }
    } catch {}

    // Initial restore
    this.handleRouteChange()
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.onPopState)
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    try {
      if (this.origPush) window.history.pushState = this.origPush
      if (this.origReplace) window.history.replaceState = this.origReplace
    } catch {}
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
  }

  onPopState() {
    this.handleRouteChange()
  }

  onBeforeUnload() {
    this.saveCurrentScroll()
  }

  onVisibilityChange() {
    try { if (document.visibilityState === 'hidden') this.saveCurrentScroll() } catch {}
  }

  saveCurrentScroll() {
    const key = this.prevKey
    if (!key) return
    if (!isTrackedPath((key || '').split('?')[0])) return
    const store = readStore()
    store[key] = window.scrollY || window.pageYOffset || 0
    writeStore(store)
  }

  handleRouteChange() {
    let pathname = '/'
    let search = ''
    try {
      pathname = window.location.pathname || '/'
      search = window.location.search || ''
    } catch {}

    const newKey = makeKey(pathname, search)

    // Save previous scroll
    if (this.prevKey && isTrackedPath((this.prevKey || '').split('?')[0])) {
      const store = readStore()
      store[this.prevKey] = window.scrollY || window.pageYOffset || 0
      writeStore(store)
    }

    this.prevKey = newKey

    // Restore new route scroll
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
    if (isTrackedPath(pathname)) {
      const store = readStore()
      const y = Number(store[newKey] ?? 0) || 0
      try { window.scrollTo(0, y) } catch {}
      this.timers.push(setTimeout(() => { try { window.scrollTo(0, y) } catch {} }, 50))
      this.timers.push(setTimeout(() => { try { window.scrollTo(0, y) } catch {} }, 200))
    } else {
      try { window.scrollTo(0, 0) } catch {}
    }
  }

  render() { return null }
}


