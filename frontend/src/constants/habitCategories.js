import categoryDefinitions from '../../../shared/habitCategories.json'
import {
  Apple, BookOpen, Briefcase, CheckCircle2, Dumbbell, Flower2,
  Heart, Home, Shapes, Sparkles, UsersRound, WalletCards,
} from 'lucide-react'

const ICONS = { Apple, BookOpen, Briefcase, CheckCircle2, Dumbbell, Flower2, Heart, Home, Shapes, Sparkles, UsersRound, WalletCards }

export const HABIT_CATEGORIES = Object.freeze(categoryDefinitions.map(category => category.key))
export const HABIT_CATEGORY_CONFIG = Object.freeze(Object.fromEntries(categoryDefinitions.map(category => [category.key, Object.freeze({ ...category, icon: ICONS[category.icon] || Shapes })])))

export const normalizeHabitCategory = value => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return HABIT_CATEGORY_CONFIG[normalized] ? normalized : 'OTHER'
}

export const getHabitCategory = value => HABIT_CATEGORY_CONFIG[normalizeHabitCategory(value)]
export const getHabitCategoryLabel = value => getHabitCategory(value).label
