import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Flame, Target, Zap } from 'lucide-react'
import { weeklyTrailAPI, trailEvent } from '../services/weeklyTrail'
import './weeklyTrail.css'

const shownKey = userId => `wt_weekly_trail_shown:${userId || 'me'}`
const readShown = userId => { try { return JSON.parse(localStorage.getItem(shownKey(userId)) || 'null') } catch { return null } }
const saveShown = (userId, result) => { try { localStorage.setItem(shownKey(userId), JSON.stringify({ periodKey:result.periodKey, displayDate:result.displayDate, expiresAt:result.expiresAt })) } catch { } }

export const weekLabel = recap => {
  const format = key => new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { month:'short', day:'numeric', timeZone:'UTC' })
  return `${format(recap.startLocalDate)} – ${format(recap.endLocalDate)}, ${recap.endLocalDate.slice(0,4)}`
}
export const weekStory = recap => !recap.activeDays ? 'A quieter week' : recap.activeDays >= 5 ? 'A strong week' : 'Small steps, steady progress'
export function TrailLandscape() {
  return <svg className="trail-landscape" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="858" cy="72" r="34" fill="#ffe9b5"/><path d="M0 185 105 118 204 158 342 75 470 142 568 84 691 158 801 116 1000 65V300H0Z" fill="#bdd4fc"/><path d="M0 214 130 174 234 220 391 138 505 188 661 115 790 183 904 132 1000 167V300H0Z" fill="#91b6eb"/><path d="M0 257 160 211 330 270 488 197 604 235 769 174 895 214 1000 172V300H0Z" fill="#649fc9"/><path d="M0 294 180 259 325 280 506 248 691 277 836 225 1000 252V300H0Z" fill="#477e9b"/><path d="M544 300C581 266 704 260 687 233S626 210 666 193" fill="none" stroke="#d5edf2" strokeWidth="14" opacity=".8"/><path d="M578 235Q650 226 702 185T819 150 929 99" fill="none" stroke="#5a9bff" strokeWidth="2"/>{[[578,235],[702,185],[819,150],[929,99]].map(([cx,cy],i)=><circle key={cx} cx={cx} cy={cy} r="7" fill={i===3?'#1478ff':'#f5faff'} stroke="#fff" strokeWidth="2"/>)}</svg>
}
export function TrailStats({ recap }) {
  return <div className="trail-stats">{[[Target,recap.goalsProgressed,'Goals progressed'],[Zap,recap.habitCompletions,'Habit completions'],[CalendarDays,recap.habitConsistency === null ? 'N/A' : `${recap.habitConsistency}%`,'Consistency'],[Flame,recap.activeDays,'Active days']].map(([Icon,value,label])=><div key={label}><Icon size={19}/><span><strong>{value}</strong><small>{label}</small></span></div>)}</div>
}
export function WeekDots({ recap }) {
  return <div className="trail-days" aria-label={`${recap.activeDays} active days this week`}>{['M','T','W','T','F','S','S'].map((label,i)=>{ const day=new Date(`${recap.startLocalDate}T12:00:00Z`);day.setUTCDate(day.getUTCDate()+i);const date=day.toISOString().slice(0,10);const active=recap.activeDateKeys?.includes(date);return <div key={date} title={`${date}: ${active?'Active':'No recorded activity'}`}><small>{label}</small><span className={active?'active':''}/></div> })}</div>
}
export function WeeklyTrailTeaser({ refreshKey, userId, fallback = null }) {
  const [result,setResult] = useState(null)
  const ref = useRef(null)
  useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      try {
        let data=await weeklyTrailAPI.current({ dedupe:true })
        const prior=readShown(userId)
        if (!data.available && data.reason==='ALREADY_SEEN' && prior?.periodKey===data.periodKey && new Date(prior.expiresAt)>new Date()) data=await weeklyTrailAPI.current({ includeSeen:true })
        if (cancelled) return
        if (data.available) {
          saveShown(userId,data)
          setResult(data)
          weeklyTrailAPI.seen(data.periodKey).catch(()=>{})
        } else setResult(data)
      } catch { if (!cancelled) setResult({available:false}) }
    }
    load();window.addEventListener('focus',load)
    return()=>{cancelled=true;window.removeEventListener('focus',load)}
  },[refreshKey,userId])
  useEffect(()=>{
    if(!result?.available||!ref.current)return
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){trailEvent('weekly_trail_teaser_shown',result);observer.disconnect()}})
    observer.observe(ref.current);return()=>observer.disconnect()
  },[result?.periodKey,result?.available])
  if(!result?.available)return fallback
  const recap=result.recap
  return <section ref={ref} className="trail-teaser"><TrailLandscape/><div className="trail-teaser-content"><div className="trail-eyebrow"><CalendarDays size={14}/> YOUR WEEKLY TRAIL <b>NEW</b></div><h2>{weekStory(recap)}</h2><p>{weekLabel(recap)}</p><div className="trail-mobile-dots"><WeekDots recap={recap}/></div><TrailStats recap={recap}/><Link onClick={()=>trailEvent('weekly_trail_opened',result)} className="trail-primary" to="/weekly-trail">See your week <ArrowRight size={17}/></Link></div></section>
}
