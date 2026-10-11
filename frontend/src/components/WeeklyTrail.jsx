import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Flame, Target, Zap } from 'lucide-react'
import { weeklyTrailAPI, trailEvent } from '../services/weeklyTrail'
import './weeklyTrail.css'

export const weekLabel = recap => {
  const format = key => new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${format(recap.startLocalDate)} – ${format(recap.endLocalDate)}, ${recap.endLocalDate.slice(0,4)}`
}
export const weekStory = recap => {
  if (recap.narrative === 'FIRST_TRAIL') return 'Your first Weekly Trail'
  if (recap.narrative === 'COMEBACK' || recap.narrative === 'WELCOME_BACK') return 'Welcome back to your trail'
  return !recap.activeDays ? 'A quieter week' : recap.activeDays >= 5 ? 'A strong week' : 'Small steps, steady progress'
}

export function TrailLandscape() {
  return <svg className="trail-landscape" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="858" cy="72" r="34" fill="#ffe9b5"/>
    <path d="M0 185 105 118 204 158 342 75 470 142 568 84 691 158 801 116 1000 65V300H0Z" fill="#bdd4fc"/>
    <path d="M0 214 130 174 234 220 391 138 505 188 661 115 790 183 904 132 1000 167V300H0Z" fill="#91b6eb"/>
    <path d="M0 257 160 211 330 270 488 197 604 235 769 174 895 214 1000 172V300H0Z" fill="#649fc9"/>
    <path d="M0 294 180 259 325 280 506 248 691 277 836 225 1000 252V300H0Z" fill="#477e9b"/>
    <path d="M544 300C581 266 704 260 687 233S626 210 666 193" fill="none" stroke="#d5edf2" strokeWidth="14" opacity=".8"/>
    <path d="M578 235Q650 226 702 185T819 150 929 99" fill="none" stroke="#5a9bff" strokeWidth="2"/>
    {[ [578,235],[702,185],[819,150],[929,99] ].map(([cx,cy],i) => <circle key={cx} cx={cx} cy={cy} r="7" fill={i===3?'#1478ff':'#f5faff'} stroke="#fff" strokeWidth="2"/>)}
  </svg>
}
export function TrailStats({ recap }) {
  return <div className="trail-stats">{[[Target,recap.goalsProgressed,'Goals progressed'],[Zap,recap.habitCompletions,'Habit completions'],[CalendarDays,recap.habitConsistency === null ? 'N/A' : `${recap.habitConsistency}%`,'Consistency'],[Flame,recap.activeDays,'Active days']].map(([Icon,value,label]) => <div key={label}><Icon size={19}/><span><strong>{value}</strong><small>{label}</small></span></div>)}</div>
}
export function WeekDots({ recap }) {
  return <div className="trail-days" aria-label={`${recap.activeDays} active days this week`}>{['M','T','W','T','F','S','S'].map((label,i) => {
    const day = new Date(`${recap.startLocalDate}T12:00:00Z`); day.setUTCDate(day.getUTCDate()+i)
    const date = day.toISOString().slice(0,10)
    const active = recap.activeDateKeys?.includes(date)
    return <div key={date} title={`${date}: ${active ? 'Active' : 'No recorded activity'}`}><small>{label}</small><span className={active?'active':''}/></div>
  })}</div>
}
export function WeeklyTrailTeaser({ refreshKey }) {
  const [result,setResult] = useState(null)
  const [error,setError] = useState(false)
  const [retry,setRetry] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    let cancelled = false
    const load = () => weeklyTrailAPI.teaser().then(data => { if (!cancelled) { setResult(data); setError(false) } }).catch(() => { if (!cancelled) setError(true) })
    load(); window.addEventListener('focus',load)
    return () => { cancelled=true; window.removeEventListener('focus',load) }
  },[refreshKey,retry])
  useEffect(() => {
    if (!result || !ref.current) return
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { trailEvent('weekly_trail_teaser_viewed',result.recap); observer.disconnect() } })
    observer.observe(ref.current); return () => observer.disconnect()
  },[result?.recap?.periodKey,result?.state])
  if (error) return <div className="trail-status">Your Weekly Trail couldn’t load. <button onClick={() => setRetry(v=>v+1)}>Try again</button></div>
  if (!result) return <div className="trail-status" role="status">Loading your Weekly Trail…</div>
  const {recap,state} = result
  return <section ref={ref} className="trail-teaser"><TrailLandscape/><div className="trail-teaser-content"><div className="trail-eyebrow"><CalendarDays size={14}/> {state==='NEW_RECAP'?'YOUR WEEKLY TRAIL':'THIS WEEK'} {state==='NEW_RECAP'&&<b>NEW</b>}</div><h2>{recap.weekInProgress ? (recap.activeDays ? weekStory(recap) : 'Your trail starts with a small step') : weekStory(recap)}</h2><p>{weekLabel(recap)} {recap.weekInProgress&&' · Week in progress'}</p><div className="trail-mobile-dots"><WeekDots recap={recap}/></div><TrailStats recap={recap}/><Link className="trail-primary" to={`/weekly-trail/${recap.periodKey}`}>{recap.weekInProgress?'View this week':'See your week'} <ArrowRight size={17}/></Link></div></section>
}
export function TrailRecapCard({ recap }) {
  return <Link className="trail-recap-card" to={`/weekly-trail/${recap.periodKey}`} onClick={() => trailEvent('weekly_trail_history_item_opened',recap)}><span className="trail-thumbnail"><TrailLandscape/></span><span><strong>Weekly Trail</strong><small>{weekLabel(recap)}</small><small>{recap.habitConsistency===null?'Consistency unavailable':`${recap.habitConsistency}% consistency`}</small><small>{recap.goalsProgressed} goals · {recap.habitCompletions} completions · {recap.activeDays} days</small></span><ArrowRight size={16}/></Link>
}
