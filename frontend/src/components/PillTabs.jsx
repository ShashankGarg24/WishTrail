import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Home, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react'

export const homeTabs = [
  { value: 'overview', label: 'Overview', icon: Home },
  { value: 'goals', label: 'Goals', icon: Target },
  { value: 'habits', label: 'Habits', icon: Zap },
]

export default function PillTabs({ items, value, onChange, label = 'Choose view', className = '', layoutId }) {
  const rail = useRef(null)
  const reduced = useReducedMotion()
  const [edges, setEdges] = useState({ left: false, right: false })
  const measure = () => {
    const node = rail.current
    if (node) setEdges({ left: node.scrollLeft > 2, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 })
  }
  useEffect(() => {
    if (!rail.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(rail.current)
    measure()
    return () => observer.disconnect()
  }, [items.length])
  useEffect(() => {
    const node = rail.current
    const selected = node?.querySelector('[aria-pressed="true"]')
    if (selected) node.scrollTo({ left: selected.offsetLeft - node.clientWidth / 2 + selected.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' })
  }, [value, reduced])
  const scroll = direction => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .65, behavior: reduced ? 'auto' : 'smooth' })
  return (
    <motion.div data-overflow={edges.left || edges.right} layoutId={layoutId} transition={{ duration: reduced ? 0 : .36, ease: [.22, 1, .36, 1] }} className={`wt-tab-switcher ${className}`}>
      {edges.left && <button type="button" className="wt-tab-arrow is-left" aria-label={`Scroll ${label.toLowerCase()} left`} onClick={() => scroll(-1)}><ChevronLeft size={16} /></button>}
      <div ref={rail} onScroll={measure} className="wt-pill-tabs" role="group" aria-label={label}>
      {items.map(({ value: key, label: text, icon: Icon }) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange?.(key)}>
          {Icon && <Icon aria-hidden="true" strokeWidth={2} />}
          <span>{text}</span>
        </button>
      ))}
      </div>
      {edges.right && <button type="button" className="wt-tab-arrow is-right" aria-label={`Scroll ${label.toLowerCase()} right`} onClick={() => scroll(1)}><ChevronRight size={16} /></button>}
    </motion.div>
  )
}
