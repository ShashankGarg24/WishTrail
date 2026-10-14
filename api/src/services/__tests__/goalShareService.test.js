jest.mock('../../config/supabase', () => ({ query: jest.fn() }));
jest.mock('../pgGoalService', () => ({ getGoalById: jest.fn() }));
jest.mock('../pgUserService', () => ({ getUserById: jest.fn() }));
jest.mock('../goalDivisionService', () => ({ computeGoalProgress: jest.fn() }));
jest.mock('../../models/extended/GoalDetails', () => ({ findOne: jest.fn() }));
jest.mock('../../models/Activity', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn(), findOneAndDelete: jest.fn(), createIndexes: jest.fn().mockResolvedValue() }));
jest.mock('../../models/ActivityComment', () => ({ find: jest.fn(() => ({ select: () => ({ lean: async () => [{ _id: 'comment' }] }) })), deleteMany: jest.fn() }));
jest.mock('../pgLikeService', () => ({ deleteLikesByTarget: jest.fn() }));
jest.mock('../../models/Notification', () => ({ updateMany: jest.fn() }));
jest.mock('../../models/CommunityActivity', () => ({ deleteMany: jest.fn() }));
jest.mock('../cacheService', () => ({ invalidateAllActivities: jest.fn(), invalidateUserActivities: jest.fn() }));
const service = require('../goalShareService');
const goals = require('../pgGoalService');
const users = require('../pgUserService');
const details = require('../../models/extended/GoalDetails');
const activity = require('../../models/Activity');
const { query } = require('../../config/supabase');
const division = require('../goalDivisionService');

beforeEach(() => {
  jest.clearAllMocks();
  goals.getGoalById.mockResolvedValue({ id: 7, user_id: 2, title: 'Private goal', category: 'OTHER', is_public: false, created_at: '2026-01-01', completed_at: '2026-10-12' });
  users.getUserById.mockResolvedValue({ id: 2, name: 'Owner', timezone: 'UTC' });
  details.findOne.mockReturnValue({ lean: async () => ({ completionNote: 'SECRET', completionFeeling: 'happy' }) });
  query.mockResolvedValue({ rows: [{ id: 1, date_key: '2026-01-02', text: 'SECRET LOG' }] });
  division.computeGoalProgress.mockResolvedValue({ percent: 100 });
  activity.findOne.mockReturnValue({ lean: async () => null });
  activity.findOneAndUpdate.mockResolvedValue({ _id: 'activity' });
});
const request = context => ({ shareType: 'COMPLETION', visibility: 'PUBLIC', revision: context.revision, requestId: 'test-request-000001', options: { template: 'JOURNEY', showStats: false } });

test('deletion is scoped atomically to the owner and clears dependent data and caches', async () => {
  const id = '012345678901234567890123';
  activity.findOneAndDelete.mockResolvedValue({ _id: id });
  await service.deleteShare(id, '2');
  expect(activity.findOneAndDelete).toHaveBeenCalledWith({ _id: id, userId: 2 });
  expect(require('../../models/ActivityComment').deleteMany).toHaveBeenCalledWith({ activityId: id });
  expect(require('../pgLikeService').deleteLikesByTarget).toHaveBeenCalledWith('activity', id);
  expect(require('../pgLikeService').deleteLikesByTarget).toHaveBeenCalledWith('activity_comment', 'comment');
  expect(require('../../models/CommunityActivity').deleteMany).toHaveBeenCalledWith({ sourceActivityId: id });
  expect(require('../cacheService').invalidateAllActivities).toHaveBeenCalled();
  expect(goals.getGoalById).not.toHaveBeenCalled();
});

test('missing posts and posts owned by another user cannot be deleted', async () => {
  activity.findOneAndDelete.mockResolvedValue(null);
  await expect(service.deleteShare('012345678901234567890123', 9)).rejects.toMatchObject({ statusCode: 404 });
  expect(require('../../models/ActivityComment').deleteMany).not.toHaveBeenCalled();
  await expect(service.deleteShare('invalid', 2)).rejects.toMatchObject({ statusCode: 400 });
  expect(activity.findOneAndDelete).toHaveBeenCalledTimes(1);
});

test('only the owner can build a context, including for public goals', async () => {
  await expect(service.getContext(7, 9)).rejects.toMatchObject({ statusCode: 403 });
  expect(query).not.toHaveBeenCalled();
  goals.getGoalById.mockResolvedValue(null);
  await expect(service.getContext(7, 2)).rejects.toMatchObject({ statusCode: 404 });
});
test('publishes an allowlisted snapshot of a private goal without changing source privacy', async () => {
  const context = await service.getContext(7, 2);
  await service.postShare(7, 2, { ...request(context), title: 'INJECTED', progress: 900, completionNote: 'SECRET' });
  const [key, update] = activity.findOneAndUpdate.mock.calls[0];
  expect(key).toEqual({ userId: 2, shareKey: 'completion:7' });
  expect(update.$set).toMatchObject({ type: 'goal_shared', isPublic: true, data: { goalId: 7, share: { title: 'Private goal', progress: 100 } } });
  expect(JSON.stringify(update)).not.toMatch(/SECRET|INJECTED|progressUpdateCount|activeDays/);
  expect(Object.keys(goals)).toEqual(['getGoalById']);
  expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
});
test('rejects stale previews and never silently substitutes changed content', async () => {
  const context = await service.getContext(7, 2);
  goals.getGoalById.mockResolvedValue({ id: 7, user_id: 2, title: 'Changed', created_at: '2026-01-01', completed_at: '2026-10-12' });
  await expect(service.postShare(7, 2, request(context))).rejects.toMatchObject({ statusCode: 409 });
  expect(activity.findOneAndUpdate).not.toHaveBeenCalled();
});
test('retry returns the existing post and completion uses a stable unique key', async () => {
  const context = await service.getContext(7, 2);
  const payload = request(context);
  await service.postShare(7, 2, payload);
  const previous = { _id: 'existing', ...activity.findOneAndUpdate.mock.calls[0][1].$set };
  activity.findOne.mockReturnValue({ lean: async () => previous });
  await expect(service.postShare(7, 2, payload)).resolves.toEqual(previous);
  expect(activity.findOneAndUpdate).toHaveBeenCalledTimes(1);
  await expect(service.postShare(7, 2, { ...payload, visibility: 'PRIVATE' })).rejects.toMatchObject({ statusCode: 409 });
});
