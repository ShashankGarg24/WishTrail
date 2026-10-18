jest.mock('../../models/Config', () => ({ getValue: jest.fn() }));
jest.mock('../../config/supabase', () => ({ query: jest.fn() }));
jest.mock('../emailService', () => ({}));
jest.mock('../productUpdateService', () => ({}));
jest.mock('../../models/extended/UserPreferences', () => ({}));
jest.mock('../pgUserService', () => ({ getUserById: jest.fn() }));
jest.mock('../../config/observability', () => ({ logger: { error: jest.fn() } }));
const Config = require('../../models/Config');
const { resolvePromotion, getActivePromotion } = require('../activePromotionService');
const now = Date.parse('2026-10-18T12:00:00Z');
const free = { id: 1, premium_expires_at: null };
const premium = { id: 2, premium_expires_at: '2027-01-01T00:00:00Z' };
const base = {
  enabled: true, title: 'Keep growing', subtitle: 'A little more support',
  offerCopy: 'An offer', ctaLabel: 'Explore', ctaUrl: '/premium',
  audience: 'all', surface: 'announcement_card', startAt: '', endAt: '',
};
beforeEach(() => { jest.useFakeTimers().setSystemTime(now); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());

test.each([
  ['disabled', { enabled: false }],
  ['future', { startAt: '2026-10-18T12:00:01Z' }],
  ['expired', { endAt: '2026-10-18T11:59:59Z' }],
  ['end boundary', { endAt: '2026-10-18T12:00:00Z' }],
  ['unsupported surface', { surface: 'banner' }],
  ['unsupported audience', { audience: 'everyone' }],
  ['invalid date', { startAt: 'bad' }],
  ['non-string date', { startAt: 0 }],
  ['reversed window', { startAt: '2026-10-18T12:00:00Z', endAt: '2026-10-17T12:00:00Z' }],
  ['missing title', { title: '' }],
  ['malformed title', { title: {} }],
  ['oversized title', { title: 'x'.repeat(121) }],
  ['unsafe CTA', { ctaUrl: 'javascript:alert(1)' }],
  ['external CTA', { ctaUrl: 'https://example.com' }],
  ['protocol relative CTA', { ctaUrl: '//evil.test' }],
  ['credential CTA', { ctaUrl: 'https://user:pass@wishtrail.in/premium' }],
  ['missing required CTA label', { ctaLabel: '' }],
  ['missing required CTA', { ctaUrl: '' }],
])('%s resolves to null', (_label, change) => {
  expect(resolvePromotion({ ...base, ...change }, free, now)).toBeNull();
});

test('absent/malformed data or absent user is safe', () => {
  for (const value of [null, undefined, {}, [], 'bad']) expect(resolvePromotion(value, free)).toBeNull();
  expect(resolvePromotion(base, null)).toBeNull();
});

test('all users and exact start boundary return only sanitized rendering fields', () => {
  const value = { ...base, title: '<b>Keep growing</b>', startAt: new Date(now).toISOString(), privateMetadata: 'secret' };
  for (const user of [free, premium]) {
    expect(resolvePromotion(value, user, now)).toEqual({
      id: expect.stringMatching(/^[a-f0-9]{64}$/), surface: 'announcement_card',
      title: 'Keep growing', subtitle: base.subtitle, offerCopy: base.offerCopy,
      ctaLabel: 'Explore', ctaUrl: 'https://wishtrail.in/premium',
    });
  }
});

test.each(['free', 'premium'])('%s audience uses database expiration', audience => {
  const value = { ...base, audience };
  expect(Boolean(resolvePromotion(value, free))).toBe(audience === 'free');
  expect(Boolean(resolvePromotion(value, premium))).toBe(audience === 'premium');
  expect(Boolean(resolvePromotion(value, { ...free, isPremium: true }))).toBe(audience === 'free');
  expect(Boolean(resolvePromotion(value, { ...premium, premium_expires_at: new Date(now).toISOString() }))).toBe(audience === 'free');
});

test('identity is stable and changes with content or schedule, excluding admin metadata', () => {
  const original = resolvePromotion(base, free);
  expect(resolvePromotion({ ...base, updatedBy: 'admin' }, free).id).toBe(original.id);
  for (const change of [{ title: 'New offer' }, { endAt: '2026-11-01T00:00:00Z' }, { audience: 'free' }]) {
    expect(resolvePromotion({ ...base, ...change }, free).id).not.toBe(original.id);
  }
});

test('service reads existing Config key without persistence writes', async () => {
  Config.getValue.mockResolvedValue(base);
  expect(await getActivePromotion(free)).toEqual(resolvePromotion(base, free));
  expect(Config.getValue).toHaveBeenCalledWith('promotion', null);
});

test('product endpoint requires user auth and does not expose raw config or accept client premium', async () => {
  const express = require('express');
  const request = require('supertest');
  const jwt = require('jsonwebtoken');
  const users = require('../pgUserService');
  process.env.JWT_SECRET = 'promotion-test-secret';
  const app = express();
  app.use('/config', require('../../routes/configRoutes'));
  app.use((error, req, res, next) => res.status(500).json({ success: false }));
  Config.getValue.mockResolvedValue({ ...base, audience: 'premium', privateMetadata: 'secret' });
  users.getUserById.mockResolvedValue({ ...free, is_active: true });
  const token = jwt.sign({ userId: free.id }, process.env.JWT_SECRET);
  expect((await request(app).get('/config/active-promotion')).status).toBe(401);
  const ineligible = await request(app).get('/config/active-promotion?isPremium=true').set('Authorization', `Bearer ${token}`);
  expect(ineligible.status).toBe(200);
  expect(ineligible.body).toEqual({ success: true, data: { promotion: null } });
  users.getUserById.mockResolvedValue({ ...premium, is_active: true });
  const eligible = await request(app).get('/config/active-promotion').set('Authorization', `Bearer ${token}`);
  expect(eligible.status).toBe(200);
  expect(eligible.headers['cache-control']).toBe('private, no-store');
  expect(eligible.body).toEqual({ success: true, data: { promotion: resolvePromotion({ ...base, audience: 'premium' }, premium) } });
  expect(JSON.stringify(eligible.body)).not.toMatch(/secret|audience|updatedBy|startAt|endAt/);
  Config.getValue.mockRejectedValue(new Error('database unavailable'));
  expect((await request(app).get('/config/active-promotion').set('Authorization', `Bearer ${token}`)).status).toBe(500);
});
