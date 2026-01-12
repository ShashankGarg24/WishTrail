// Static list of interests for the app
// Used across Dashboard, Profile Edit, and other components
// This replaces the need to fetch interests from the backend

export const INTERESTS_LIST = [
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'personal_growth', label: 'Personal Growth', icon: '🌱' },
  { id: 'creativity', label: 'Creativity', icon: '🎭' },
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'business', label: 'Business', icon: '📈' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🏡' },
  { id: 'spirituality', label: 'Spirituality', icon: '🕯️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'reading', label: 'Reading', icon: '📖' },
  { id: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'volunteering', label: 'Volunteering', icon: '🤝' }
];

// Export just the interest IDs for easy filtering
export const INTEREST_IDS = INTERESTS_LIST.map(i => i.id);
