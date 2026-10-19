jest.mock('../../config/supabase', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn()
}));

const { query } = require('../../config/supabase');
const pgHabitService = require('../pgHabitService');

const customHabit = {
  id: 5,
  user_id: 7,
  name: 'Train',
  frequency: 'custom',
  days_of_week: [1, 3, 5],
  daily_target_count: 2,
  created_at: '2026-10-01T00:00:00.000Z'
};

function mockHabitAndLogs(logs) {
  query
    .mockResolvedValueOnce({ rows: [customHabit] })
    .mockResolvedValueOnce({ rows: logs });
}

beforeEach(() => jest.clearAllMocks());

test('custom-schedule streak ignores unscheduled calendar gaps', async () => {
  mockHabitAndLogs([
    { date_key: '2026-10-07', status: 'done', completion_count: 2 },
    { date_key: '2026-10-09', status: 'done', completion_count: 3 }
  ]);

  await expect(pgHabitService.calculateStreak(5, '2026-10-11')).resolves.toEqual({
    currentStreak: 2,
    longestStreak: 2,
    totalScheduledDays: 2
  });
});

test('custom-schedule streak resets for a missed scheduled occurrence', async () => {
  mockHabitAndLogs([
    { date_key: '2026-10-05', status: 'done', completion_count: 2 },
    { date_key: '2026-10-09', status: 'done', completion_count: 2 }
  ]);

  await expect(pgHabitService.calculateStreak(5, '2026-10-09')).resolves.toEqual({
    currentStreak: 1,
    longestStreak: 1,
    totalScheduledDays: 2
  });
});

test('partial and unscheduled completions do not qualify for a streak', async () => {
  mockHabitAndLogs([
    { date_key: '2026-10-05', status: 'done', completion_count: 2 },
    { date_key: '2026-10-06', status: 'done', completion_count: 4 },
    { date_key: '2026-10-07', status: 'done', completion_count: 1 },
    { date_key: '2026-10-09', status: 'done', completion_count: 2 }
  ]);

  await expect(pgHabitService.calculateStreak(5, '2026-10-09')).resolves.toEqual({
    currentStreak: 1,
    longestStreak: 1,
    totalScheduledDays: 2
  });
});

test('an explicit skip today breaks the current streak', async () => {
  mockHabitAndLogs([
    { date_key: '2026-10-05', status: 'done', completion_count: 2 },
    { date_key: '2026-10-07', status: 'done', completion_count: 2 },
    { date_key: '2026-10-09', status: 'skipped', completion_count: 0 }
  ]);

  await expect(pgHabitService.calculateStreak(5, '2026-10-09')).resolves.toEqual({
    currentStreak: 0,
    longestStreak: 2,
    totalScheduledDays: 2
  });
});
