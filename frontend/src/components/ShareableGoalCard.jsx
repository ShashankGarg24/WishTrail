import useApiStore from '../store/apiStore'
import { forwardRef, useId } from 'react'
import CategoryIcon from './CategoryIcon'

const labels = { GOAL: 'A goal worth pursuing', PROGRESS: 'Keep going', MILESTONE: 'A meaningful step', COMPLETION: 'Goal completed' }
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

// Explicit lines/ellipsis render identically in browsers and html2canvas (CSS
// line-clamp does not). Wide glyphs shrink within a line instead of clipping.
function titleLines(title, square) {
  const size = square ? 30 : 27
  let remaining = String(title || '')
  const lines = []
  for (let index = 0; index < 3 && remaining; index++) {
    let end = Math.min(size, remaining.length)
    if (end < remaining.length && index < 2) {
      const space = remaining.lastIndexOf(' ', end)
      if (space > size / 2) end = space
    }
    lines.push(remaining.slice(0, end).trim() + (index === 2 && remaining.length > end ? '…' : ''))
    remaining = remaining.slice(end).trim()
  }
  return lines
}

const fittedFont = (line, base) => Math.min(base, 300 / [...line].reduce((sum, char) => sum + (/[MW@]/.test(char) ? 1 : /[A-Z]/.test(char) ? .78 : /\s/.test(char) ? .35 : /[^\u0000-\u00ff]/.test(char) ? 1 : .62), 0))

function Landscape({ dark }) {
  const id = useId().replace(/:/g, '')
  return <svg viewBox="0 0 360 480" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={dark ? "#0b1220" : "#d6eaff"}/><stop offset=".48" stopColor={dark ? "#172334" : "#fbe5ee"}/><stop offset="1" stopColor={dark ? "#102a43" : "#fff1d4"}/></linearGradient></defs>
    <path fill={`url(#${id})`} d="M0 0h360v480H0z"/><circle cx="65" cy="210" r="24" fill="#fff9ea"/>
    <path fill="#d1c4ed" d="M0 270L55 245 95 263 153 222 200 250 266 226 320 252 360 236V480H0z"/>
    <path fill="#94bdf0" d="M0 307L56 283 115 297 198 252 250 277 305 259 360 292V480H0z"/>
    <path fill="#5296db" d="M0 347L77 303 135 328 212 280 278 314 360 288V480H0z"/>
    <path fill="#2673b6" d="M0 390L78 344 133 356 221 314 290 339 360 306V480H0z"/>
    <path fill="#18548d" d="M0 430L69 398 160 417 232 365 302 379 360 349V480H0z"/>
  </svg>
}

