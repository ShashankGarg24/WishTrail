import useApiStore from '../store/apiStore'
import { darkHeroPalette } from '../utils/theme'
import AbstractGoalArtwork from './AbstractGoalArtwork'
import { getCategoryVisual } from '../utils/categoryIcons'

const HEIGHTS = { compact: 'h-24', detail: 'h-36 sm:h-44', share: 'h-48 sm:h-56 md:h-64' }

export default function GoalCategoryBanner({ category, variant = 'detail', className = '' }) {
  const darkMode = useApiStore(state => state.isDarkMode)
  const base = getCategoryVisual(category).hero
  const visual = darkMode ? { ...base, ...darkHeroPalette } : base
  return <div className={`relative isolate w-full overflow-hidden rounded-xl ${HEIGHTS[variant] || HEIGHTS.detail} ${className}`} style={{ background: `linear-gradient(135deg, ${visual.deep}, ${visual.base})` }} aria-hidden="true" data-composition={visual.composition} data-banner-variant={variant}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/[.04]" />
    <AbstractGoalArtwork category={category} className="absolute inset-0 h-full w-full" />
  </div>
}
