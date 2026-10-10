// Canonical goal categories for WishTrail (sync with backend).
import { GOAL_CATEGORY_VISUALS } from '../utils/categoryIcons'

export const GOAL_CATEGORIES = Object.entries(GOAL_CATEGORY_VISUALS).map(([id, visual]) => ({
  id,
  label: visual.label,
  iconKey: visual.iconKey,
  variant: visual.variant
}))
