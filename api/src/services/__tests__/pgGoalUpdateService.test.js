jest.mock('../../config/supabase', () => ({
  query: jest.fn(),
  transaction: jest.fn()
}));

const { query } = require('../../config/supabase');
const pgGoalUpdateService = require('../pgGoalUpdateService');

describe('pgGoalUpdateService historical edits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updates only the requested log owned by the current user', async () => {
    query.mockResolvedValue({
      rows: [{ id: 7, goal_id: 11, user_id: 13, text: 'Corrected', emotion: 'good', date_key: '2026-10-01', created_at: '2026-10-01T12:00:00Z' }]
    });

    const result = await pgGoalUpdateService.updateGoalUpdate({
      goalId: 11,
      updateId: 7,
      userId: 13,
      text: 'Corrected',
      emotion: 'good'
    });

    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND goal_id = $2 AND user_id = $3'), [7, 11, 13, 'Corrected', 'good']);
    expect(result).toMatchObject({ id: 7, goalId: 11, userId: 13, text: 'Corrected', emotion: 'good', dateKey: '2026-10-01' });
  });

  test('returns null when the log is not owned by the user', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(pgGoalUpdateService.updateGoalUpdate({ goalId: 11, updateId: 7, userId: 99, text: 'Nope', emotion: null })).resolves.toBeNull();
  });

  test('deletes only the requested goal log owned by the current user', async () => {
    query.mockResolvedValue({ rows: [{ id: 7 }] });
    await expect(pgGoalUpdateService.deleteGoalUpdate({ goalId: 11, updateId: 7, userId: 13 })).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND goal_id = $2 AND user_id = $3'), [7, 11, 13]);
  });
});
