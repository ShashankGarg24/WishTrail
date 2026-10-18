jest.mock('../../config/supabase', () => ({ query: jest.fn() }));

const { calculateGoalMetrics } = require('../goalMetricsService');

const base = { id: 1, created_at: '2026-09-14T10:00:00Z', target_date: '2026-10-20', progress: { percent: 40 } };

describe('Goal metrics', () => {
  test('counts text updates as meaningful, distinct active dates, and Monday calendar weeks', () => {
    const metrics = calculateGoalMetrics({ goal: base, todayKey: '2026-10-10', updates: [
      { text: 'Progress', emotion: 'great', date_key: '2026-09-15' },
      { text: 'More progress', emotion: 'good', date_key: '2026-09-15' },
      { text: 'Progress', date_key: '2026-09-29' },
      { text: '', emotion: 'okay', date_key: '2026-10-07' }
    ] });
    expect(metrics).toMatchObject({ progress: 40, goalLogs: 4, checkInDays: 3, progressUpdates: 3, activeDays: 2, activeWeeks: 2, eligibleWeeks: 4, consistency: 50, daysLeft: 10, lastProgressDate: '2026-09-29', lastCheckInDate: '2026-10-07', daysSinceLastProgress: 11, daysSinceLastCheckIn: 3 });
    expect(metrics.activityDays).toHaveLength(30);
    expect(metrics.weeklyActivity).toHaveLength(4);
    expect(metrics.activityDays.find(day => day.date === '2026-10-07')).toMatchObject({ logs: 1, progressUpdates: 0, moodSamples: 1 });
  });

  test('mood distribution uses only logs containing emotion, including reflection-only logs', () => {
    const metrics = calculateGoalMetrics({ goal: base, todayKey: '2026-10-10', updates: [
      { text: 'Progress', emotion: 'great', date_key: '2026-10-01' },
      { text: '', emotion: 'great', date_key: '2026-10-02' },
      { text: 'Progress', emotion: 'okay', date_key: '2026-10-03' },
      { text: 'Progress', date_key: '2026-10-04' }
    ] });
    expect(metrics.moodSamples).toBe(3);
    expect(metrics.moodDistribution).toEqual(expect.arrayContaining([
      { emotion: 'great', count: 2, percent: 67 },
      { emotion: 'okay', count: 1, percent: 33 }
    ]));
  });

  test('reports overdue days and never fabricates intermediate progress points', () => {
    const metrics = calculateGoalMetrics({ goal: { ...base, target_date: '2026-10-01' }, todayKey: '2026-10-10', updates: [] });
    expect(metrics).toMatchObject({ daysLeft: 0, overdueDays: 9 });
    expect(metrics.progressSeries).toHaveLength(2);
  });

  test('filters updates, active days and moods to the selected range', () => {
    const metrics = calculateGoalMetrics({ goal: base, todayKey: '2026-10-10', days: 7, updates: [
      { text: 'Old progress', emotion: 'great', date_key: '2026-10-01' },
      { text: 'Recent progress', emotion: 'good', date_key: '2026-10-05' },
      { text: 'More progress', emotion: 'good', date_key: '2026-10-10' }
    ] });
    expect(metrics).toMatchObject({ rangeDays: 7, rangeStart: '2026-10-04', progressUpdates: 2, activeDays: 2, moodSamples: 2 });
    expect(metrics.moodDistribution).toEqual([{ emotion: 'good', count: 2, percent: 100 }]);
  });
});
