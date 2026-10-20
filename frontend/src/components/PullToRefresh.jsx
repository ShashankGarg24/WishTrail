import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PullToRefresh({ children, onRefresh, disabled = false }) {
  const root = useRef(null)
  const latest = useRef({ onRefresh, disabled })
  latest.current = { onRefresh, disabled }
  const busy = useRef(false)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    const node = root.current
    let start = null
    let pull = 0
    const reset = () => { start = null; pull = 0; setDistance(0); setDragging(false) }
    const atTop = target => {
      for (let el = target; el; el = el.parentElement) {
        if (el.scrollTop > 0) return false
      }
      return window.scrollY <= 0
    }
    const begin = event => {
      if (busy.current || latest.current.disabled || !window.matchMedia('(max-width: 767px)').matches || event.touches.length !== 1 || !atTop(event.target)) return
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
    const move = event => {
      if (!start) return
      if (event.touches.length !== 1) return reset()
      const dy = event.touches[0].clientY - start.y
      const dx = event.touches[0].clientX - start.x
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return reset()
      if (!event.cancelable) return reset()
      event.preventDefault()
      pull = Math.min(100, dy * .45)
      setDragging(true)
      setDistance(pull)
    }
    const end = async () => {
      if (!start) return
      start = null
      setDragging(false)
      if (pull < 64 || busy.current) return reset()
      busy.current = true
      setRefreshing(true)
      setDistance(56)
      try { await latest.current.onRefresh() }
      catch { /* Pages display their own refresh errors. */ }
      finally { busy.current = false; setRefreshing(false); reset() }
    }
    node.addEventListener('touchstart', begin, { passive: true })
    node.addEventListener('touchmove', move, { passive: false })
    node.addEventListener('touchend', end)
    node.addEventListener('touchcancel', reset)
    const previous = document.documentElement.style.overscrollBehaviorY
    document.documentElement.style.overscrollBehaviorY = 'none'
    return () => {
      document.documentElement.style.overscrollBehaviorY = previous
      node.removeEventListener('touchstart', begin)
      node.removeEventListener('touchmove', move)
      node.removeEventListener('touchend', end)
      node.removeEventListener('touchcancel', reset)
    }
  }, [])
  return <div ref={root} className="wt-pull-refresh">
    <div className={`wt-pull-indicator ${dragging ? 'is-dragging' : ''}`} style={{ height: distance }} role="status" aria-live="polite">
      {distance > 0 && <><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} style={{ transform: refreshing ? undefined : `rotate(${distance * 3}deg)` }} /><span>{refreshing ? 'Refreshing?' : distance >= 64 ? 'Release to refresh' : 'Pull to refresh'}</span></>}
    </div>
    {children}
  </div>
}
