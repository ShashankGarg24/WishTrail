import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const PREVIEW_COUNT = 6

export default function CategoryTileSelector({ items, value, onChange, ariaLabel = 'Category', disabled = false }) {
  const [expanded, setExpanded] = useState(false)
  const selectedOutsidePreview = value && !items.slice(0, PREVIEW_COUNT).some(item => item.key === value)
  const previewItems = selectedOutsidePreview
    ? [...items.slice(0, PREVIEW_COUNT - 1), items.find(item => item.key === value)].filter(Boolean)
    : items.slice(0, PREVIEW_COUNT)
  const visibleItems = expanded ? items : previewItems

  return <div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={ariaLabel}>
      {visibleItems.map(item => {
        const selected = value === item.key
        return <button key={item.key} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(item.key)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-[#4c99e6] bg-blue-50 text-[#0b1746] ring-1 ring-[#4c99e6]/20 dark:bg-blue-950/30 dark:text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 dark:border-line dark:bg-surface dark:text-muted'}`}>
          {item.icon}<span>{item.label}</span>
        </button>
      })}
    </div>
    {items.length > PREVIEW_COUNT && <button type="button" disabled={disabled} onClick={() => setExpanded(current => !current)} className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#1683ed] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-blue-950/30" aria-expanded={expanded}>
      {expanded ? <><ChevronUp className="h-3.5 w-3.5"/>Show less</> : <><ChevronDown className="h-3.5 w-3.5"/>See all categories</>}
    </button>}
  </div>
}
