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
const jwt = require('jsonwebtoken');

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

test('app and web refresh tokens use their platform-specific lifetimes', () => {
  const previous = {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    app: process.env.JWT_REFRESH_EXPIRES_APP,
    web: process.env.JWT_REFRESH_EXPIRES_WEB
  };
  try {
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_REFRESH_EXPIRES_APP = '30d';
    process.env.JWT_REFRESH_EXPIRES_WEB = '7d';
    const app = jwt.decode(authService.generateTokens(7, 'app').refreshToken);
    const web = jwt.decode(authService.generateTokens(7, 'web').refreshToken);
    expect(app.exp - app.iat).toBe(30 * 86400);
    expect(web.exp - web.iat).toBe(7 * 86400);
  } finally {
    if (previous.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous.secret;
    if (previous.refreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET; else process.env.JWT_REFRESH_SECRET = previous.refreshSecret;
    if (previous.app === undefined) delete process.env.JWT_REFRESH_EXPIRES_APP; else process.env.JWT_REFRESH_EXPIRES_APP = previous.app;
    if (previous.web === undefined) delete process.env.JWT_REFRESH_EXPIRES_WEB; else process.env.JWT_REFRESH_EXPIRES_WEB = previous.web;
  }
});
