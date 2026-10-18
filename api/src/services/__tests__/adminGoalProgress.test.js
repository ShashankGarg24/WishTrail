jest.mock('../../config/observability', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../../models/extended/GoalDetails', () => ({ findOne: jest.fn() }));
jest.mock('../pgGoalService', () => ({ getGoalById: jest.fn(), getGoalsByIds: jest.fn() }));
jest.mock('../pgHabitService', () => ({ getHabitById: jest.fn() }));
jest.mock('../pgHabitLogService', () => ({}));
const GoalDetails = require('../../models/extended/GoalDetails');
const goals = require('../pgGoalService');
const habits = require('../pgHabitService');
const { computeGoalProgress } = require('../goalDivisionService');

beforeEach(() => jest.clearAllMocks());

test('admin reuses read-only extended details for real weighted progress without the legacy isActive lookup', async () => {
  goals.getGoalById.mockResolvedValue({ id: 9, user_id: 7, completed_at: null });
  goals.getGoalsByIds.mockResolvedValue([{ id: 10, user_id: 7, completed_at: '2026-01-01' }]);
  habits.getHabitById.mockResolvedValue({ targetDays: 10, totalDays: 5 });
  const result = await computeGoalProgress(9, 7, { details: { progress: { breakdown: {
    subGoals: [{ title: 'Part one', weight: 40, completed: false, linkedGoalId: 10 }],
    habits: [{ habitId: 3, weight: 60 }]
  } } } });
  expect(result.percent).toBe(70);
  expect(result.breakdown.subGoals[0].completed).toBe(true);
  expect(result.breakdown.habits[0]).toMatchObject({ ratio: 0.5, doneCount: 5, targetCount: 10, contribution: 30 });
  expect(GoalDetails.findOne).not.toHaveBeenCalled();
});

test('existing callers retain their lookup and ownership check; completed goals remain at 100%', async () => {
  goals.getGoalById.mockResolvedValue({ id: 9, user_id: 7, completed_at: '2026-01-01' });
  GoalDetails.findOne.mockReturnValue({ lean: async () => null });
  expect((await computeGoalProgress(9, 7)).percent).toBe(100);
  expect(GoalDetails.findOne).toHaveBeenCalledWith({ goalId: 9, isActive: true });
  await expect(computeGoalProgress(9, 8, { details: null })).rejects.toMatchObject({ statusCode: 403 });
});
