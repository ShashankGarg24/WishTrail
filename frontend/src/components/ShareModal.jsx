import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Share2, ArrowLeft, Download, Check, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { goalsAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { defaultShareOptions, shareSnapshot } from '../utils/goalShare'
import { renderGoalImage, shareGoalImage, downloadGoalImage } from '../services/goalImageShare'
import { trackGoalShare } from '../lib/observability/datadog'
import GoalSharePreview from './GoalSharePreview'
import useApiStore from '../store/apiStore'

const names = { MINIMAL: 'Minimal', JOURNEY: 'Journey', PHOTO: 'Photo', PROGRESS: 'Progress' }
const button = 'min-h-[44px] rounded-xl border border-blue-100 px-4 py-3 text-sm font-semibold text-[#2369aa] transition hover:bg-blue-50 disabled:opacity-50'

export default function ShareModal({ isOpen, onClose, goal, shareType, eventId }) {
  const [context, setContext] = useState(null)
  const [options, setOptions] = useState(null)
  const [step, setStep] = useState('templates')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [file, setFile] = useState(null)
  const [visibility, setVisibility] = useState('PRIVATE')
  const [posted, setPosted] = useState(false)
  const cardRef = useRef(null)
  const dialogRef = useRef(null)
  const requestId = useRef('')
  const id = goal?.id || goal?._id
  useEffect(() => {
    if (!isOpen || !id) return
    let active = true
    setContext(null); setOptions(null); setError(''); setStep('templates'); setFile(null); setPosted(false)
    requestId.current = globalThis.crypto?.randomUUID?.() || `share-${Date.now()}-${Math.random().toString(36).slice(2)}`
    goalsAPI.getShareContext(id, { shareType, eventId }).then(async response => {
      const data = response.data.data
      if (data.photo) {
        const loaded = await new Promise(resolve => {
          const img = new Image(); img.crossOrigin = 'anonymous'
          const timer = setTimeout(() => resolve(false), 8000)
          img.onload = () => { clearTimeout(timer); resolve(true) }
          img.onerror = () => { clearTimeout(timer); resolve(false) }
          img.src = data.photo
        })
        if (!loaded) { delete data.photo; data.templates = data.templates.filter(item => item !== 'PHOTO') }
      }
      if (!active) return
      setContext(data); setOptions(defaultShareOptions(data)); setVisibility(data.privacy)
      trackGoalShare('goal_share_opened', { shareType: data.shareType })
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Unable to load the preview. Please retry.') })
    return () => { active = false }
  }, [isOpen, id, shareType, eventId, reload])
  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement
    lockBodyScroll(); dialogRef.current?.focus()
    return () => { unlockBodyScroll(); previous?.focus?.() }
  }, [isOpen])
  if (!isOpen) return null
  const snapshot = context && options ? shareSnapshot(context, options) : null
  const change = (key, value) => {
    if (posted) requestId.current = globalThis.crypto?.randomUUID?.() || `share-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setOptions(previous => ({ ...previous, [key]: value })); setFile(null); setPosted(false); setError('')
  }
  const prepare = async () => {
    setBusy(true); setError(''); setStep('destinations')
    try { setFile(await renderGoalImage(cardRef.current)) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const post = async () => {
    setBusy(true); setError('')
    try {
      await useApiStore.getState().postGoalShare(id, { shareType: context.shareType, eventId: context.eventId, revision: context.revision, options, visibility, requestId: requestId.current })
      setPosted(true)
      trackGoalShare('goal_share_internal', { shareType: context.shareType, template: options.template, format: options.format })
      window.dispatchEvent(new Event('wt_refresh'))
      toast.success('Posted to WishTrail')
    } catch (err) { setError(err.response?.data?.message || 'Unable to post. Your preview is ready to retry.') }
    finally { setBusy(false) }
  }
  const external = async () => {
    setBusy(true); setError('')
    trackGoalShare('goal_share_external', { shareType: context.shareType, template: options.template, format: options.format })
    try {
      const result = await shareGoalImage(file)
      if (result === 'download') toast.success('Image downloaded')
    } catch (err) { if (err.name !== 'AbortError') setError(err.message || 'Unable to share. Please retry or download the image.') }
    finally { setBusy(false) }
  }
  const toggle = (key, label, available = true, hint) => available && <label key={key} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 py-2 text-sm"><span>{label}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</span><input type="checkbox" checked={options[key]} onChange={event => change(key, event.target.checked)} className="h-5 w-5 accent-[#4c99e6]"/></label>
  return createPortal(<div className="fixed inset-0 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-5" style={{ zIndex: 10020 }} onClick={() => !busy && onClose()}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-studio-title" tabIndex={-1} data-dd-privacy="mask" onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const nodes = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, [tabindex="0"]')]
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }} className="flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-[#102544] shadow-2xl sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
        {step !== 'templates' && <button aria-label="Back" disabled={busy} onClick={() => { setStep(step === 'destinations' ? 'customize' : 'templates'); setError('') }} className="rounded-lg p-2"><ArrowLeft className="h-5 w-5"/></button>}
        <div className="flex-1"><h2 id="share-studio-title" className="text-lg font-extrabold">{step === 'destinations' ? 'Share to' : 'Share your journey'}</h2><p className="mt-1 text-xs text-slate-500">{step === 'templates' ? 'Choose a template and make it yours.' : 'Only what you see in the preview is shared.'}</p></div>
        <button aria-label="Close share studio" disabled={busy} onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button>
      </header>
      <div className="overflow-y-auto p-5 sm:p-7">
        {!snapshot && !error && <p role="status" className="py-16 text-center text-slate-500">Preparing your journey…</p>}
        {snapshot && <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-3xl bg-gradient-to-b from-slate-100 to-blue-50 p-4 shadow-inner"><GoalSharePreview snapshot={snapshot} cardRef={cardRef} maxWidth={step === 'templates' ? 270 : 320}/></div>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2369aa]">{context.shareType[0] + context.shareType.slice(1).toLowerCase()}</span>
            {step === 'templates' && <>
              <fieldset><legend className="mb-3 text-sm font-bold">Template</legend><div className="grid grid-cols-3 gap-2">{context.templates.map(template => <button key={template} onClick={() => { change('template', template); trackGoalShare('goal_share_template_selected', { shareType: context.shareType, template }) }} aria-pressed={options.template === template} className={`rounded-xl border-2 p-2 text-xs font-semibold ${options.template === template ? 'border-[#4c99e6] bg-blue-50 text-[#2369aa]' : 'border-slate-100'}`}><div className="pointer-events-none mb-2 overflow-hidden rounded-lg"><GoalSharePreview snapshot={shareSnapshot(context, { ...options, template })} maxWidth={86}/></div>{names[template]}</button>)}</div></fieldset>
              <fieldset><legend className="mb-3 text-sm font-bold">Format</legend><div className="grid grid-cols-2 gap-3">{[['STORY_9_16', 'Story · 9:16'], ['SQUARE_1_1', 'Square · 1:1']].map(([format, label]) => <button key={format} aria-pressed={options.format === format} onClick={() => { change('format', format); trackGoalShare('goal_share_format_selected', { shareType: context.shareType, format }) }} className={`${button} ${options.format === format ? 'border-[#4c99e6] bg-blue-50' : ''}`}>{label}</button>)}</div></fieldset>
              <button onClick={() => setStep('customize')} className="min-h-[48px] w-full rounded-xl bg-[#4c99e6] px-4 py-3 font-bold text-white">Next: Customize →</button>
            </>}
            {step === 'customize' && <>
              <div className="divide-y divide-slate-100">
                {toggle('showProgress', 'Show progress', context.progress !== undefined)}
                {toggle('showJourneyDuration', 'Show journey duration', context.journeyDuration !== undefined, 'Calendar days, including start and end.')}
                {toggle('showStats', 'Show updates and active days', context.progressUpdateCount !== undefined, 'Text updates; active days also include completion day.')}
                {toggle('showMilestones', 'Show recorded journey events', options.template === 'JOURNEY' && context.selectedJourneyEvents.some(event => !['start', 'completion'].includes(event.type)))}
                {toggle('showCompletionDate', 'Show completion date', Boolean(context.completionDate))}
                {toggle('showFeeling', 'Show how I felt', Boolean(context.feeling))}
                {toggle('showNote', 'Include a personal note')}
              </div>
              {options.showNote && <label className="block text-xs font-semibold">Personal note<textarea value={options.note} onChange={event => change('note', event.target.value)} maxLength={120} rows={3} placeholder="Dreams. Goals. Progress." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"/><span className="block text-right text-slate-400">{options.note.length}/120</span></label>}
              <button disabled={busy} onClick={prepare} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#4c99e6] px-4 py-3 font-bold text-white disabled:opacity-50"><Share2 className="h-4 w-4"/>{busy ? 'Preparing image…' : 'Share'}</button>
            </>}
            {step === 'destinations' && <>
              <label className="block text-sm font-semibold">Post visibility<select value={visibility} disabled={busy || posted} onChange={event => setVisibility(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="PUBLIC">Public · visible to other members</option><option value="PRIVATE">Only me</option></select></label>
              <button disabled={busy || posted} onClick={post} className={`${button} w-full text-left`}><span className="flex items-center gap-2">{posted && <Check className="h-4 w-4"/>}{posted ? 'Posted to WishTrail' : 'Post to WishTrail'}</span><span className="mt-1 block text-xs font-normal text-slate-500">Share this preview with your chosen audience.</span></button>
              <button disabled={busy || !file} onClick={external} className={`${button} w-full text-left`}><span className="flex items-center gap-2"><Share2 className="h-4 w-4"/>Share elsewhere</span><span className="mt-1 block text-xs font-normal text-slate-500">Share the image to your apps, or save it.</span></button>
              {!file && <button disabled={busy} onClick={prepare} className={button}>{busy ? 'Preparing image…' : 'Retry image export'}</button>}
              {!window.ReactNativeWebView && <button disabled={busy || !file} onClick={() => { downloadGoalImage(file); trackGoalShare('goal_share_external', { shareType: context.shareType, template: options.template, format: options.format }) }} className="flex min-h-[44px] items-center gap-2 text-sm text-[#2369aa]"><Download className="h-4 w-4"/>Download image</button>}
            </>}
            {context.privacy === 'PRIVATE' && <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><Lock className="mt-0.5 h-4 w-4 shrink-0"/>Your goal stays private. The shared image or post contains only what is visible in this preview.</p>}
          </fieldset>
        </div>}
        {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button disabled={busy} onClick={() => setReload(value => value + 1)} className="ml-3 min-h-[44px] font-bold underline">Refresh preview</button></div>}
      </div>
    </section>
  </div>, document.body)
}
