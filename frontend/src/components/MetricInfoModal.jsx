import { useEffect } from 'react'
import { Info, X } from 'lucide-react'

export default function MetricInfoModal({ metric, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!metric) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-950/45 p-0 sm:p-4" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="metric-info-title" onMouseDown={(event) => event.stopPropagation()} className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-2 text-[#4c99e6]"><Info className="h-5 w-5" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-[#4c99e6]">About this metric</p><h2 id="metric-info-title" className="text-lg font-semibold text-gray-900 dark:text-white">{metric.title}</h2></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close metric explanation" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-5 text-sm leading-6 text-gray-700 dark:text-gray-300">{metric.description}</p>
        {metric.formula && <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900/45 p-3"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">How it is calculated</p><p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">{metric.formula}</p></div>}
        {metric.note && <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">{metric.note}</p>}
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#4c99e6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3d88d5]">Got it</button>
      </section>
    </div>
  )
}
