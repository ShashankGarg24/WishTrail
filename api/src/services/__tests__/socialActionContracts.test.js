jest.mock('../../config/observability', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../config/supabase', () => ({ query: jest.fn(), transaction: jest.fn() }));

const db = require('../../config/supabase');
const likes = require('../pgLikeService');
const follows = require('../pgFollowService');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

beforeEach(() => jest.clearAllMocks());

test('unlike is serialized and returns the unliked action', async () => {
  const row = { id: 1, user_id: 10, target_type: 'goal', target_id: '9' };
  const client = { query: jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [row] })
    .mockResolvedValueOnce({ rows: [row] }) };
  db.transaction.mockImplementation(work => work(client));
  const result = await likes.toggleLike({ userId: 10, targetType: 'goal', targetId: '9' });
  expect(result.action).toBe('unliked');
  expect(client.query.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
  expect(client.query.mock.calls[0][1]).toEqual(['like:10:goal:9']);
  expect(client.query.mock.calls[2][0]).toContain('DELETE FROM likes');
});

test('repeated follow preserves an existing accepted relationship without deleting it', async () => {
  const row = { follower_id: 10, following_id: 7, status: 'accepted' };
  const client = { query: jest.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [row] }) };
  db.transaction.mockImplementation(work => work(client));
  expect((await follows.followUser(10, 7, { status: 'pending' })).status).toBe('accepted');
  expect(client.query).toHaveBeenCalledTimes(2);
  expect(client.query.mock.calls[0][1]).toEqual(['follow:10:7']);
});

test('request rejection uses the same transaction lock as follow creation', async () => {
  const client = { query: jest.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 1 }) };
  db.transaction.mockImplementation(work => work(client));
  expect(await follows.rejectFollowRequest(10, 7)).toBe(true);
  expect(client.query.mock.calls[0][1]).toEqual(['follow:10:7']);
  expect(client.query.mock.calls[1][0]).toContain("status = 'pending'");
});

// Exercise the actual handler without loading unrelated controllers' production
// database/cloud clients. Dependencies are injected into its lexical environment.
function goalHandler(dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '../../controllers/goalController.js'), 'utf8');
  const start = source.indexOf('const toggleGoalLike =');
  const end = source.indexOf('// @desc    Get user\'s yearly goals summary', start);
  return vm.runInNewContext(`${source.slice(start, end)}; toggleGoalLike`, dependencies);
}

test.each([true, false])('goal action uses the service contract and synchronizes when isLiked=%s', async isLiked => {
  const pgLikeService = { toggleLike: jest.fn(), hasUserLiked: jest.fn(async () => isLiked), getLikeCount: jest.fn(async () => Number(isLiked)) };
  const notification = { createGoalLikeNotification: jest.fn(async () => {}) };
  const handler = goalHandler({
    pgLikeService,
    pgGoalService: { getGoalById: async () => ({ id: 9, user_id: 7 }) },
    require: name => name.endsWith('socialNotificationLifecycle') ? { safely: work => work() } : notification
  });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await handler({ params: { id: '9' }, user: { id: 10 } }, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(pgLikeService.toggleLike).toHaveBeenCalledWith({ userId: 10, targetType: 'goal', targetId: '9' });
  expect(notification.createGoalLikeNotification).toHaveBeenCalledWith(10, 9, 7);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { isLiked, likeCount: Number(isLiked) } });
});
