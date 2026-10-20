import { Home, Target, Zap } from 'lucide-react'

export const homeTabs = [
  { value: 'overview', label: 'Overview', icon: Home },
  { value: 'goals', label: 'Goals', icon: Target },
  { value: 'habits', label: 'Habits', icon: Zap },
]

export default function PillTabs({ items, value, onChange, label = 'Choose view', className = '' }) {
  return (
    <div className={`wt-pill-tabs ${className}`} role="group" aria-label={label}>
      {items.map(({ value: key, label: text, icon: Icon }) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange?.(key)}>
          {Icon && <Icon aria-hidden="true" strokeWidth={2} />}
          <span>{text}</span>
        </button>
      ))}
    </div>
  )
}