// One fixed canvas for Studio, Feed, and export. Only the allowlisted snapshot
// enters this component; editor controls and raw goal objects never do.
const ShareableGoalCard = forwardRef(function ShareableGoalCard({ snapshot }, ref) {
  const dark = useApiStore(state => state.isDarkMode)
  if (!snapshot) return null
  const square = snapshot.format === 'SQUARE_1_1'
  const journey = snapshot.template === 'JOURNEY'
  const photo = snapshot.template === 'PHOTO' && snapshot.photo
  const stats = [
    snapshot.progressUpdateCount !== undefined && [snapshot.progressUpdateCount, 'Updates'],
    snapshot.activeDays !== undefined && [snapshot.activeDays, 'Active days'],
    snapshot.journeyDuration !== undefined && [snapshot.journeyDuration, 'Days']
  ].filter(Boolean)
  const events = snapshot.selectedJourneyEvents || []
  const points = events.map((event, index) => ({ ...event, x: 46 + index * 268 / Math.max(1, events.length - 1), y: square ? 26 + (index % 2) * 9 : 210 - index * 155 / Math.max(1, events.length - 1) }))
  return <div ref={ref} data-testid="goal-share-card" data-dd-privacy="mask" style={{ width: 360, height: square ? 360 : 640, position: 'relative', overflow: 'hidden', borderRadius: 20, background: dark ? '#121c2b' : '#edf6ff', color: dark ? '#f4f7fb' : '#102544', fontFamily: 'Manrope, Arial, sans-serif', boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
    <Landscape dark={dark} />
    {photo && <><img src={photo} crossOrigin="anonymous" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/><div style={{ position: 'absolute', inset: 0, background: dark ? 'linear-gradient(180deg,rgba(11,18,32,.94),rgba(11,18,32,.25) 45%,rgba(11,18,32,.3))' : 'linear-gradient(180deg,rgba(255,255,255,.94),rgba(255,255,255,.55) 45%,rgba(10,32,57,.3))' }}/></>}
    <div data-share-zone="header" style={{ position: 'relative', flexShrink: 0, textAlign: 'center', padding: square ? '12px 22px 0' : '28px 26px 0' }}>
      <p style={{ fontSize: 12, lineHeight: '16px', margin: '0 0 6px', letterSpacing: .3 }}>{labels[snapshot.shareType]}</p>
      <h2 style={{ fontWeight: 800, margin: 0 }}>{titleLines(snapshot.title, square).map((line, index) => <span key={index} style={{ display: 'block', whiteSpace: 'nowrap', lineHeight: square ? '22px' : '30px', fontSize: fittedFont(line, square ? 18 : 25) }}>{line}</span>)}</h2>
      {!journey && snapshot.progress !== undefined && <div style={{ fontSize: square ? 23 : 34, fontWeight: 800, marginTop: 10 }}>{snapshot.progress}%</div>}
      {snapshot.template === 'PROGRESS' && snapshot.progress !== undefined && <div style={{ height: 8, borderRadius: 20, background: '#dbe8f5', margin: '8px 12px' }}><div style={{ height: '100%', width: `${snapshot.progress}%`, borderRadius: 20, background: '#4c99e6' }}/></div>}
      {journey && <p style={{ margin: '7px 0 0', fontSize: 11, lineHeight: '16px' }}>{[snapshot.journeyDuration !== undefined && `${snapshot.journeyDuration} day journey`, snapshot.progress !== undefined && `${snapshot.progress}% ${snapshot.shareType === 'COMPLETION' ? 'complete' : 'progress'}`].filter(Boolean).join(' · ')}</p>}
      {!journey && snapshot.completionDate && <p style={{ margin: '7px 0 0', fontSize: 11 }}>{dateLabel(snapshot.completionDate)}</p>}
    </div>
    {journey && <div data-share-zone="journey" style={{ position: 'relative', flex: '1 1 0', minHeight: 0, marginTop: square ? 4 : 12 }}>
      <svg viewBox={`0 0 360 ${square ? 105 : 280}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-label="Selected journey events">
        <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="white" strokeWidth="2" strokeDasharray="5 4"/>
        {points.map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r={point.type === 'completion' ? 11 : 7} fill={point.type === 'completion' ? '#00ad7b' : '#fff'} stroke="white" strokeWidth="2"/>
          <text x={point.x} y={point.y + 4} textAnchor="middle" fill={point.type === 'completion' ? 'white' : '#2673b6'} fontSize="11">✓</text>
          <text x={point.x} y={point.y + 25} textAnchor="middle" fill={square && !dark ? '#102544' : 'white'} fontWeight="700" fontSize={square ? 8 : 10}>{point.label}</text>
          {point.date && <text x={point.x} y={point.y + 39} textAnchor="middle" fill={square && !dark ? '#244c72' : 'white'} fontSize={square ? 8 : 9}>{dateLabel(point.date)}</text>}
        </g>)}
      </svg>
    </div>}
    {!journey && <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{!photo && !square && snapshot.shareType === 'COMPLETION' && <div style={{ width: 70, height: 70, borderRadius: 35, background: '#4c99e6', border: '5px solid #fff', color: 'white', fontSize: 40, textAlign: 'center', lineHeight: '60px' }}>✓</div>}</div>}
    <div data-share-zone="footer" style={{ position: 'relative', flexShrink: 0, padding: square ? '7px 16px 10px' : '16px 22px 18px', background: dark ? '#121c2b' : 'rgba(237,246,255,.96)', textAlign: 'center' }}>
      {(snapshot.note || snapshot.feeling) && <p style={{ fontSize: square ? 10 : 12, lineHeight: 1.4, margin: '2px 0 7px', overflowWrap: 'anywhere' }}>{snapshot.note}{snapshot.note && snapshot.feeling ? ' · ' : ''}{snapshot.feeling ? `Feeling ${snapshot.feeling}` : ''}</p>}
      {!!stats.length && <div style={{ display: 'flex', background: dark ? '#172334' : 'rgba(255,255,255,.92)', borderRadius: 12, padding: square ? '7px 5px' : '13px 5px', justifyContent: 'space-around' }}>{stats.map(([value, label]) => <div key={label}><div style={{ fontSize: square ? 16 : 20, fontWeight: 800 }}>{value}</div><div style={{ fontSize: 9, marginTop: 2, color: dark ? '#a7b3c5' : '#526887' }}>{label}</div></div>)}</div>}
      <div aria-label="WishTrail" style={{ marginTop: square ? 7 : 17, fontWeight: 800, fontSize: 14, height: 24, lineHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/logo-small.png" alt="" width="28" height="28" style={{ width: 28, height: 28, objectFit: 'contain' }}/><span style={{ marginLeft: -5, lineHeight: '24px' }}>ishTrail</span></div>
      <div style={{ position: 'absolute', bottom: square ? 8 : 16, left: 12 }}><CategoryIcon category={snapshot.category} size="sm"/></div>
    </div>
  </div>
})
export default ShareableGoalCard
