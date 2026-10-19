import { ChevronDown } from 'lucide-react'

const RANGE_OPTIONS = [[7,'Last 7 days'],[15,'Last 15 days'],[30,'Last 30 days'],[90,'Last 90 days'],[365,'Last year']]

export default function AnalyticsRangeSelect({ value, onChange, maxDays = 30 }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
    Timeframe
    <span className="relative mt-1 block">
      <select value={value} onChange={event=>onChange?.(Number(event.target.value))} className="min-w-[132px] appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-bold normal-case tracking-normal text-[#0b1746] shadow-sm outline-none transition hover:border-blue-300 focus:border-[#1683ed] focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-950">
        {RANGE_OPTIONS.filter(([range])=>range<=maxDays).map(([range,label])=><option key={range} value={range}>{label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-slate-400"/>
    </span>
  </label>
}
