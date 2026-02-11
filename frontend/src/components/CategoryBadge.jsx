import { GOAL_CATEGORIES } from '../constants/goalCategories';

const CategoryBadge = ({ category, className = '' }) => {
  if (!category) return null;
  
  const cat = GOAL_CATEGORIES.find(c => c.id === category);
  if (!cat) return null;

  return (
    <span className={`inline-block px-3 py-1 bg-blue-50 text-[#4c99e6] text-xs font-semibold rounded-full tracking-wide ${className}`}>
      {cat.label}
    </span>
  );
};

export default CategoryBadge;
