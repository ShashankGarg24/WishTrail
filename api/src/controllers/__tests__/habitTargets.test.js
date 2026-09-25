// Exercise the mounted habit routes and real SQL mapping without external databases.
jest.mock('../../config/supabase', () => ({ query: jest.fn() }));
jest.mock('../../config/observability', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../middleware/auth', () => ({
  protect: (req, res, next) => { req.user = { id: 7 }; next(); }
}));
jest.mock('../../services/habitService', () => ({}));
jest.mock('../../services/pgHabitLogService', () => ({}));
jest.mock('../../services/pgGoalService', () => ({ getGoalById: jest.fn() }));
jest.mock('../../services/pgUserService', () => ({ getUserById: jest.fn() }));
jest.mock('../../services/pgFollowService', () => ({}));
jest.mock('../../models/extended/UserPreferences', () => ({}));
jest.mock('../../models/extended/GoalDetails', () => ({
  findOne: jest.fn(), findOneAndUpdate: jest.fn()
}));
jest.mock('../../models/Activity', () => ({}));
jest.mock('../../utility/premiumEnforcement', () => ({
  validateHabitCreation: jest.fn().mockResolvedValue({ allowed: true }),
  handleValidationResponse: jest.fn().mockReturnValue(null)
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../config/supabase');
const GoalDetails = require('../../models/extended/GoalDetails');
const pgGoalService = require('../../services/pgGoalService');
const { computeGoalProgress, setHabitLinks } = require('../../services/goalDivisionService');

const app = express();
app.use(express.json());
app.use('/habits', require('../../routes/habitRoutes'));
app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));

beforeEach(() => {
  jest.clearAllMocks();
  query.mockReset();
  pgGoalService.getGoalById.mockResolvedValue({ id: 12, user_id: 7 });
  GoalDetails.findOneAndUpdate.mockResolvedValue({});
});

describe('habit target persistence', () => {
  test.each([
    [{ targetCompletions: 100 }, 100, null],
    [{ targetDays: 30 }, null, 30],
    [{}, null, null]
  ])('POST /habits persists and returns targets %j', async (targets, count, days) => {
    query.mockImplementation(async (sql, values) => {
      expect(sql).toContain('INSERT INTO habits');
      expect(sql).not.toMatch(/\btimezone\b/);
      expect(values[6]).toBe(count);
      expect(values[7]).toBe(days);
      return { rows: [{ id: 5, user_id: values[0], name: values[1],
        target_completions: values[6], target_days: values[7] }] };
    });
    const response = await request(app).post('/habits').send({ name: 'Read', timezone: 'America/New_York', ...targets });
    expect(response.status).toBe(201);
    expect(query).toHaveBeenCalledTimes(1);
    expect(response.body.data.habit).toMatchObject({ targetCompletions: count, targetDays: days });
  });

  test.each([
    [100, null], [null, 30], [null, null]
  ])('PUT /habits persists targets %s / %s, including clearing them', async (count, days) => {
    query.mockImplementation(async (sql, values) => {
      expect(sql).toContain('target_completions = $1');
      expect(sql).toContain('target_days = $2');
      expect(sql).toContain('WHERE id = $3 AND user_id = $4');
      expect(values).toEqual([count, days, 5, 7]);
      expect(sql).not.toMatch(/\btimezone\b/);
      return { rows: [{ id: 5, user_id: 7, target_completions: values[0], target_days: values[1] }] };
    });
    const response = await request(app).put('/habits/5').send({ targetCompletions: count, targetDays: days, timezone: 'America/New_York' });
    expect(response.status).toBe(200);
    expect(response.body.data.habit).toMatchObject({ targetCompletions: count, targetDays: days });
  });
});

describe('linked habit targets', () => {
  function seedHabit(row) {
    query.mockResolvedValue({ rows: row ? [{ id: 5, user_id: 7, name: 'Read', ...row }] : [] });
    const details = { progress: { breakdown: { subGoals: [], habits: [{ habitId: 5, weight: 100 }] } } };
    // Support both awaited findOne and findOne().lean() call sites.
    GoalDetails.findOne.mockImplementation(() => Object.assign(Promise.resolve(details), {
      lean: () => Promise.resolve(details)
    }));
  }

  test.each([
    [{ target_completions: 20, total_completions: 5 }, 25, 20, 5],
    [{ target_days: 10, total_days: 4, total_completions: 30 }, 40, 10, 4],
    [{ target_completions: 20, total_completions: 25 }, 100, 20, 25]
  ])('calculates progress from stored targets %j', async (row, percent, targetCount, doneCount) => {
    seedHabit(row);
    const result = await computeGoalProgress(12, 7);
    expect(result.percent).toBe(percent);
    expect(result.breakdown.habits[0]).toMatchObject({ targetCount, doneCount, contribution: percent });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND h.user_id = $2'), [5, 7]);
  });

  test.each([{ target_completions: 20 }, { target_days: 10 }])('allows linking a habit with target %j', async row => {
    seedHabit(row);
    const result = await setHabitLinks(12, 7, [{ habitId: 5, weight: 100 }]);
    expect(result.habitLinks).toEqual([{ habitId: 5, weight: 100 }]);
    expect(GoalDetails.findOneAndUpdate).toHaveBeenCalledWith(
      { goalId: 12 },
      { $set: { 'progress.breakdown.habits': [{ habitId: 5, weight: 100, endDate: undefined }],
        'progress.lastCalculated': expect.any(Date) } },
      { upsert: true }
    );
  });

  test('rejects linking a habit without a target', async () => {
    seedHabit({ target_completions: null, target_days: null });
    await expect(setHabitLinks(12, 7, [{ habitId: 5, weight: 100 }])).rejects.toMatchObject({ statusCode: 400 });
    expect(GoalDetails.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('does not count an inaccessible or missing habit toward progress', async () => {
    seedHabit(null);
    expect((await computeGoalProgress(12, 7)).percent).toBe(0);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('AND h.user_id = $2'), [5, 7]);
  });
});
