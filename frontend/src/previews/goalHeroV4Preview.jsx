import React from 'react'
import { createRoot } from 'react-dom/client'
import CategoryIcon from '../components/CategoryIcon'
import { getCategoryLabel } from '../utils/categoryIcons'
import '../index.css'

const HERO_STYLES = {
  HEALTH_FITNESS: { composition: 'flow', base: '#0f8fa1', deep: '#176bb0', mid: '#31b9b4', light: '#91e1b5', glow: '#d9fff0', ink: '#083b54' },
  CAREER_WORK: { composition: 'ascend', base: '#174d91', deep: '#102f68', mid: '#237fc7', light: '#5bd5e9', glow: '#dffaff', ink: '#102e59' },
  PERSONAL_GROWTH: { composition: 'ascend', base: '#3d9874', deep: '#187b7d', mid: '#66bd85', light: '#d5dd72', glow: '#fff4a9', ink: '#174f49' },
  TRAVEL_EXPERIENCES: { composition: 'horizon', base: '#329fc1', deep: '#247eb2', mid: '#46c2bf', light: '#f2a878', glow: '#fff2d7', ink: '#15516a' },
  SIDE_PROJECTS: { composition: 'orbit', base: '#3c4193', deep: '#172557', mid: '#526cf0', light: '#9669d8', glow: '#c5f8ff', ink: '#f7f9ff' },
  FINANCE: { composition: 'layers', base: '#146f6a', deep: '#103c58', mid: '#278a71', light: '#72ba8d', glow: '#c9f6df', ink: '#103f43' }
}

const EXAMPLES = [
  { category: 'HEALTH_FITNESS', title: 'Run My First 10K', progress: 68, health: 'Strong', detail: 'Updated yesterday' },
  { category: 'CAREER_WORK', title: 'Get Promoted to SDE-3', progress: 42, health: 'Stable', detail: 'Updated 3 days ago' },
  { category: 'PERSONAL_GROWTH', title: 'Become More Confident', progress: 56, health: 'Strong', detail: 'Updated today' },
  { category: 'TRAVEL_EXPERIENCES', title: 'Visit Japan', progress: 31, health: 'Stable', detail: 'Updated 4 days ago' },
  { category: 'SIDE_PROJECTS', title: 'Launch My First Product', progress: 74, health: 'Strong', detail: 'Updated yesterday', dark: true },
  { category: 'FINANCE', title: 'Build My Emergency Fund', progress: 60, health: 'Strong', detail: 'Updated 2 days ago' }
]

function Artwork({ visual }) {
  const shared = { vectorEffect: 'non-scaling-stroke' }
  if (visual.composition === 'flow') return <svg viewBox="0 0 430 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id={`g-${visual.base}`}><stop stopColor={visual.glow} stopOpacity=".85"/><stop offset="1" stopColor={visual.glow} stopOpacity="0"/></radialGradient></defs><ellipse cx="305" cy="65" rx="128" ry="96" fill={`url(#g-${visual.base})`}/><path d="M76 254C113 177 173 196 203 125C231 59 306 72 358 24L456 22V280H65Z" fill={visual.deep} opacity=".2"/><path d="M140 274C172 193 247 217 260 137C274 60 359 79 424 23" fill="none" stroke={visual.light} strokeWidth="42" strokeLinecap="round" opacity=".52" {...shared}/><path d="M116 256C165 215 209 234 240 188C271 142 303 156 354 113" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".38" {...shared}/><circle cx="346" cy="75" r="18" fill="#fff" opacity=".15"/><circle cx="386" cy="110" r="7" fill={visual.glow} opacity=".72"/></svg>
  if (visual.composition === 'ascend') return <svg viewBox="0 0 430 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id={`a-${visual.base}`} x1="0" y1="1" x2="1" y2="0"><stop stopColor={visual.deep}/><stop offset="1" stopColor={visual.light}/></linearGradient></defs><path d="M88 272L161 198L206 222L272 130L316 160L394 45L460 72V280Z" fill={`url(#a-${visual.base})`} opacity=".5"/><path d="M163 277L221 219L262 231L319 156L357 170L424 91V280Z" fill="#fff" opacity=".12"/><path d="M138 242C205 233 223 182 275 168C330 153 342 97 411 68" fill="none" stroke={visual.glow} strokeWidth="11" strokeLinecap="round" opacity=".62" {...shared}/><path d="M138 242C205 233 223 182 275 168C330 153 342 97 411 68" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".52" {...shared}/><rect x="328" y="66" width="62" height="62" rx="18" fill="#fff" opacity=".11" transform="rotate(18 359 97)"/><circle cx="404" cy="57" r="9" fill={visual.glow} opacity=".9"/></svg>
  if (visual.composition === 'horizon') return <svg viewBox="0 0 430 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id={`h-${visual.base}`} cx="68%" cy="45%"><stop stopColor={visual.glow} stopOpacity=".9"/><stop offset=".42" stopColor={visual.light} stopOpacity=".35"/><stop offset="1" stopColor={visual.light} stopOpacity="0"/></radialGradient></defs><rect width="430" height="260" fill={`url(#h-${visual.base})`}/><path d="M54 182C121 133 181 177 238 137C296 96 360 118 454 73V280H52Z" fill={visual.deep} opacity=".22"/><path d="M65 232C136 191 198 223 260 180C323 136 365 163 459 119V280H60Z" fill={visual.mid} opacity=".34"/><path d="M118 213C185 198 219 179 271 165C327 149 361 151 417 129" fill="none" stroke={visual.glow} strokeWidth="8" strokeLinecap="round" opacity=".55" {...shared}/><ellipse cx="338" cy="93" rx="69" ry="22" fill="#fff" opacity=".12" transform="rotate(-13 338 93)"/></svg>
  if (visual.composition === 'orbit') return <svg viewBox="0 0 430 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id={`o-${visual.base}`}><stop stopColor={visual.glow} stopOpacity=".65"/><stop offset="1" stopColor={visual.glow} stopOpacity="0"/></radialGradient></defs><circle cx="318" cy="126" r="132" fill={`url(#o-${visual.base})`}/><ellipse cx="316" cy="128" rx="111" ry="65" fill="none" stroke={visual.light} strokeWidth="24" opacity=".3" transform="rotate(-21 316 128)"/><ellipse cx="316" cy="128" rx="83" ry="42" fill="none" stroke="#fff" strokeWidth="3" opacity=".44" transform="rotate(-21 316 128)"/><circle cx="260" cy="68" r="45" fill={visual.mid} opacity=".38"/><circle cx="366" cy="155" r="55" fill={visual.light} opacity=".24"/><rect x="307" y="81" width="69" height="69" rx="23" fill="#fff" opacity=".11" transform="rotate(29 341 115)"/><circle cx="403" cy="94" r="10" fill={visual.glow} opacity=".9"/></svg>
  return <svg viewBox="0 0 430 260" className="h-full w-full" preserveAspectRatio="xMidYMid slice"><path d="M55 54C147 15 230 46 299 24C351 8 400 14 456 0V101C386 120 329 96 273 121C195 157 117 124 55 163Z" fill={visual.light} opacity=".23"/><path d="M74 117C159 82 215 126 288 96C347 71 392 82 460 54V176C382 202 326 171 267 196C197 225 131 197 74 226Z" fill={visual.mid} opacity=".32"/><path d="M126 224C187 195 225 210 278 182C326 157 363 166 421 141" fill="none" stroke={visual.glow} strokeWidth="9" strokeLinecap="round" opacity=".5" {...shared}/><circle cx="348" cy="86" r="70" fill={visual.glow} opacity=".08"/><rect x="310" y="68" width="82" height="54" rx="20" fill="#fff" opacity=".1" transform="rotate(-8 351 95)"/></svg>
}

