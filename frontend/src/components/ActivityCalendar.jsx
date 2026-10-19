import { useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Flag, Trophy } from 'lucide-react'

const keyForDay = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export default function ActivityCalendar({ title = 'Calendar view', subtitle, marks = {}, initialDate, legend = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [month, setMonth] = useState(() => {
    const candidate = initialDate ? new Date(`${String(initialDate).slice(0, 10)}T12:00:00`) : new Date()
    const safe = Number.isNaN(candidate.getTime()) ? new Date() : candidate
    return new Date(safe.getFullYear(), safe.getMonth(), 1)
  })
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = useMemo(() => {
    const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7
    const days = new Date(year, monthIndex + 1, 0).getDate()
    const result = [...Array.from({ length: leading }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)]
    while (result.length % 7) result.push(null)
    return result
  }, [monthIndex, year])
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const markedCount = Object.keys(marks).filter(key => key.startsWith(monthPrefix)).length

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-gray-700/60">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#1683ed] dark:bg-blue-950/40"><CalendarDays className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-[#0b1746] dark:text-white">{title}</strong>{subtitle && <span className="mt-0.5 block text-[11px] text-slate-500">{subtitle}</span>}</span>
      <span className="text-[10px] font-bold text-slate-400">{open ? 'Hide' : 'Show'}</span><ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t border-slate-100 p-4 dark:border-gray-700">
      <div className="mb-4 grid grid-cols-[36px_1fr_36px] items-center">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-gray-600 dark:text-gray-300"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center"><h4 className="text-sm font-extrabold text-slate-950 dark:text-white">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4><p className="text-[10px] text-slate-400">{markedCount} marked {markedCount === 1 ? 'day' : 'days'}</p></div>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-gray-600 dark:text-gray-300"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span key={day} className="pb-2 text-[9px] font-bold uppercase text-slate-400">{day}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="h-10" />
          const mark = marks[keyForDay(year, monthIndex, day)]
          const indicators = mark?.indicators || []
          const hasStart = indicators.includes('start')
          const hasEnd = indicators.includes('end')
          const hasLog = indicators.includes('log')
          const hasTarget = indicators.includes('target')
          return <span key={day} title={mark?.label || undefined} className={`relative mx-0.5 mb-1 grid h-9 place-items-center rounded-lg text-xs font-bold ${mark?.className || 'text-slate-500 dark:text-gray-400'}`}>
            {day}
            {hasStart && <i className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white shadow-sm dark:ring-gray-800"><Flag className="h-2.5 w-2.5 fill-current" /></i>}
            {hasEnd && <i className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white shadow-sm dark:ring-gray-800"><Check className="h-2.5 w-2.5" strokeWidth={3} /></i>}
            {hasTarget && <i className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-white ring-2 ring-white shadow-sm dark:ring-gray-800"><Trophy className="h-2.5 w-2.5" /></i>}
            {hasLog && <i className="absolute bottom-1 h-1.5 w-4 rounded-full bg-sky-500" />}
            {mark && indicators.length === 0 && <i className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${mark.dotClassName || 'bg-[#1683ed]'}`} />}
          </span>
        })}
      </div>
      {legend.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500 dark:border-gray-700">{legend.map(item => <span key={item.label} className="flex items-center gap-1.5">{item.type === 'start' ? <i className="grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-white"><Flag className="h-2.5 w-2.5 fill-current" /></i> : item.type === 'end' ? <i className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></i> : item.type === 'target' ? <i className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-white"><Trophy className="h-2.5 w-2.5" /></i> : item.type === 'log' ? <i className="h-1.5 w-4 rounded-full bg-sky-500" /> : <i className={`h-2 w-2 rounded-full ${item.dotClassName}`} />}{item.label}</span>)}</div>}
    </div>}
  </section>
}
