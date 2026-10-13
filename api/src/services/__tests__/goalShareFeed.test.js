jest.mock('../pgFollowService', () => ({ getFollowingIds: jest.fn().mockResolvedValue([]) }));
jest.mock('../pgLikeService', () => ({ hasUserLiked: jest.fn().mockResolvedValue(false), getLikeCount: jest.fn().mockResolvedValue(0) }));
jest.mock('../pgBlockService', () => ({ getBlockedUserIds: jest.fn().mockResolvedValue([]), getBlockerUserIds: jest.fn().mockResolvedValue([]) }));
jest.mock('../pgGoalService', () => ({ getGoalsByIds: jest.fn().mockResolvedValue([]) }));
jest.mock('../pgUserService', () => ({ getUsersByIds: jest.fn().mockResolvedValue([]) }));
jest.mock('../../models/ActivityComment', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../models/Activity', () => ({ find: jest.fn(), distinct: jest.fn(), countDocuments: jest.fn().mockResolvedValue(1) }));
jest.mock('../../models/extended/GoalDetails', () => ({ find: jest.fn() }));
jest.mock('../../models/Achievement', () => ({}));
const Activity = require('../../models/Activity');
const goals = require('../pgGoalService');
const follows = require('../pgFollowService');
const service = require('../activityService');
const post = { _id: 'share', userId: 2, name: 'Owner', type: 'goal_shared', isPublic: true, data: { goalId: 7, share: { title: 'Approved title', shareType: 'COMPLETION' } } };
beforeEach(() => {
  jest.clearAllMocks();
  follows.getFollowingIds.mockResolvedValue([]);
  Activity.distinct.mockResolvedValue([7]);
  const chain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), lean: async () => [post] };
  Activity.find.mockReturnValue(chain);
});
test('author sees their share without following anyone and snapshot is never goal-enriched', async () => {
  const result = await service.getActivityFeed(2);
  expect(result.activities[0].data).toEqual(post.data);
  expect(result.activities[0].user.id).toBe(2);
  expect(goals.getGoalsByIds).not.toHaveBeenCalled();
  expect(Activity.find.mock.calls[0][0].$or).toContainEqual({ userId: 2, type: 'goal_shared' });
});
test('suppresses matching system completions before pagination, using only visible rich shares', async () => {
  follows.getFollowingIds.mockResolvedValue([2]);
  await service.getActivityFeed(9, { page: 2, limit: 10 });
  expect(Activity.distinct.mock.calls[0][1].$or).toEqual([{ userId: 9 }, { userId: { $in: [2] }, isPublic: true }]);
  expect(Activity.find.mock.calls[0][0].$nor).toEqual([
    { 'data.goalId': { $in: [7] }, type: 'goal_completed' },
    { 'data.goalId': { $in: [7] }, type: 'goal_activity', 'data.lastUpdateType': 'completed' }
  ]);
  expect(Activity.find.mock.results[0].value.skip).toHaveBeenCalledWith(10);
});
test('does not hide system completions when no rich post is visible', async () => {
  Activity.distinct.mockResolvedValue([]);
  await service.getActivityFeed(9);
  expect(Activity.find.mock.calls[0][0].$nor).toBeUndefined();
});