function GoalHeroConcept({ goal }) {
  const visual = HERO_STYLES[goal.category]
  const dark = goal.dark
  const text = dark ? 'text-white' : 'text-[#102b3f]'
  const muted = dark ? 'text-white/70' : 'text-[#426174]'
  return <section className={`relative isolate min-h-[300px] overflow-hidden rounded-[26px] ${text}`} style={{ background: dark ? `linear-gradient(135deg,${visual.deep},${visual.base})` : `linear-gradient(135deg,#f8fcff 0%,${visual.glow} 145%)` }}>
    <div className="absolute inset-y-0 right-0 w-[59%] opacity-95 sm:w-[55%]"><div className="absolute inset-0" style={{ background: `linear-gradient(135deg,transparent 4%,${visual.base}22 35%,${visual.base}72 100%)` }}/><Artwork visual={visual}/></div>
    <div className="absolute inset-0 opacity-[.045]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}/>
    <div className="relative z-10 flex min-h-[300px] w-[65%] flex-col p-7 sm:p-8">
      <div className="flex items-center gap-2.5"><CategoryIcon category={goal.category} size="sm" className="ring-1 ring-white/40"/><span className={`text-[11px] font-extrabold uppercase tracking-[.13em] ${muted}`}>{getCategoryLabel(goal.category)}</span></div>
      <h2 className="mb-0 mt-6 max-w-[390px] text-[26px] font-extrabold leading-[1.12] tracking-[-.03em] sm:text-[32px]">{goal.title}</h2>
      <div className="mt-auto max-w-[360px] pt-8"><div className="mb-2.5 flex items-center justify-between text-xs font-bold"><span>{goal.progress}% complete</span></div><div className={`h-2 overflow-hidden rounded-full ${dark ? 'bg-white/20' : 'bg-white/75'}`}><div className="h-full rounded-full" style={{ width: `${goal.progress}%`, background: dark ? visual.glow : visual.base }}/></div><div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${muted}`}><span className={`h-2 w-2 rounded-full ${goal.health === 'Strong' ? 'bg-emerald-500' : 'bg-blue-500'}`}/><span className={dark ? 'text-white/90' : 'text-[#24485e]'}>{goal.health}</span><span>·</span><span>{goal.detail}</span></div></div>
    </div>
  </section>
}

function Preview() {
  return <main className="min-h-screen bg-[#f3f6fa] px-5 py-11 sm:px-10 lg:px-14"><header className="mx-auto mb-10 max-w-[1500px]"><p className="m-0 text-xs font-extrabold uppercase tracking-[.2em] text-[#4c99e6]">WishTrail product concept</p><h1 className="mb-2 mt-2 text-3xl font-extrabold tracking-tight text-[#122b3d] sm:text-4xl">Goal Hero Concept V4</h1><p className="m-0 text-sm text-slate-500">Six realistic content examples · review only · not integrated into production</p></header><div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 xl:grid-cols-2">{EXAMPLES.map(goal => <GoalHeroConcept key={goal.title} goal={goal}/>)}</div></main>
}

createRoot(document.getElementById('root')).render(<Preview />)
