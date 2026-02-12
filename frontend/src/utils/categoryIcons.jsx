import { Activity, BookOpen, Briefcase, TrendingUp, DollarSign, Palette, Rocket, Plane, Heart, Users, Home, MoreHorizontal, Brain } from 'lucide-react';
import { GOAL_CATEGORIES } from '../constants/goalCategories';

export const getCategoryIcon = (category, className = 'h-5 w-5') => {
  // Map by ID
  const iconMapById = {
    'HEALTH_FITNESS': <Activity className={className} />,
    'MENTAL_HEALTH': <Brain className={className} />,
    'EDUCATION_LEARNING': <BookOpen className={className} />,
    'CAREER_WORK': <Briefcase className={className} />,
    'PERSONAL_GROWTH': <TrendingUp className={className} />,
    'FINANCE': <DollarSign className={className} />,
    'CREATIVE': <Palette className={className} />,
    'SIDE_PROJECTS': <Rocket className={className} />,
    'TRAVEL_EXPERIENCES': <Plane className={className} />,
    'RELATIONSHIPS': <Heart className={className} />,
    'FAMILY': <Users className={className} />,
    'LIFESTYLE': <Home className={className} />,
    'OTHER': <MoreHorizontal className={className} />
  };
  
  // Check if it's an ID first
  if (iconMapById[category]) {
    return iconMapById[category];
  }
  
  // Otherwise, find by label
  const cat = GOAL_CATEGORIES.find(c => c.label === category);
  if (cat && iconMapById[cat.id]) {
    return iconMapById[cat.id];
  }
  
  return <MoreHorizontal className={className} />;
};
