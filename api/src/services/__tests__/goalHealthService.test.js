jest.mock('../../config/supabase', () => ({ query: jest.fn() }));

const { deriveGoalHealth } = require('../goalHealthService');

const TODAY = '2026-10-09';
const goal = (days, progress = false, extra = {}) => ({
  createdAt: progress ? '2025-01-01T00:00:00Z' : new Date(Date.UTC(2026, 9, 9 - days, 12)),
  lastProgressDateKey: progress ? new Date(Date.UTC(2026, 9, 9 - days, 12)).toISOString().slice(0, 10) : null,
  todayKey: TODAY,
  timezone: 'UTC',
  ...extra
});

describe('Goal Health V1', () => {
  test.each([
    [0, 'GETTING_STARTED'], [7, 'GETTING_STARTED'], [8, 'STABLE'],
    [14, 'STABLE'], [15, 'SLIPPING'], [30, 'SLIPPING'], [31, 'STALLED']
  ])('classifies no-progress goal at %i days as %s', (days, expected) => {
    expect(deriveGoalHealth(goal(days)).goalHealth).toBe(expected);
  });

  test.each([
    [0, 'STRONG'], [7, 'STRONG'], [8, 'STABLE'], [14, 'STABLE'],
    [15, 'SLIPPING'], [30, 'SLIPPING'], [31, 'STALLED']
  ])('classifies last progress at %i days as %s', (days, expected) => {
    expect(deriveGoalHealth(goal(days, true)).goalHealth).toBe(expected);
  });

  test('completed is lifecycle status and not Goal Health', () => {
    expect(deriveGoalHealth(goal(31, true, { completedAt: '2026-10-01T00:00:00Z' }))).toMatchObject({
      lifecycleStatus: 'COMPLETED', goalHealth: null, healthLabel: 'Completed'
    });
  });

  test('recent progress recovers a slipping or stalled goal to strong', () => {
    expect(deriveGoalHealth(goal(2, true)).goalHealth).toBe('STRONG');
  });

  test('uses local calendar boundaries instead of raw elapsed hours', () => {
    const result = deriveGoalHealth({
      createdAt: '2026-10-01T18:45:00Z',
      timezone: 'Asia/Kolkata',
      todayKey: '2026-10-09'
    });
    expect(result).toMatchObject({ goalHealth: 'GETTING_STARTED', daysSinceCreation: 7 });
  });

  test('returns the explainable copy for each health band', () => {
    expect(deriveGoalHealth(goal(3)).healthReason).toBe('Created 3 days ago');
    expect(deriveGoalHealth(goal(2, true)).healthReason).toBe('Progressed 2 days ago');
    expect(deriveGoalHealth(goal(9, true)).healthReason).toBe('Last progress 9 days ago');
    expect(deriveGoalHealth(goal(18, true)).healthReason).toBe('No progress for 18 days');
    expect(deriveGoalHealth(goal(34, true)).healthReason).toBe('No progress for 34 days');
  });
});
