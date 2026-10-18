jest.mock("../../config/supabase", () => ({ query: jest.fn() }));
jest.mock("../emailService", () => ({}));
jest.mock("../../models/DailyLogsEntry", () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));
jest.mock("../../models/extended/UserPreferences", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../../models/Report", () => ({
  countDocuments: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../../models/Activity", () => ({}));
jest.mock("../../models/extended/GoalDetails", () => ({ findOne: jest.fn() }));
jest.mock("../goalDivisionService", () => ({ computeGoalProgress: jest.fn() }));
jest.mock("../../config/redis", () => ({}));
jest.mock("../pgUserService", () => ({
  grantPremium: jest.fn(),
  revokePremium: jest.fn(),
}));
const { query } = require("../../config/supabase");
const Report = require("../../models/Report");
const service = require("../adminOperationsService");
const lists = require("../adminService");

test("goal detail reuses weighted progress without creating records and degrades safely if calculation fails", async () => {
  const GoalDetails = require("../../models/extended/GoalDetails");
  const division = require("../goalDivisionService");
  GoalDetails.findOne.mockReturnValue({
    select: () => ({
      lean: async () => ({ description: "Existing description" }),
    }),
  });
  query
    .mockResolvedValueOnce({ rows: [{ id: 9, user_id: 7 }] })
    .mockResolvedValueOnce({ rows: [] });
  division.computeGoalProgress.mockResolvedValue({
    percent: 45,
    breakdown: { subGoals: [], habits: [] },
  });
  const result = await service.getGoal(9);
  expect(result.progress.percent).toBe(45);
  expect(result.details.description).toBe("Existing description");
  expect(division.computeGoalProgress).toHaveBeenCalledWith(9, 7, { details: { description: "Existing description" } });
  query
    .mockResolvedValueOnce({ rows: [{ id: 9, user_id: 7 }] })
    .mockResolvedValueOnce({ rows: [] });
  division.computeGoalProgress.mockRejectedValue(new Error("Unavailable"));
  const fallback = await service.getGoal(9);
  expect(fallback.progress).toBeNull();
  expect(fallback.progressUnavailable).toBe(true);
});

beforeEach(() => jest.clearAllMocks());

test("date ranges reject invalid, reversed, future and excessive windows", () => {
  for (const range of [
    { start: "2026-02-30" },
    { start: "2026-02-02", end: "2026-02-01" },
    { start: "2020-01-01", end: "2026-01-01" },
    { end: "2999-01-01" },
  ]) {
    expect(() => service.dateRange(range)).toThrow();
  }
  expect(
    service.dateRange({ start: "2026-01-01", end: "2026-01-07" }).days,
  ).toBe(7);
});

test("actual login checks configured IP restrictions before issuing any token", async () => {
  const controller = require("../../controllers/adminController");
  const previous = process.env.ADMIN_ALLOWED_IPS;
  process.env.ADMIN_ALLOWED_IPS = "203.0.113.7";
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  try {
    await controller.login(
      { ip: "198.51.100.9", body: {} },
      response,
      jest.fn(),
    );
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Admin access denied for this IP",
    });
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ALLOWED_IPS;
    else process.env.ADMIN_ALLOWED_IPS = previous;
  }
});

test("record IDs reject partial integers and SQL payloads before querying", async () => {
  for (const id of ["1x", "1 OR 1=1", "-1", "0", "9007199254740992"]) {
    await expect(service.getGoal(id)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(lists.getHabits({ userId: id })).rejects.toMatchObject({
      statusCode: 400,
    });
  }
  expect(query).not.toHaveBeenCalled();
});

test("sorting is allowlisted and owner filters are applied to list and count", async () => {
  query.mockResolvedValue({ rows: [{ total: "0" }] });
  await lists.getGoals({
    userId: "7",
    sortBy: "title; DROP TABLE users",
    sortOrder: "asc; DROP",
  });
  const [list, count] = query.mock.calls;
  expect(list[0]).toContain("ORDER BY g.created_at DESC NULLS LAST, g.id DESC");
  expect(list[1]).toEqual(["", "%%", "all", 20, 0, 7]);
  expect(count[0]).toContain("g.user_id = $4");
  expect(count[1]).toEqual(["", "%%", "all", 7]);
});

test("habit activity filter and displayed state use the same recent-log definition", async () => {
  query
    .mockResolvedValueOnce({
      rows: [{ id: 1, recently_active: false, last_log_at: null }],
    })
    .mockResolvedValueOnce({ rows: [{ total: "1" }] });
  const result = await lists.getHabits({ status: "inactive" });
  expect(result.habits[0].status).toBe("Inactive");
  expect(query.mock.calls[0][0]).toContain("hl.last_log_at IS NULL");
  expect(query.mock.calls[0][0]).not.toContain(
    "COALESCE(hl.last_log_at::date, h.created_at",
  );
});

test("deactivation updates only account state and revokes refresh tokens", async () => {
  query.mockResolvedValue({ rows: [{ id: "7", is_active: false }] });
  await expect(service.setUserStatus("7", false)).resolves.toEqual({
    id: "7",
    accountActive: false,
  });
  expect(query.mock.calls[0][0]).toContain(
    "refresh_token_web = CASE WHEN $2 THEN refresh_token_web ELSE NULL END",
  );
  expect(query.mock.calls[0][1]).toEqual([7, false]);
  await expect(service.setUserStatus(7, "false")).rejects.toMatchObject({
    statusCode: 400,
  });
});

test("premium durations reject strings, fractions and out-of-range values", async () => {
  for (const months of ["1", 0, 1.5, 121])
    await expect(service.grantPremium(7, months)).rejects.toMatchObject({
      statusCode: 400,
    });
  expect(query).not.toHaveBeenCalled();
});

test("overview returns actual zero-filled series totals with no invented comparison", async () => {
  query
    .mockResolvedValueOnce({
      rows: [{ totalUsers: "10", activeToday: "2", newUsers: "1" }],
    })
    .mockResolvedValueOnce({
      rows: [{ totalGoals: "8", activeGoals: "5", completedGoals: "3" }],
    })
    .mockResolvedValueOnce({ rows: [{ totalHabits: "6" }] })
    .mockResolvedValueOnce({
      rows: [
        { day: "2026-01-01", users: 1, progress: 2, logs: 4 },
        { day: "2026-01-02", users: 0, progress: 0, logs: 0 },
      ],
    });
  Report.countDocuments.mockResolvedValue(3);
  const result = await service.getOverview({
    start: "2026-01-01",
    end: "2026-01-02",
  });
  expect(result.metrics).toMatchObject({
    totalUsers: 10,
    recentGoalProgress: 2,
    recentHabitLogs: 4,
  });
  expect(result.timezone).toBe("UTC");
  expect(result.needsAttention.openReports).toBe(3);
  expect(query.mock.calls[3][0]).toContain("generate_series");
});

test("dismissal is limited to open/reviewing existing reports and rejects stale actions", async () => {
  Report.findOneAndUpdate.mockReturnValue({ lean: async () => null });
  await expect(service.dismissReport("a".repeat(24))).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(Report.findOneAndUpdate.mock.calls[0][0].status).toEqual({
    $in: ["open", "reviewing"],
  });
  await expect(service.dismissReport("invalid")).rejects.toMatchObject({
    statusCode: 400,
  });
});
