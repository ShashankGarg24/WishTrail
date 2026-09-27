jest.mock('../services/pgUserService', () => ({}));
jest.mock('../services/pgBlockService', () => ({}));
jest.mock('../models/extended/UserPreferences', () => ({ findOne: jest.fn() }));

const preferences = require('../models/extended/UserPreferences');
const { getNotificationSettings } = require('./settingsController');

test('an account without saved preferences receives defaults instead of a server error', async () => {
  preferences.findOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await getNotificationSettings({ user: { id: 315 } }, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: expect.objectContaining({
      preferences: {},
      notifications: expect.objectContaining({ inApp: expect.objectContaining({ enabled: true }) })
    })
  }));
});
