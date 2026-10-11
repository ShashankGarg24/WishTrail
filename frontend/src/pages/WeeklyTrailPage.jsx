import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { weeklyTrailAPI, trailEvent } from '../services/weeklyTrail'
import { TrailLandscape, TrailStats, WeekDots, weekLabel, weekStory } from '../components/WeeklyTrail'

export default function WeeklyTrailPage() {
  const { periodKey = 'current' } = useParams()
  const user = useApiStore(s => s.user)
  const [recap,setRecap] = useState(null)
  const [history,setHistory] = useState([])
  const [cursor,setCursor] = useState(null)
  const [error,setError] = useState('')
  const [historyError,setHistoryError] = useState(false)
  const [loadingMore,setLoadingMore] = useState(false)
  const [retry,setRetry] = useState(0)
  useEffect(() => {
    let cancelled=false; setRecap(null); setError('')
    weeklyTrailAPI.week(periodKey).then(data => {
      if (cancelled) return
      setRecap(data); trailEvent('weekly_trail_opened',data)
      if (!data.weekInProgress) weeklyTrailAPI.seen(data.periodKey).catch(()=>{})
    }).catch(err => { if (!cancelled) setError(err.response?.status===404?(err.response?.data?.message || 'No recap is available for this week.'):'Your Weekly Trail couldn’t load. Please try again.') })
    return () => { cancelled=true }
  },[periodKey,retry])
  useEffect(() => {
    let cancelled=false
    weeklyTrailAPI.history().then(data => { if (!cancelled) {setHistory(data.items);setCursor(data.nextCursor);setHistoryError(false)} }).catch(()=>{if(!cancelled)setHistoryError(true)})
    trailEvent('weekly_trail_history_viewed')
    return () => {cancelled=true}
  },[retry])
  const loadMore = async () => {
    setLoadingMore(true)
    try { const data=await weeklyTrailAPI.history(cursor);setHistory(old=>[...old,...data.items]);setCursor(data.nextCursor);setHistoryError(false) } catch {setHistoryError(true)} finally {setLoadingMore(false)}
  }
  const index=history.findIndex(item=>item.periodKey===recap?.periodKey)
  const older=recap?.weekInProgress?history[0]:index>=0?history[index+1]:null
  const newer=index>0?history[index-1]:null
  const feelings=recap?.emotionCounts?Object.entries(recap.emotionCounts):[]
  const samples=feelings.reduce((sum,[,count])=>sum+count,0)
  return <main className="trail-page"><header className="trail-page-heading"><div><h1>Weekly Trail</h1><p>Your journey, week by week.</p></div><Link to={`/profile/@${user?.username}?tab=trail`}><ArrowLeft size={14} className="inline"/> My Trail</Link></header><div className="trail-layout"><aside className="trail-history" aria-label="Weekly recap history"><Link to="/weekly-trail" aria-current={recap?.weekInProgress?'page':undefined}><strong>This week</strong><small>Week in progress</small></Link>{history.map(item=><Link key={item.periodKey} to={`/weekly-trail/${item.periodKey}`} aria-current={item.periodKey===recap?.periodKey?'page':undefined} onClick={()=>trailEvent('weekly_trail_history_item_opened',item)}><strong>{weekLabel(item)}</strong><small>{item.habitConsistency===null?'Consistency unavailable':`${item.habitConsistency}% consistency`}</small><small>{item.goalsProgressed} goals · {item.habitCompletions} completions · {item.activeDays} days</small></Link>)}{historyError&&<div role="alert" className="trail-status">History couldn’t load. <button onClick={()=>setRetry(v=>v+1)}>Retry</button></div>}{cursor&&<button className="trail-load" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading…':'Load older weeks'}</button>}</aside><section aria-label="Weekly recap">{error?<div role="alert" className="trail-status">{error} <button onClick={()=>setRetry(v=>v+1)}>Try again</button></div>:!recap?<div role="status" className="trail-status">Loading your week…</div>:<><div className="mb-3 flex justify-between text-sm text-blue-600">{older?<Link to={`/weekly-trail/${older.periodKey}`}><ChevronLeft size={16} className="inline"/> Older week</Link>:<span/>}{!recap.weekInProgress&&<Link to={newer?`/weekly-trail/${newer.periodKey}`:'/weekly-trail'}>{newer?'Newer week':'This week'} <ChevronRight size={16} className="inline"/></Link>}</div><header className="trail-hero"><TrailLandscape/><div><span className="trail-eyebrow">{recap.weekInProgress?'WEEK IN PROGRESS':'WEEKLY TRAIL'}</span><h2>{weekLabel(recap)}</h2><strong className="trail-score">{recap.habitConsistency===null?'N/A':`${recap.habitConsistency}%`}</strong><p>Habit consistency{recap.weekInProgress?' so far':''}</p><h3>{weekStory(recap)}</h3><p>{recap.activeDays?`You showed up on ${recap.activeDays} ${recap.activeDays===1?'day':'days'} this week.`:'Your trail is still here whenever you’re ready.'}</p></div></header><TrailStats recap={recap}/><div className="trail-detail-grid"><div>{(recap.biggestWin||recap.strongestRhythm||recap.attention?.length>0)&&<section className="trail-panel"><h3>Key highlights</h3>{recap.biggestWin&&<Highlight icon="🏆" label="Biggest Win" title={recap.biggestWin.titleSnapshot} detail="Goal completed"/>}{recap.strongestRhythm&&<Highlight icon="⚡" label="Strongest Rhythm" title={recap.strongestRhythm.titleSnapshot} detail={`${recap.strongestRhythm.completed} / ${recap.strongestRhythm.eligible} scheduled completions · ${recap.strongestRhythm.adherencePercent}%`}/>}{recap.attention?.map(item=><Highlight key={`${item.type}:${item.entityId}`} icon="🌱" label="Needs Attention" title={item.titleSnapshot} detail={item.type==='goal'?`No progress for ${item.days} days`:`${item.adherencePercent}% schedule adherence`}/>)}</section>}{feelings.length>0&&<section className="trail-panel"><h3>How you felt</h3>{feelings.map(([emotion,count])=><div className="trail-feeling" key={emotion}><span>{emotion}</span><progress value={count} max={samples} aria-label={emotion}/><b>{Math.round(100*count/samples)}%</b></div>)}<p className="trail-note">From {samples} check-ins. Feelings don’t affect your progress.</p></section>}</div><div><section className="trail-panel"><h3>Your week</h3><WeekDots recap={recap}/></section><section className="trail-panel"><h3>{recap.activeDays?'Keep going':'Take a small step'}</h3><p className="trail-note">{recap.weekInProgress?'There’s still time to make this week your own.':'Every step is part of your story.'}</p><Link className="trail-primary mt-4" to="/home?tab=goals">Choose your next step</Link></section>{recap.dataQuality?.length>0&&<p className="trail-note">Some habit schedules are unavailable, so consistency cannot be calculated. Recorded completions are still included.</p>}</div></div></>}</section></div></main>
}
function Highlight({icon,label,title,detail}) {return <div className="trail-highlight"><span aria-hidden>{icon}</span><div><small>{label}</small><strong>{title}</strong><small>{detail}</small></div></div>}
