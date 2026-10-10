import { createElement } from 'react'
import { Activity, BookOpen, Brain, Briefcase, HeartHandshake, Home, MapPinned, Palette, Rocket, Sparkles, Sprout, Target, TrendingUp } from 'lucide-react'

/** Single source of truth for every goal category's icon, colour tokens and banner motif. */
export const GOAL_CATEGORY_VISUALS = Object.freeze({
  HEALTH_FITNESS: { label: 'Health & Fitness', icon: Activity, iconKey: 'Activity', variant: 'health', accent: '#168A9C', backgroundStart: '#F2FBFC', backgroundEnd: '#E9F5FA', iconBackground: '#DDF4F5', hero: { composition: 'flow', base: '#0F8FA1', deep: '#176BB0', mid: '#31B9B4', light: '#91E1B5', glow: '#D9FFF0' } },
  MENTAL_HEALTH: { label: 'Mental Health', icon: Brain, iconKey: 'Brain', variant: 'mental', accent: '#7868B7', backgroundStart: '#F8F6FD', backgroundEnd: '#EEF0FA', iconBackground: '#ECE8FA', hero: { composition: 'horizon', base: '#7770B6', deep: '#617EBB', mid: '#72B6C9', light: '#C8B9EA', glow: '#EEF0FF' } },
  EDUCATION_LEARNING: { label: 'Education & Learning', icon: BookOpen, iconKey: 'BookOpen', variant: 'education', accent: '#496FC1', backgroundStart: '#F4F7FD', backgroundEnd: '#EAF1FB', iconBackground: '#E3ECFA', hero: { composition: 'layers', base: '#405CA8', deep: '#293A82', mid: '#506FBE', light: '#E4B967', glow: '#FFF0C5' } },
  CAREER_WORK: { label: 'Career & Work', icon: Briefcase, iconKey: 'Briefcase', variant: 'career', accent: '#356DA8', backgroundStart: '#F3F8FC', backgroundEnd: '#E8F0F8', iconBackground: '#DFEBF7', hero: { composition: 'ascend', base: '#174D91', deep: '#102F68', mid: '#237FC7', light: '#5BD5E9', glow: '#DFFAFF' } },
  PERSONAL_GROWTH: { label: 'Personal Growth', icon: Sprout, iconKey: 'Sprout', variant: 'growth', accent: '#43866A', backgroundStart: '#F4FAF6', backgroundEnd: '#E9F5ED', iconBackground: '#DFF0E5', hero: { composition: 'ascend', base: '#3D9874', deep: '#187B7D', mid: '#66BD85', light: '#D5DD72', glow: '#FFF4A9' } },
  FINANCE: { label: 'Finance', icon: TrendingUp, iconKey: 'TrendingUp', variant: 'finance', accent: '#318067', backgroundStart: '#F3FAF7', backgroundEnd: '#E5F3ED', iconBackground: '#DCF0E7', hero: { composition: 'layers', base: '#146F6A', deep: '#103C58', mid: '#278A71', light: '#72BA8D', glow: '#C9F6DF' } },
  CREATIVE: { label: 'Creative', icon: Palette, iconKey: 'Palette', variant: 'creative', accent: '#8564AD', backgroundStart: '#FAF7FC', backgroundEnd: '#F0EAF7', iconBackground: '#EEE5F6', hero: { composition: 'orbit', base: '#A05A9B', deep: '#6748A8', mid: '#D96F91', light: '#F0A173', glow: '#FFE3AA' } },
  SIDE_PROJECTS: { label: 'Side Projects', icon: Rocket, iconKey: 'Rocket', variant: 'projects', accent: '#6266B8', backgroundStart: '#F6F7FD', backgroundEnd: '#EDEFFA', iconBackground: '#E6E7F8', hero: { composition: 'ascend', base: '#3C4193', deep: '#172557', mid: '#526CF0', light: '#9669D8', glow: '#C5F8FF', dark: true } },
  TRAVEL_EXPERIENCES: { label: 'Travel & Experiences', icon: MapPinned, iconKey: 'MapPinned', variant: 'travel', accent: '#3585B8', backgroundStart: '#F2FAFD', backgroundEnd: '#E5F3FA', iconBackground: '#DCEFFA', hero: { composition: 'horizon', base: '#329FC1', deep: '#247EB2', mid: '#46C2BF', light: '#F2A878', glow: '#FFF2D7' } },
  RELATIONSHIPS: { label: 'Relationships', icon: HeartHandshake, iconKey: 'HeartHandshake', variant: 'relationships', accent: '#B15F79', backgroundStart: '#FCF6F8', backgroundEnd: '#F8E9EE', iconBackground: '#F6E1E8', hero: { composition: 'flow', base: '#B5678D', deep: '#718DCC', mid: '#AA77B6', light: '#DC8193', glow: '#FFE7ED' } },
  FAMILY: { label: 'Family', icon: Home, iconKey: 'Home', variant: 'family', accent: '#A96E3E', backgroundStart: '#FDF9F4', backgroundEnd: '#F8EEE3', iconBackground: '#F5E6D7', hero: { composition: 'orbit', base: '#D18D6D', deep: '#7A9EBB', mid: '#E8A178', light: '#F3CA91', glow: '#FFF3D7' } },
  LIFESTYLE: { label: 'Lifestyle', icon: Sparkles, iconKey: 'Sparkles', variant: 'lifestyle', accent: '#2E8997', backgroundStart: '#F2FAFB', backgroundEnd: '#E5F3F5', iconBackground: '#DCF0F2', hero: { composition: 'flow', base: '#55A997', deep: '#43AAA9', mid: '#8BC9AA', light: '#D6D879', glow: '#F3FFD1' } },
  OTHER: { label: 'Other', icon: Target, iconKey: 'Target', variant: 'default', accent: '#4C99E6', backgroundStart: '#F4F9FE', backgroundEnd: '#E8F2FC', iconBackground: '#DFEDFA', hero: { composition: 'horizon', base: '#4C99E6', deep: '#347FCE', mid: '#62B7E8', light: '#9183D5', glow: '#ECF8FF' } }
})

export const normalizeGoalCategory = category => {
  const normalized = String(category || 'OTHER').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  if (GOAL_CATEGORY_VISUALS[normalized]) return normalized
  return Object.entries(GOAL_CATEGORY_VISUALS).find(([, visual]) => visual.label.toUpperCase() === String(category || '').trim().toUpperCase())?.[0] || 'OTHER'
}

export const getCategoryVisual = category => GOAL_CATEGORY_VISUALS[normalizeGoalCategory(category)]
export const getCategoryLabel = category => getCategoryVisual(category).label

// Kept for existing call sites; new UI should prefer CategoryIcon.
export const getCategoryIcon = (category, className = 'h-5 w-5') => {
  const { icon } = getCategoryVisual(category)
  return createElement(icon, { className, 'aria-hidden': true })
}
