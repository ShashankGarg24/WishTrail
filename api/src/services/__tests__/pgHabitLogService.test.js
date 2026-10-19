const mockClient = { query: jest.fn() };

jest.mock('../../config/supabase', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn(callback => callback(mockClient))
}));
jest.mock('../../config/observability', () => ({ logger: { info: jest.fn() } }));
jest.mock('../pgHabitService', () => ({ calculateStreak: jest.fn() }));

const pgHabitService = require('../pgHabitService');
const pgHabitLogService = require('../pgHabitLogService');
const { query } = require('../../config/supabase');

beforeEach(() => {
  jest.clearAllMocks();
  pgHabitService.calculateStreak.mockResolvedValue({ currentStreak: 4, longestStreak: 8 });
});

test('adds multiple completions to the existing daily log in one update', async () => {
  mockClient.query
    .mockResolvedValueOnce({ rows: [{ id: 31 }] })
    .mockResolvedValueOnce({ rows: [{
      id: 31,
      user_id: 7,
      habit_id: 12,
      date_key: '2026-10-19',
      status: 'done',
      completion_count: 4,
      completion_times_mood: []
    }] })
    .mockResolvedValueOnce({ rows: [] });

  const log = await pgHabitLogService.logHabit({
    userId: 7,
    habitId: 12,
    dateKey: '2026-10-19',
    completionCount: 3,
    mood: 'good'
  });

  expect(mockClient.query).toHaveBeenCalledTimes(3);
  expect(mockClient.query.mock.calls[1][0]).toContain('generate_series(1, $2)');
  expect(mockClient.query.mock.calls[1][1]).toEqual(['done', 3, 'good', 31]);
  expect(log.completionCount).toBe(4);
});

test('replacing today with a skipped log resets current streak', async () => {
  mockClient.query
    .mockResolvedValueOnce({ rows: [{
      id: 31,
      user_id: 7,
      habit_id: 12,
      date_key: '2026-10-19',
      status: 'skipped',
      completion_count: 0,
      completion_times_mood: []
    }] })
    .mockResolvedValueOnce({ rows: [] });

  const log = await pgHabitLogService.replaceHabitLog(12, 31, 7, {
    status: 'skipped',
    entries: [],
    currentDateKey: '2026-10-19'
  });

  expect(mockClient.query.mock.calls[0][0]).not.toContain('updated_at');
  expect(mockClient.query.mock.calls[0][1]).toEqual(['skipped', 0, '[]', 31, 12, 7]);
  expect(mockClient.query.mock.calls[1][1]).toEqual([0, 8, 12, 7]);
  expect(log.status).toBe('skipped');
});

test('deleting one completion preserves the daily log and rebuilds its stats', async () => {
  const entries = [
    { timestamp: '2026-10-19T08:00:00.000Z', mood: 'good' },
    { timestamp: '2026-10-19T12:00:00.000Z', mood: 'great' }
  ];
  query
    .mockResolvedValueOnce({ rows: [{ id: 31, completion_times_mood: entries }] })
    .mockResolvedValueOnce({ rows: [{ timezone: 'Asia/Kolkata' }] });
  mockClient.query
    .mockResolvedValueOnce({ rows: [{
      id: 31,
      user_id: 7,
      habit_id: 12,
      date_key: '2026-10-19',
      status: 'done',
      completion_count: 1,
      completion_times_mood: [entries[1]]
    }] })
    .mockResolvedValueOnce({ rows: [] });

  const result = await pgHabitLogService.deleteCompletionEntry(12, 31, 7, 0);

  expect(result.deleted).toBe(false);
  expect(result.log.completionCount).toBe(1);
  expect(result.log.completionTimesMood).toEqual([entries[1]]);
  expect(mockClient.query.mock.calls[0][1]).toEqual([
    'done', 1, JSON.stringify([entries[1]]), 31, 12, 7
  ]);
  expect(pgHabitService.calculateStreak).toHaveBeenCalled();
});
