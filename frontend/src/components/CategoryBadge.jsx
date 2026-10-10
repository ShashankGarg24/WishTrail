import CategoryIcon from './CategoryIcon';
import { getCategoryVisual } from '../utils/categoryIcons';

const CategoryBadge = ({ category, className = '' }) => {
  const visual = getCategoryVisual(category);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${className}`} style={{ color: visual.accent, backgroundColor: visual.iconBackground }}>
      <CategoryIcon category={category} size="sm" className="!h-4 !w-4 !bg-transparent" />
      {visual.label}
    </span>
  );
};

export default CategoryBadge;
