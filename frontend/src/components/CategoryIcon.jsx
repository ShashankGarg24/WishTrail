import { getCategoryVisual } from '../utils/categoryIcons'

const SIZES = { sm: [28, 14, 9], md: [36, 18, 11], lg: [44, 22, 12], xl: [56, 28, 14] }

export default function CategoryIcon({ category, size = 'md', className = '', label }) {
  const visual = getCategoryVisual(category)
  const [box, iconSize, radius] = SIZES[size] || SIZES.md
  const Icon = visual.icon
  return <span className={`inline-grid shrink-0 place-items-center ${className}`} style={{ width: box, height: box, borderRadius: radius, color: visual.accent, backgroundColor: visual.iconBackground }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-goal-category={visual.variant}><Icon size={iconSize} strokeWidth={2} /></span>
}
