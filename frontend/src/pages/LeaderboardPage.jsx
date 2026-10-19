import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, Crown, Search, Sparkles, Target, TrendingUp, Trophy, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'
import { leaderboardAPI } from '../services/api'
import './LeaderboardPage.css'

const labels = { goals: 'Goals Completed', activeDays: 'Active Days' }
const displayName = person => person?.name || person?.displayName || person?.username || 'Achiever'
const score = (person, type) => Number(person?.[type === 'goals' ? 'completedGoals' : 'activeDays'] || 0)

function Avatar({ person }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [person?.avatar])
  return <span className={`lb-avatar lb-color-${(person?.rank || 0) % 5}`}>
    {person?.avatar && !failed ? <img src={person.avatar} alt="" onError={() => setFailed(true)} /> : displayName(person).charAt(0).toUpperCase()}
  </span>
}

function Mountain() {
  return <svg className="lb-mountain" viewBox="0 0 360 150" fill="none" aria-hidden="true">
    <defs><linearGradient id="lb-peak" x1="120" y1="35" x2="260" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#a9dcff"/><stop offset="1" stopColor="#258fff"/></linearGradient></defs>
    <g fill="#deefff"><path d="M17 70c0-9 12-15 20-7 3-20 28-19 31 0 13-3 19 6 18 12H17z"/><path d="M278 46c0-9 10-14 17-8 6-18 27-11 28 1 14-2 20 7 18 12h-63z"/><path d="M107 36l14-10 15 10z"/></g>
    <path d="M43 144l67-63 39 30 48-64 56 61 28-21 65 57H43z" fill="#b9e1ff"/>
    <path d="M91 144l106-111 123 111H91z" fill="url(#lb-peak)"/>
    <path d="M197 33l-28 30 23-5 17 8z" fill="#e7f6ff"/>
    <path d="M197 34v-29" stroke="#334b70" strokeWidth="2"/><path d="M199 7c12-5 16 6 28 1l-7 10 7 7c-12 5-17-6-28-1V7z" fill="#ffba14"/>
    <path d="M197 59c-36 15 38 18-2 33-59 17-38 32-9 52h-35c-24-26-2-42 35-53 39-12-31-14 11-32z" fill="#eff9ff"/>
  </svg>
}

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const user = useApiStore(state => state.user)
  const [type, setType] = useState('goals')
  const [timeframe, setTimeframe] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    leaderboardAPI.getGlobalLeaderboard({ type, timeframe, search: query, page, limit: 20 })
      .then(response => { if (!cancelled) setData(response.data.data) })
      .catch(() => { if (!cancelled) setError('Could not load the leaderboard. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [type, timeframe, query, page, retry])

  const visit = person => { if (person?.username) navigate(`/profile/@${person.username}`) }
  const top = data?.topThree || []
  const podium = [top[1], top[0], top[2]].filter(Boolean)
  const rows = (data?.leaderboard || []).filter(person => query || person.rank > 3)
  const me = data?.yourRank
  const stats = data?.stats
  const personalProfile = me || user
  const personalScore = score(me, type)
  const unrankedReason = (() => {
    if (!me) return 'Your account is not eligible for this leaderboard.'
    if (type === 'goals' && timeframe === 'all') {
      const remaining = Math.max(0, Number(data?.eligibilityMinimum || 5) - personalScore)
      return `Complete ${remaining} more goal${remaining === 1 ? '' : 's'} to qualify.`
    }
    if (type === 'goals') return `No goals completed in ${timeframe === 'week' ? 'the last 7 days' : timeframe === 'month' ? 'the last 30 days' : 'this year'}.`
    return `No active days recorded in ${timeframe === 'all' ? 'your activity history' : timeframe === 'week' ? 'the last 7 days' : timeframe === 'month' ? 'the last 30 days' : 'this year'}.`
  })()
  const selectType = value => { setType(value); setPage(1); setData(null) }
  const periodControl = <label className="lb-period"><CalendarDays /><select aria-label="Leaderboard time period" value={timeframe} onChange={event => { setTimeframe(event.target.value); setPage(1); setData(null) }}><option value="all">All Time</option><option value="week">Last 7 Days</option><option value="month">Last 30 Days</option><option value="year">This Year</option></select><ChevronDown /></label>
  const rankCard = <section className="lb-your-rank">
    <div className="lb-card-heading"><h2><BarChart3 />Your Rank</h2><button onClick={() => visit(personalProfile)}>View Profile <ArrowRight /></button></div>
    <button className={`lb-rank-person ${me?.rank ? '' : 'is-unranked'}`} onClick={() => visit(personalProfile)}>
      <Avatar person={personalProfile} />
      <div><strong className="lb-rank-number">{me?.rank ? `#${me.rank}` : 'Unranked'}</strong><b>{displayName(personalProfile)}</b><small>{me?.rank ? `${personalScore.toLocaleString()} ${labels[type].toLowerCase()}` : unrankedReason}</small></div>
    </button>
  </section>
  return <div className="lb-page">
    <div className="lb-shell">
      <header className="lb-hero"><div><h1>Global <span>Leaderboard</span></h1><p>Celebrate the journey of achievers worldwide.</p></div><Mountain /><blockquote>“Small steps create<br />big achievers.”<span>—</span><Sparkles /></blockquote></header>
      <div className="lb-controls">
        <div className="lb-tabs" title="Active days count distinct days with a completed goal or a habit daily target reached." role="group" aria-label="Rank by">
          {Object.entries(labels).map(([key, label]) => <button key={key} aria-pressed={type === key} className={type === key ? 'active' : ''} onClick={() => selectType(key)}>{key === 'goals' ? <Trophy /> : <CalendarDays />}{label}</button>)}
        </div>
        <div className="lb-desktop-period">{periodControl}</div>
      </div>
      {error ? <div className="lb-message" role="alert">{error}<button onClick={() => setRetry(value => value + 1)}>Try again</button></div> : <div aria-busy={loading}>
        {loading ? <div className="lb-loading" role="status"><span />Loading rankings…</div> : <>
          {data?.isDemo && <p className="lb-preview-note">Sample rankings — complete goals to start the real leaderboard.</p>}
          {podium.length > 0 && <section className="lb-podium" aria-label="Top three achievers">
            {podium.map(person => <button key={person.rank} className={`lb-winner lb-place-${person.rank}`} onClick={() => visit(person)} disabled={!person.username}>
              <span className="lb-medal">{person.rank}</span>
              <div className="lb-confetti" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
              {person.rank === 1 && <Crown className="lb-crown" fill="currentColor" />}
              <Avatar person={person} /><h2>{displayName(person)}</h2><p className="lb-badge">{person.rank === 1 ? 'Champion' : person.rank === 2 ? 'Silver Achiever' : 'Bronze Explorer'}</p><strong className="lb-score">{score(person, type).toLocaleString()}</strong><span className="lb-score-label">{labels[type]}</span>
            </button>)}
          </section>}
        </>}
        <div className="lb-content">
          <section className="lb-table-card" aria-label="Global rankings">
            <div className="lb-table-toolbar"><label className="lb-search"><Search /><input aria-label="Search users" placeholder="Search users…" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="lb-mobile-period">{periodControl}</div></div>
            {!loading && <><table><thead><tr><th scope="col">#</th><th scope="col">User</th><th scope="col">{type === 'goals' ? 'Goals' : 'Active Days'}</th></tr></thead><tbody>
              {rows.map(person => <tr key={person.rank} className={person.username === user?.username ? 'is-you' : ''}><td>{person.rank}</td><td><button onClick={() => visit(person)} disabled={!person.username}><Avatar person={person} /><span>{displayName(person)}</span>{person.username === user?.username && <small>You</small>}</button></td><td>{score(person, type).toLocaleString()}</td></tr>)}
            </tbody></table>
            {!rows.length && <p className="lb-empty">{query ? 'No achievers match your search.' : top.length ? 'More achievers will appear here as they climb the ranks.' : 'A new journey begins. Be the first to join the leaderboard!'}</p>}
            {data?.pagination?.pages > 1 && <nav className="lb-pagination" aria-label="Leaderboard pages"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {data.pagination.pages}</span><button disabled={page >= data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
            <div className="lb-mobile-rank">{rankCard}</div></>}
          </section>
          {!loading && <aside className="lb-rail">{rankCard}<section className="lb-stats"><h2><TrendingUp />Leaderboard Stats</h2><p><Users /><strong>{Number(stats?.participants || 0).toLocaleString()}</strong><span>Total participants</span></p><p><Target /><strong>{Number(stats?.completedGoals || 0).toLocaleString()}</strong><span>Goals completed</span></p><p><TrendingUp /><strong>{Number(stats?.averageGoals || 0).toLocaleString()}</strong><span>Average goals per user</span></p></section></aside>}
        </div>
      </div>}
    </div>
  </div>
}
