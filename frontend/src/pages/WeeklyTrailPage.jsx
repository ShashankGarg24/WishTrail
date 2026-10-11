import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { weeklyTrailAPI, trailEvent } from '../services/weeklyTrail'
import { TrailLandscape, TrailStats, WeekDots, weekLabel, weekStory } from '../components/WeeklyTrail'

export default function WeeklyTrailPage() {
  const [result,setResult]=useState(null)
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)
  useEffect(()=>{
    let cancelled=false;setResult(null);setError('')
    weeklyTrailAPI.current({includeSeen:true}).then(data=>{if(cancelled)return;if(!data.available){setError('This Weekly Trail is no longer available.');return}setResult(data);trailEvent('weekly_trail_detail_viewed',data);weeklyTrailAPI.seen(data.periodKey).catch(()=>{})}).catch(()=>{if(!cancelled)setError('Your Weekly Trail couldn’t load. Please try again.')})
    return()=>{cancelled=true}
  },[retry])
  const recap=result?.recap
  const feelings=recap?.emotionCounts?Object.entries(recap.emotionCounts):[]
  const samples=feelings.reduce((sum,[,count])=>sum+count,0)
  return <main className="trail-page"><header className="trail-page-heading"><div><h1>Weekly Trail</h1><p>Your previous week at a glance.</p></div><Link to="/home"><ArrowLeft size={14} className="inline"/> Home</Link></header><section aria-label="Weekly recap">{error?<div role="alert" className="trail-status">{error} <button onClick={()=>setRetry(v=>v+1)}>Try again</button></div>:!recap?<div role="status" className="trail-status">Loading your week…</div>:<><header className="trail-hero"><TrailLandscape/><div><span className="trail-eyebrow">WEEKLY TRAIL</span><h2>{weekLabel(recap)}</h2><strong className="trail-score">{recap.habitConsistency===null?'N/A':`${recap.habitConsistency}%`}</strong><p>Habit consistency</p><h3>{weekStory(recap)}</h3><p>You showed up on {recap.activeDays} {recap.activeDays===1?'day':'days'} this week.</p></div></header><TrailStats recap={recap}/><div className="trail-detail-grid"><div>{(recap.biggestWin||recap.strongestRhythm||recap.attention?.length>0)&&<section className="trail-panel"><h3>Key highlights</h3>{recap.biggestWin&&<Highlight icon="🏆" label="Biggest Win" title={recap.biggestWin.titleSnapshot} detail="Goal completed"/>}{recap.strongestRhythm&&<Highlight icon="⚡" label="Strongest Rhythm" title={recap.strongestRhythm.titleSnapshot} detail={`${recap.strongestRhythm.completed} / ${recap.strongestRhythm.eligible} scheduled completions · ${recap.strongestRhythm.adherencePercent}%`}/>} {recap.attention?.map(item=><Highlight key={`${item.type}:${item.entityId}`} icon="🌱" label="Needs Attention" title={item.titleSnapshot} detail={item.type==='goal'?`No progress for ${item.days} days`:`${item.adherencePercent}% schedule adherence`}/>)}</section>}{feelings.length>0&&<section className="trail-panel"><h3>How you felt</h3>{feelings.map(([emotion,count])=><div className="trail-feeling" key={emotion}><span>{emotion}</span><progress value={count} max={samples} aria-label={emotion}/><b>{Math.round(100*count/samples)}%</b></div>)}<p className="trail-note">From {samples} explicit check-ins. Feelings don’t affect progress.</p></section>}</div><div><section className="trail-panel"><h3>Your week</h3><WeekDots recap={recap}/></section><section className="trail-panel"><h3>Keep going</h3><p className="trail-note">Every step is part of your story.</p><Link className="trail-primary mt-4" to="/home?tab=goals" onClick={()=>trailEvent('weekly_trail_action_clicked',result)}>Choose your next step</Link></section>{recap.dataQuality?.length>0&&<p className="trail-note">Some habit schedules are unavailable, so consistency cannot be calculated. Recorded completions are still included.</p>}</div></div></>}</section></main>
}
function Highlight({icon,label,title,detail}) {return <div className="trail-highlight"><span aria-hidden>{icon}</span><div><small>{label}</small><strong>{title}</strong><small>{detail}</small></div></div>}
