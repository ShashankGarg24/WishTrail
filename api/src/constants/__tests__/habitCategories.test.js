const definitions = require('../../../../shared/habitCategories.json');
const { HABIT_CATEGORIES, normalizeHabitCategory } = require('../habitCategories');

describe('habit category configuration', () => {
  test('contains the complete approved V1 taxonomy exactly once', () => {
    expect(HABIT_CATEGORIES).toEqual([
      'FITNESS', 'NUTRITION', 'MINDFULNESS', 'LEARNING', 'PRODUCTIVITY', 'CAREER',
      'FINANCE', 'CREATIVITY', 'SELF_CARE', 'SOCIAL', 'HOME', 'OTHER'
    ]);
    expect(new Set(HABIT_CATEGORIES).size).toBe(HABIT_CATEGORIES.length);
  });

  test('every category has complete presentation metadata', () => {
    for (const definition of definitions) {
      expect(definition).toEqual(expect.objectContaining({
        key: expect.any(String), label: expect.any(String), icon: expect.any(String),
        accent: expect.stringMatching(/^#[0-9A-F]{6}$/), background: expect.stringMatching(/^#[0-9A-F]{6}$/)
      }));
    }
  });

  test.each([null, undefined, '', 'legacy-value', 'SLEEP'])(
    'falls back unknown category %p to OTHER',
    value => expect(normalizeHabitCategory(value)).toBe('OTHER')
  );

  test('normalizes supported display-like values', () => {
    expect(normalizeHabitCategory('self care')).toBe('SELF_CARE');
    expect(normalizeHabitCategory('fitness')).toBe('FITNESS');
  });
});
