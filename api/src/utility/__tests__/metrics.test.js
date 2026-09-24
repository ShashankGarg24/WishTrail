const { percentage, scheduledOccurrences, habitCompletion, activeDays, percentagePointTrend, quantitativeProgress, milestoneProgress } = require('../metrics');
const { getDateKeyInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone, getDateRangeInTimezone } = require('../timezone');

describe('metrics', () => {
  test('habit completion includes skipped and missed occurrences in its denominator', () => {
    expect(habitCompletion({ expected: 10, done: 5, skipped: 5 })).toMatchObject({ missed: 0, percentage: 50, followThroughRate: 100 });
    expect(habitCompletion({ expected: 10, done: 5, skipped: 2, missed: 3 })).toMatchObject({ percentage: 50, followThroughRate: 62.5 });
  });
  test('returns a safe zero percentage without expected occurrences', () => {
    expect(habitCompletion({ expected: 0, done: 0 })).toMatchObject({ percentage: 0 });
    expect(percentage(0, 0)).toBe(0);
  });
  test('counts only scheduled weekdays', () => {
    const habit = { frequency: 'custom', daysOfWeek: [1, 3, 5], createdAt: '2026-09-21T00:00:00.000Z' };
    expect(scheduledOccurrences(habit, '2026-09-21', '2026-09-25')).toBe(3);
  });
  test('calculates goal completion safely', () => expect(percentage(3, 10)).toBe(30));
  test('counts distinct active days and excludes future dates', () => {
    expect(activeDays(['2026-09-21', '2026-09-21', '2026-09-23', '2026-09-24', '2026-09-25'], '2026-09-24')).toBe(3);
    expect(activeDays([], '2026-09-24')).toBe(0);
  });
  test('uses stable ISO-like local date keys across timezones', () => {
    expect(getDateKeyInTimezone('2026-09-24T00:30:00.000Z', 'America/Los_Angeles')).toBe('2026-09-23');
  });

  test('uses DST-correct local day boundaries', () => {
    expect(getStartOfDayInTimezone('2026-03-08', 'America/New_York').toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(getEndOfDayInTimezone('2026-03-08', 'America/New_York').toISOString()).toBe('2026-03-09T03:59:59.999Z');
    expect(getStartOfDayInTimezone('2026-11-01', 'America/New_York').toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(getEndOfDayInTimezone('2026-11-01', 'America/New_York').toISOString()).toBe('2026-11-02T04:59:59.999Z');
  });

  test('moves local date ranges by calendar days', () => {
    const range = getDateRangeInTimezone(6, 'UTC');
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('uses percentage-point trends without inventing a previous value', () => {
    expect(percentagePointTrend(76, 58)).toBe(18);
    expect(percentagePointTrend(50, 65)).toBe(-15);
    expect(percentagePointTrend(50, null, false)).toBeNull();
  });
  test('handles quantitative and weighted milestone progress safely', () => {
    expect(quantitativeProgress(64, 100)).toBe(64);
    expect(quantitativeProgress(64, 0)).toBe(0);
    expect(milestoneProgress([{ completed: true }, { completed: true }, { completed: true }, { completed: false }, { completed: false }])).toBe(60);
    expect(milestoneProgress([{ weight: 10, completed: true }, { weight: 20, completed: true }, { weight: 30, completed: false }])).toBe(50);
  });
});
