import HabitCategoryIcon from './HabitCategoryIcon'
import { HABIT_CATEGORIES, getHabitCategory } from '../constants/habitCategories'
import CategoryTileSelector from './CategoryTileSelector'

export default function HabitCategorySelector({ value, onChange }) {
  const items = HABIT_CATEGORIES.map(key => ({ key, label: getHabitCategory(key).label, icon: <HabitCategoryIcon category={key} size="sm"/> }))
  return <CategoryTileSelector items={items} value={value} onChange={onChange} ariaLabel="Habit category"/>
}
