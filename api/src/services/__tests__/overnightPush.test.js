jest.mock('../../config/observability', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../models/DeviceToken', () => ({ find: jest.fn() }));
jest.mock('../../models/extended/UserPreferences', () => ({ findOne: jest.fn() }));
jest.mock('../pgUserService', () => ({ findById: jest.fn() }));
jest.mock('firebase-admin', () => ({ apps: [{}], messaging: jest.fn() }));

const admin = require('firebase-admin');
const devices = require('../../models/DeviceToken');
const prefs = require('../../models/extended/UserPreferences');
const users = require('../pgUserService');
const { sendFcmToUser } = require('../pushService');
const send = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  prefs.findOne.mockReturnValue({ select: () => ({ lean: async () => ({}) }) });
  users.findById.mockResolvedValue({ id: 7, timezone: 'UTC' });
  devices.find.mockReturnValue({ select: () => ({ lean: async () => [{ token: 'device-token', platform: 'android' }] }) });
  admin.messaging.mockReturnValue({ sendEachForMulticast: send });
  send.mockResolvedValue({ successCount: 1, responses: [{ success: true }] });
});
afterEach(() => jest.useRealTimers());

test.each(['22:00', '23:30', '00:00', '07:59'])('social pushes reach Firebase at %s', async time => {
  jest.setSystemTime(new Date(`2026-09-27T${time}:00Z`));
  const result = await sendFcmToUser(7, { _id: 'notification', type: 'new_follower' }, { waitForDelivery: true });
  expect(result.ok).toBe(true);
  expect(send).toHaveBeenCalledTimes(1);
});

test('scheduled reminders still respect their delivery window', async () => {
  jest.setSystemTime(new Date('2026-09-27T23:00:00Z'));
  for (const type of ['motivation_quote', 'daily_logs_prompt']) {
    expect(await sendFcmToUser(7, { type }, { waitForDelivery: true })).toMatchObject({ ok: false, code: 'outside_time_window' });
  }
  expect(send).not.toHaveBeenCalled();
});
