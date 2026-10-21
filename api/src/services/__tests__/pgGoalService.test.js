jest.mock('../../config/supabase', () => ({
  pool: {},
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn(),
}));

const { query } = require('../../config/supabase');
const pgGoalService = require('../pgGoalService');

describe('pgGoalService.createGoal update visibility', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [{ id: 1 }] });
  });

  it('stores updates as public when the setting is omitted', async () => {
    await pgGoalService.createGoal({
      userId: 12,
      title: 'Read more',
      category: 'Learning',
      year: 2026,
      targetDate: '2026-12-31',
      isPublic: true,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('is_updates_public'),
      [12, 'Read more', 'Learning', 2026, '2026-12-31', true, true]
    );
  });

  it('preserves an explicit private update setting', async () => {
    await pgGoalService.createGoal({
      userId: 12,
      title: 'Read more',
      category: 'Learning',
      year: 2026,
      targetDate: '2026-12-31',
      isPublic: true,
      isUpdatesPublic: false,
    });

    expect(query.mock.calls[0][1][6]).toBe(false);
  });
});
