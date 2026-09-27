jest.mock('../../config/observability', () => ({ logger: { error: jest.fn() } }));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn() }));
jest.mock('../../models/extended/UserPreferences', () => ({}));
jest.mock('../../models/PasswordReset', () => ({}));
jest.mock('../../models/Otp', () => ({}));
jest.mock('../emailService', () => ({}));
jest.mock('../../utility/BloomFilterService', () => ({}));
jest.mock('../../utility/avatarGenerator', () => ({}));
jest.mock('../pgUserService', () => ({ getUserByEmail: jest.fn() }));
jest.mock('../pgFollowService', () => ({}));
jest.mock('../productUpdateService', () => ({}));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const authService = require('../authService');
const users = require('../pgUserService');
const bcrypt = require('bcryptjs');

beforeEach(() => jest.clearAllMocks());

test.each([null, { is_active: false }, { is_active: true, password: null }])(
  'missing, inactive and passwordless accounts reject with 401 (%j)', async user => {
    users.getUserByEmail.mockResolvedValue(user);
    await expect(authService.login('user@example.com', 'password', 'app')).rejects.toMatchObject({
      statusCode: 401, message: 'Invalid credentials'
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  }
);

test('incorrect passwords reject with 401', async () => {
  users.getUserByEmail.mockResolvedValue({ is_active: true, password: 'hash' });
  bcrypt.compare.mockResolvedValue(false);
  await expect(authService.login('user@example.com', 'wrong', 'app')).rejects.toMatchObject({ statusCode: 401 });
});
