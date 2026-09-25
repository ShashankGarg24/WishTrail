jest.mock('../../config/supabase', () => ({ query: jest.fn() }));
jest.mock('../../config/observability', () => ({ logger: {} }));
jest.mock('../../config/redis', () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock('../../models/Notification', () => ({ createHabitReminderNotification: jest.fn() }));
jest.mock('../../models/Activity', () => ({}));
jest.mock('../../models/extended/UserPreferences', () => ({ findOne: jest.fn() }));
jest.mock('../pgHabitService', () => ({ getUserHabits: jest.fn() }));
jest.mock('../pgHabitLogService', () => ({ isLoggedToday: jest.fn() }));
jest.mock('../pgUserService', () => ({}));

const { query } = require('../../config/supabase');
const Notification = require('../../models/Notification');
const UserPreferences = require('../../models/extended/UserPreferences');
const pgHabitService = require('../pgHabitService');
const pgHabitLogService = require('../pgHabitLogService');
const { sendReminderNotifications } = require('../habitService');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Friday in UTC, Saturday morning in Kolkata.
  jest.setSystemTime(new Date('2026-09-25T21:32:00Z'));
  UserPreferences.findOne.mockReturnValue({ select: () => ({ lean: async () => ({}) }) });
  pgHabitLogService.isLoggedToday.mockResolvedValue(false);
});

afterEach(() => jest.useRealTimers());

test.each([
  ['Asia/Kolkata', 6, '03:02', '2026-09-26'],
  [null, 5, '21:32', '2026-09-25']
])('reminders follow user timezone %s for time and weekday', async (timezone, day, time, dateKey) => {
  query.mockResolvedValue({ rows: [{ id: 7, timezone }] });
  pgHabitService.getUserHabits.mockResolvedValue([{
    id: 5, name: 'Read', frequency: 'custom', daysOfWeek: [day],
    timezone: 'America/New_York', reminders: [{ time }]
  }]);

  const result = await sendReminderNotifications({ windowMinutes: 0 });

  expect(result.count).toBe(1);
  expect(pgHabitLogService.isLoggedToday).toHaveBeenCalledWith(5, dateKey);
  expect(Notification.createHabitReminderNotification).toHaveBeenCalledWith(7, 5, 'Read', time);
});

test('changing the account timezone changes the next reminder evaluation', async () => {
  pgHabitService.getUserHabits.mockResolvedValue([{
    id: 5, name: 'Read', frequency: 'daily', reminders: [{ time: '03:02' }]
  }]);
  query.mockResolvedValue({ rows: [{ id: 7, timezone: 'Asia/Kolkata' }] });
  expect((await sendReminderNotifications({ windowMinutes: 0 })).count).toBe(1);
  query.mockResolvedValue({ rows: [{ id: 7, timezone: 'UTC' }] });
  expect((await sendReminderNotifications({ windowMinutes: 0 })).count).toBe(0);
});
