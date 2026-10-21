jest.mock('../../config/observability', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../config/supabase', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../../services/goalService', () => ({}));
jest.mock('../../services/pgGoalService', () => ({ getGoalById: jest.fn() }));
jest.mock('../../services/pgUserService', () => ({ getUserById: jest.fn() }));
jest.mock('../../services/pgBlockService', () => ({ getBlockedUserIds: jest.fn(), getBlockerUserIds: jest.fn() }));
jest.mock('../../services/pgLikeService', () => ({}));
jest.mock('../../services/pgHabitService', () => ({}));
jest.mock('../../services/pgGoalUpdateService', () => ({ listGoalUpdates: jest.fn() }));
jest.mock('../../services/goalHealthService', () => ({}));
jest.mock('../../services/goalMetricsService', () => ({}));
jest.mock('../../services/goalDivisionService', () => ({}));
jest.mock('../../models/extended/GoalDetails', () => ({ findOne: jest.fn() }));
jest.mock('../../models/Activity', () => ({ findOne: jest.fn() }));
jest.mock('../../models/ActivityComment', () => ({}));
jest.mock('../../models/Notification', () => ({}));
jest.mock('canvas', () => ({}));

const controller = require('../goalController');
const goals = require('../../services/pgGoalService');
const users = require('../../services/pgUserService');
const blocks = require('../../services/pgBlockService');
const updates = require('../../services/pgGoalUpdateService');
const details = require('../../models/extended/GoalDetails');
const Activity = require('../../models/Activity');

beforeEach(() => {
  jest.clearAllMocks();
  goals.getGoalById.mockResolvedValue({ id: 9, user_id: '7', is_public: true, is_updates_public: false });
  users.getUserById.mockResolvedValue({ is_active: true });
  blocks.getBlockedUserIds.mockResolvedValue([]);
  blocks.getBlockerUserIds.mockResolvedValue([]);
  details.findOne.mockReturnValue({ lean: async () => ({ progress: { breakdown: { subGoals: [{ title: 'Private milestone' }] } } }) });
  Activity.findOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
  updates.listGoalUpdates.mockResolvedValue({ updates: [], hasMore: false });
});

async function invoke(handler, viewerId = 8) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await handler({ params: { id: '9' }, user: { id: viewerId }, query: {} }, res, next);
  expect(next).not.toHaveBeenCalled();
  return res;
}

test.each(['getGoalTimeline', 'getGoalUpdates', 'getGoalAnalytics'])('%s denies private update content on a public goal', async name => {
  expect((await invoke(controller[name])).status).toHaveBeenCalledWith(403);
  expect(updates.listGoalUpdates).not.toHaveBeenCalled();
});

test('post response exposes permissions and omits private milestones', async () => {
  const res = await invoke(controller.getGoalPost);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json.mock.calls[0][0].data).toMatchObject({
    permissions: { canViewGoal: true, canViewTimeline: false, canViewUpdates: false },
    goal: { subGoals: [] }
  });
});

test('owner can read private updates despite differing ID types', async () => {
  expect((await invoke(controller.getGoalUpdates, 7)).status).toHaveBeenCalledWith(200);
  expect(updates.listGoalUpdates).toHaveBeenCalledWith(9, '7', { limit: 10, offset: 0 });
});

test('blocked viewer cannot load a public goal post', async () => {
  blocks.getBlockerUserIds.mockResolvedValue([7]);
  expect((await invoke(controller.getGoalPost)).status).toHaveBeenCalledWith(403);
});
