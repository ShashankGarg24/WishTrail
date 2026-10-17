import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, Share2 } from 'lucide-react'
import { goalsAPI } from '../services/api'
import { trackGoalShare } from '../lib/observability/datadog'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import AbstractGoalArtwork from './AbstractGoalArtwork'
const ShareModal = lazy(() => import('./ShareModal'))

export default function CelebrationModal({ wish, isOpen, onClose, goalTitle }) {
  const [context, setContext] = useState(null)
  const [sharing, setSharing] = useState(false)
  const closeRef = useRef(null)
  const id = wish?.id || wish?._id
  useEffect(() => {
    if (!isOpen) return
    let active = true
    lockBodyScroll(); closeRef.current?.focus()
    goalsAPI.getShareContext(id, { shareType: 'COMPLETION' }).then(response => { if (active) setContext(response.data.data) }).catch(() => {})
    return () => { active = false; unlockBodyScroll() }
  }, [isOpen, id])
  if (!isOpen) return null
  const stats = context ? [[context.journeyDuration, 'Days'], [context.progressUpdateCount, 'Progress updates'], [context.activeDays, 'Active days']].filter(([value]) => value !== undefined) : []
  return createPortal(<div className="fixed inset-0 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center" style={{ zIndex: 10010 }} onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="goal-celebration-title" onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key === 'Escape' && !sharing) { event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const buttons = [...event.currentTarget.querySelectorAll('button')]
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus() }
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus() }
      }
    }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-center text-[#102544] shadow-2xl dark:bg-gray-800 dark:text-slate-100">
      <button ref={closeRef} aria-label="Close celebration" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 dark:bg-gray-700"><X className="h-5 w-5"/></button>
      <div className="relative mb-5 h-36 overflow-hidden rounded-2xl bg-blue-50 dark:bg-blue-950/40"><AbstractGoalArtwork category={wish?.category} className="h-full w-full"/><div className="absolute inset-0 flex items-center justify-center"><CheckCircle className="h-16 w-16 rounded-full bg-white text-emerald-500 shadow-lg dark:bg-gray-800"/></div></div>
      <h2 id="goal-celebration-title" className="text-2xl font-extrabold">Goal completed!</h2>
      <p className="mt-2 break-words text-lg font-bold">{context?.title || goalTitle || wish?.title}</p>
      <p className="mt-2 text-lg font-bold text-[#4c99e6]">100%</p>
      {context?.completionDate && <p className="mt-1 text-xs text-slate-500">Completed {new Date(`${context.completionDate}T12:00:00`).toLocaleDateString()}</p>}
      {!!stats.length && <div className="my-6 flex rounded-2xl border border-blue-100 bg-blue-50/40 py-4 dark:border-blue-900 dark:bg-blue-950/30">{stats.map(([value, label]) => <div key={label} className="flex-1"><p className="text-xl font-extrabold">{value}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{label}</p></div>)}</div>}
      <button onClick={() => { trackGoalShare('goal_completion_share_clicked', { shareType: 'COMPLETION' }); setSharing(true) }} className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#4c99e6] p-3 text-sm font-bold text-white"><Share2 className="h-4 w-4"/>Share My Journey</button>
      <button onClick={onClose} className="mt-2 min-h-[44px] w-full rounded-xl border border-blue-100 p-3 text-sm font-semibold text-[#2369aa] dark:border-blue-900 dark:text-blue-300">Done</button>
      {sharing && <Suspense fallback={null}><ShareModal isOpen onClose={() => setSharing(false)} goal={wish} shareType="COMPLETION"/></Suspense>}
    </section>
  </div>, document.body)
}
