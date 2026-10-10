import AbstractGoalArtwork from './AbstractGoalArtwork'
import CategoryIcon from './CategoryIcon'
import { getCategoryVisual } from '../utils/categoryIcons'

const clampProgress = goal => Math.min(100, Math.max(0, Math.round(Number(goal?.completedAt ? 100 : (goal?.progress?.percent ?? goal?.progressPercentage ?? goal?.progress ?? 0)) || 0)))

const healthOf = goal => {
  if (goal?.completedAt || goal?.lifecycleStatus === 'COMPLETED') return { label: 'Completed', reason: 'Goal completed', dot: 'bg-emerald-500' }
  const state = goal?.goalHealth || 'GETTING_STARTED'
  const dots = { GETTING_STARTED: 'bg-sky-500', STRONG: 'bg-emerald-500', STABLE: 'bg-blue-500', SLIPPING: 'bg-amber-500', STALLED: 'bg-rose-500' }
  const label = goal?.healthLabel || state.split('_').map(word => word[0] + word.slice(1).toLowerCase()).join(' ')
  return { label, reason: goal?.healthReason || 'No progress logged yet', dot: dots[state] || 'bg-blue-500' }
}

export default function GoalHero({ goal, className = '' }) {
  const visual = getCategoryVisual(goal?.category)
  const hero = visual.hero
  const progress = clampProgress(goal)
  const health = healthOf(goal)
  const isDark = Boolean(hero.dark)
  const customCover = goal?.appearance?.bannerType === 'CUSTOM' && goal?.appearance?.bannerUrl

  return <section className={`relative isolate min-h-[270px] overflow-hidden rounded-2xl sm:min-h-[300px] sm:rounded-[26px] ${isDark ? 'text-white' : 'text-[#102b3f]'} ${className}`} style={{ background: customCover ? '#17324b' : isDark ? `linear-gradient(135deg,${hero.deep},${hero.base})` : `linear-gradient(135deg,#f8fcff 0%,${hero.glow} 145%)` }}>
    {customCover ? <><img src={customCover} alt="" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/5"/></> : <><div className="absolute inset-y-0 right-0 w-[78%] opacity-95 sm:w-[56%]"><div className="absolute inset-0" style={{ background: `linear-gradient(135deg,transparent 4%,${hero.base}22 35%,${hero.base}72 100%)` }}/><AbstractGoalArtwork category={goal?.category} className="h-full w-full"/></div><div className="absolute inset-0 bg-gradient-to-r from-white/45 via-white/5 to-transparent sm:from-white/25"/></>}
    <div className="relative z-10 flex min-h-[270px] w-full flex-col p-5 sm:min-h-[300px] sm:w-[66%] sm:p-8">
      <div className="flex items-center gap-2.5"><CategoryIcon category={goal?.category} size="sm" className="ring-1 ring-white/40"/><span className={`text-[10px] font-extrabold uppercase tracking-[.13em] sm:text-[11px] ${customCover || isDark ? 'text-white/80' : 'text-[#426174]'}`}>{visual.label}</span></div>
      <h2 className="mb-0 mt-5 max-w-[420px] text-[25px] font-extrabold leading-[1.12] tracking-[-.03em] sm:mt-6 sm:text-[32px]">{goal?.title || 'Untitled goal'}</h2>
      <div className="mt-auto max-w-[380px] pt-7"><div className="mb-2.5 text-xs font-bold">{progress}% complete</div><div className={`h-2 overflow-hidden rounded-full ${customCover || isDark ? 'bg-white/25' : 'bg-white/80'}`}><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${progress}%`, background: customCover || isDark ? hero.glow : hero.base }}/></div><div className={`mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold ${customCover || isDark ? 'text-white/75' : 'text-[#526d7d]'}`}><span className={`h-2 w-2 rounded-full ${health.dot}`}/><span className={customCover || isDark ? 'text-white/95' : 'text-[#24485e]'}>{health.label}</span><span>·</span><span>{health.reason}</span></div></div>
    </div>
  </section>
}
