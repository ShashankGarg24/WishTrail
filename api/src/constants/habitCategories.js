const categoryDefinitions = require('../../../shared/habitCategories.json');

const HABIT_CATEGORIES = Object.freeze(categoryDefinitions.map(category => category.key));
const HABIT_CATEGORY_SET = new Set(HABIT_CATEGORIES);

const normalizeHabitCategory = value => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return HABIT_CATEGORY_SET.has(normalized) ? normalized : 'OTHER';
};

module.exports = { categoryDefinitions, HABIT_CATEGORIES, normalizeHabitCategory };
