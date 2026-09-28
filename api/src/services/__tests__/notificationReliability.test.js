jest.mock('../../config/observability', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const policy = require('../notificationPolicy');
const { createRunner } = require('../scheduledNotificationService');

const clockAt = value => () => new Date(value);
function fixture({ now = '2026-09-27T08:00:00Z', timezone = 'UTC', prefs = {}, active = true, logs = [] } = {}) {
  const claims = new Set();
  const deps = {
    users: async () => [{ id: '7', timezone }], preferences: jest.fn(async () => prefs),
    activeDevice: jest.fn(async () => active),
    dailyLog: jest.fn(async (id, context) => logs.some(value => new Date(value) >= context.startUtc && new Date(value) < context.endUtc)),
    claim: jest.fn(async key => { const id = `${key.userId}:${key.notificationType}:${key.localDate}`; if (claims.has(id)) return null; claims.add(id); return { _id: id }; }),
    finish: jest.fn(), deliver: jest.fn(async () => ({ ok: true })), log: jest.fn()
  };
  return { deps, run: type => createRunner(deps)(type, async () => ({ title: 'Test', message: 'Test' }), clockAt(now)) };
}

test.each([
  ['07:59', false], ['08:00', true], ['10:29', true], ['10:30', false], ['16:00', false]
])('motivation eligibility at %s UTC is %s', async (time, eligible) => {
  const f = fixture({ now: `2026-09-27T${time}:00Z` });
  await f.run('motivation_quote');
  expect(f.deps.deliver).toHaveBeenCalledTimes(eligible ? 1 : 0);
});
test.each([['19:59', false], ['20:00', true], ['21:59', true], ['22:00', false]])('journal eligibility at %s UTC is %s', async (time, eligible) => {
  const f = fixture({ now: `2026-09-27T${time}:00Z` });
  await f.run('daily_logs_prompt');
  expect(f.deps.deliver).toHaveBeenCalledTimes(eligible ? 1 : 0);
});
test('today local log suppresses reminder before any claim or visible notification', async () => {
  const f = fixture({ now: '2026-09-27T15:00:00Z', timezone: 'Asia/Kolkata', logs: ['2026-09-26T19:00:00Z'] });
  await f.run('daily_logs_prompt');
  expect(f.deps.claim).not.toHaveBeenCalled();
});
test('yesterday local log does not suppress today, even across UTC midnight', async () => {
  const f = fixture({ now: '2026-09-27T15:00:00Z', timezone: 'Asia/Kolkata', logs: ['2026-09-26T18:29:59Z'] });
  await f.run('daily_logs_prompt');
  expect(f.deps.deliver).toHaveBeenCalledTimes(1);
});
test('local calendar boundaries cross UTC midnight and remain half-open', () => {
  const context = policy.localContext('Asia/Kolkata', new Date('2026-09-27T15:00:00Z'));
  expect(context.startUtc.toISOString()).toBe('2026-09-26T18:30:00.000Z');
  expect(context.endUtc.toISOString()).toBe('2026-09-27T18:30:00.000Z');
});
test.each([['2026-03-08T20:00:00Z', 23], ['2026-11-01T20:00:00Z', 25]])('DST day %s has %s hours', (date, hours) => {
  const context = policy.localContext('America/New_York', new Date(date));
  expect((context.endUtc - context.startUtc) / 3600000).toBe(hours);
});
test.each([
  [{ notifications: { inApp: { motivationReminder: false } } }, 'preference_disabled'],
  [{ notifications: { inApp: { enabled: false } } }, 'master_disabled']
])('disabled preferences skip before claim', async (prefs, reason) => {
  const f = fixture({ prefs }); await f.run('motivation_quote');
  expect(f.deps.claim).not.toHaveBeenCalled();
  expect(f.deps.log).toHaveBeenCalledWith(expect.objectContaining({ skipReason: reason }));
});
test('no active mobile device means no claim and no reminder history', async () => {
  const f = fixture({ active: false }); await f.run('motivation_quote');
  expect(f.deps.claim).not.toHaveBeenCalled(); expect(f.deps.deliver).not.toHaveBeenCalled();
});
test('device registration later in the morning window remains eligible', async () => {
  const f = fixture({ now: '2026-09-27T08:30:00Z', active: false });
  await f.run('motivation_quote');
  expect(f.deps.claim).not.toHaveBeenCalled();
  f.deps.activeDevice.mockResolvedValue(true);
  await f.run('motivation_quote');
  expect(f.deps.claim).toHaveBeenCalledTimes(1);
  expect(f.deps.deliver).toHaveBeenCalledTimes(1);
});
test('Postgres string IDs normalize before Mongo preference lookup', async () => {
  const f = fixture(); await f.run('motivation_quote');
  expect(f.deps.preferences).toHaveBeenCalledWith(7);
  expect(() => policy.normalizeUserId('not-an-id')).toThrow();
});
test('duplicate concurrent workers use the persistent claim dependency, never Redis', async () => {
  const f = fixture(); await Promise.all(Array.from({ length: 15 }, () => f.run('motivation_quote')));
  expect(f.deps.deliver).toHaveBeenCalledTimes(1);
});
test('confirmed provider failure records retryability instead of marking sent', async () => {
  const f = fixture(); f.deps.deliver.mockResolvedValue({ ok: false, retryable: true, code: 'provider_transient' });
  const result = await f.run('motivation_quote');
  expect(result.failed).toBe(1);
  expect(f.deps.finish).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ok: false, retryable: true }), expect.any(Date));
});
test('a journal submitted during content generation is checked again before delivery', async () => {
  const f = fixture({ now: '2026-09-27T20:00:00Z' });
  f.deps.dailyLog.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await f.run('daily_logs_prompt');
  expect(f.deps.deliver).not.toHaveBeenCalled();
  expect(f.deps.finish).toHaveBeenCalledWith(expect.anything(), { ok: false, retryable: false, code: 'daily_log_exists' }, expect.any(Date));
});
