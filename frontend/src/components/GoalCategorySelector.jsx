import CategoryIcon from './CategoryIcon'
import CategoryTileSelector from './CategoryTileSelector'
import { GOAL_CATEGORIES } from '../constants/goalCategories'

export default function GoalCategorySelector({ value, onChange, disabled = false }) {
  const items = GOAL_CATEGORIES.map(category => ({ key: category.id, label: category.label, icon: <CategoryIcon category={category.id} size="sm"/> }))
  return <CategoryTileSelector items={items} value={value} onChange={onChange} ariaLabel="Goal category" disabled={disabled}/>
}
