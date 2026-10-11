import { getHabitCategory } from '../constants/habitCategories'

const SIZES = { sm: [28, 15, 8], md: [36, 19, 10], lg: [44, 22, 12] }

export default function HabitCategoryIcon({ category, size = 'md', className = '', label }) {
  const config = getHabitCategory(category)
  const Icon = config.icon
  const [box, iconSize, radius] = SIZES[size] || SIZES.md
  return <span className={`inline-grid shrink-0 place-items-center ${className}`} style={{ width: box, height: box, borderRadius: radius, color: config.accent, backgroundColor: config.background }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-habit-category={config.key}><Icon size={iconSize} strokeWidth={2}/></span>
}
