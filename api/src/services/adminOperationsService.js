const { query } = require("../config/supabase");
const adminService = require("./adminService");
const DailyLogsEntry = require("../models/DailyLogsEntry");
const UserPreferences = require("../models/extended/UserPreferences");
const Report = require("../models/Report");
const Activity = require("../models/Activity");
const GoalDetails = require("../models/extended/GoalDetails");
const pgUserService = require("./pgUserService");
const goalUpdates = require("./pgGoalUpdateService");
const { validId } = adminService;

const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};
const requireRow = (row) => row || fail("Record not found", 404);
const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});
const numericMetrics = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)]),
  );

const dateRange = ({ start, end } = {}) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 29 * 86400000)
    .toISOString()
    .slice(0, 10);
  const from = start || defaultStart;
  const to = end || today;
  for (const value of [from, to]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      fail("Invalid date range");
  }
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days < 1 || days > 90 || to > today)
    fail("Choose 1–90 days ending no later than today (UTC)");
  return { start: from, end: to, days };
};

const getOverview = async (params) => {
  const range = dateRange(params);
  const values = [range.start, range.end];
  const [users, goals, habits, series, attention] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS "totalUsers",
      COUNT(*) FILTER (WHERE last_active_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS "activeToday",
      COUNT(*) FILTER (WHERE created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date + 1)::timestamp AT TIME ZONE 'UTC')::int AS "newUsers"
      FROM users`,
      values,
    ),
    query(`SELECT COUNT(*)::int AS "totalGoals",
      COUNT(*) FILTER (WHERE completed_at IS NULL)::int AS "activeGoals",
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS "completedGoals" FROM goals`),
    query('SELECT COUNT(*)::int AS "totalHabits" FROM habits'),
    query(
      `WITH days AS (SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS day),
      signups AS (SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS count FROM users
        WHERE created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date + 1)::timestamp AT TIME ZONE 'UTC' GROUP BY 1),
      progress AS (SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS count FROM goal_updates
        WHERE created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date + 1)::timestamp AT TIME ZONE 'UTC' GROUP BY 1),
      logs AS (SELECT (occurred_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS count FROM habit_logs
        WHERE occurred_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND occurred_at < ($2::date + 1)::timestamp AT TIME ZONE 'UTC' GROUP BY 1)
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COALESCE(signups.count, 0) AS users,
        COALESCE(progress.count, 0) AS progress, COALESCE(logs.count, 0) AS logs
      FROM days LEFT JOIN signups USING(day) LEFT JOIN progress USING(day) LEFT JOIN logs USING(day) ORDER BY days.day`,
      values,
    ),
    Report.countDocuments({ status: { $in: ["open", "reviewing"] } }),
  ]);
  const daily = series.rows.map((row) => ({
    day: row.day,
    users: Number(row.users),
    progress: Number(row.progress),
    logs: Number(row.logs),
  }));
  return {
    range,
    refreshedAt: new Date().toISOString(),
    timezone: "UTC",
    metrics: {
      ...numericMetrics(users.rows[0]),
      ...numericMetrics(goals.rows[0]),
      ...numericMetrics(habits.rows[0]),
      recentGoalProgress: daily.reduce((total, row) => total + row.progress, 0),
      recentHabitLogs: daily.reduce((total, row) => total + row.logs, 0),
    },
    daily,
    needsAttention: { openReports: attention },
  };
};

const getUser = async (id) => {
  const userId = validId(id);
  const result = await query(
    `SELECT u.id, u.name, u.username, u.email, u.is_active, u.is_verified,
    u.premium_expires_at, u.created_at, u.last_active_at, u.last_seen_update_version,
    (SELECT COUNT(*)::int FROM goals WHERE user_id = u.id) AS total_goals,
    (SELECT COUNT(*)::int FROM goals WHERE user_id = u.id AND completed_at IS NOT NULL) AS completed_goals,
    (SELECT COUNT(*)::int FROM habits WHERE user_id = u.id) AS total_habits FROM users u WHERE u.id = $1`,
    [userId],
  );
  const user = requireRow(result.rows[0]);
  const [preference, dailyLogs, recentGoals, recentHabits] = await Promise.all([
    UserPreferences.findOne({ userId })
      .select("notifications.email.enabled")
      .lean(),
    DailyLogsEntry.find({ userId })
      .select("dayKey mood createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    query(
      "SELECT id, goal_id, text, emotion, date_key, created_at FROM goal_updates WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
      [userId],
    ),
    query(
      "SELECT id, habit_id, date_key, occurred_at, status, completion_count FROM habit_logs WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT 10",
      [userId],
    ),
  ]);
  return {
    user: adminService.formatUserRow(
      user,
      dailyLogs[0]?.updatedAt || null,
      preference?.notifications?.email?.enabled !== false,
    ),
    activity: {
      dailyLogs,
      goalUpdates: recentGoals.rows,
      habitLogs: recentHabits.rows,
    },
  };
};

const setUserStatus = async (id, active) => {
  if (typeof active !== "boolean") fail("active must be a boolean");
  // Clear refresh tokens on deactivation; protect/optionalAuth already check is_active.
  const result = await query(
    `UPDATE users SET is_active = $2,
    refresh_token_web = CASE WHEN $2 THEN refresh_token_web ELSE NULL END,
    refresh_token_app = CASE WHEN $2 THEN refresh_token_app ELSE NULL END,
    updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
    [validId(id), active],
  );
  requireRow(result.rows[0]);
  return { id: result.rows[0].id, accountActive: result.rows[0].is_active };
};

const grantPremium = async (id, months) => {
  const userId = validId(id);
  if (!Number.isInteger(months) || months < 1 || months > 120)
    fail("months must be an integer from 1 to 120");
  const found = await query(
    "SELECT id FROM users WHERE id = $1 AND is_active = true",
    [userId],
  );
  requireRow(found.rows[0]);
  const user = await pgUserService.grantPremium(userId, months);
  return { id: user.id, premiumExpiresAt: user.premium_expires_at };
};
const revokePremium = async (id) => {
  const user = requireRow(await pgUserService.revokePremium(validId(id)));
  return { id: user.id, premiumExpiresAt: user.premium_expires_at };
};

const getGoal = async (id) => {
  const result = await query(
    `SELECT g.id, g.user_id, g.title, g.category, g.year, g.completed_at, g.target_date,
    g.is_public, g.is_updates_public, g.created_at, g.updated_at, u.username AS owner_username,
    (SELECT COUNT(*)::int FROM goal_updates WHERE goal_id = g.id) AS update_count
    FROM goals g JOIN users u ON u.id = g.user_id WHERE g.id = $1`,
    [validId(id)],
  );
  const goal = requireRow(result.rows[0]);
  const [recent, details] = await Promise.all([
    goalUpdates.listGoalUpdates(goal.id, goal.user_id, { limit: 20 }),
    GoalDetails.findOne({ goalId: Number(goal.id) })
      .select("description completionNote completionFeeling progress.breakdown")
      .lean(),
  ]);
  let progress = null;
  let progressUnavailable = false;
  try {
    progress = await require("./goalDivisionService").computeGoalProgress(
      goal.id,
      goal.user_id,
      { details },
    );
  } catch {
    progressUnavailable = true;
  }
  return {
    goal,
    details,
    progress,
    progressUnavailable,
    recentUpdates: recent.updates,
    hasMoreUpdates: recent.hasMore,
  };
};

const getHabit = async (id) => {
  const result = await query(
    `SELECT h.id, h.user_id, h.name, h.description, h.category, h.frequency, h.days_of_week,
    h.daily_target_count, h.target_days, h.target_type, h.target_value, h.target_unit, h.current_streak,
    GREATEST(COALESCE(h.longest_streak, 0), COALESCE(h.max_streak, 0)) AS best_streak,
    h.is_public,
    COALESCE(
      (to_jsonb(h)->>'is_archived')::boolean,
      NOT COALESCE((to_jsonb(h)->>'is_active')::boolean, true),
      false
    ) AS is_archived,
    h.created_at, u.username AS owner_username,
    (SELECT COUNT(*)::int FROM habit_logs WHERE habit_id = h.id) AS total_logs,
    (SELECT MAX(occurred_at) FROM habit_logs WHERE habit_id = h.id) AS last_log_at
    FROM habits h JOIN users u ON u.id = h.user_id WHERE h.id = $1`,
    [validId(id)],
  );
  const habit = requireRow(result.rows[0]);
  const logs = await query(
    `SELECT id, date_key, occurred_at, status, value, note, completion_count
    FROM habit_logs WHERE habit_id = $1 ORDER BY occurred_at DESC LIMIT 20`,
    [habit.id],
  );
  return { habit, recentLogs: logs.rows };
};

const getReports = async ({ page = 1, limit = 20, status = "open" }) => {
  const pageNum = Math.max(1, Math.min(100000, Number.parseInt(page, 10) || 1));
  const limitNum = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
  if (!["all", "open", "reviewing", "resolved", "dismissed"].includes(status))
    fail("Invalid report status");
  const filter = status === "all" ? {} : { status };
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Report.countDocuments(filter),
  ]);
  const ids = [
    ...new Set(
      reports.flatMap((report) => [
        report.reporterId,
        ...(report.targetType === "user" ? [Number(report.targetId)] : []),
      ]),
    ),
  ].filter(Number.isSafeInteger);
  const users = ids.length
    ? await query(
        "SELECT id, username, name FROM users WHERE id = ANY($1::bigint[])",
        [ids],
      )
    : { rows: [] };
  const byId = Object.fromEntries(users.rows.map((user) => [user.id, user]));
  return {
    reports: reports.map((report) => ({
      ...report,
      reporter: byId[report.reporterId] || null,
      targetUser:
        report.targetType === "user" ? byId[report.targetId] || null : null,
    })),
    pagination: pagination(pageNum, limitNum, total),
  };
};

const reportId = (id) =>
  /^[a-f\d]{24}$/i.test(String(id)) ? id : fail("Invalid report ID");
const getReport = async (id) => {
  const report = requireRow(await Report.findById(reportId(id)).lean());
  let resource = null;
  if (
    report.targetType === "activity" &&
    /^[a-f\d]{24}$/i.test(String(report.targetId))
  ) {
    resource = await Activity.findById(report.targetId)
      .select(
        "userId username name type data.share data.goalId isPublic createdAt",
      )
      .lean();
  }
  if (
    report.targetType === "user" &&
    /^[1-9]\d*$/.test(String(report.targetId))
  ) {
    const users = await query(
      "SELECT id, username, name, is_active FROM users WHERE id = $1",
      [report.targetId],
    );
    resource = users.rows[0] || null;
  }
  return { report, resource };
};
const dismissReport = async (id) => {
  const report = await Report.findOneAndUpdate(
    { _id: reportId(id), status: { $in: ["open", "reviewing"] } },
    { $set: { status: "dismissed" } },
    { new: true },
  ).lean();
  if (!report)
    fail("Report is missing or already closed. Refresh the list.", 409);
  return { report };
};

module.exports = {
  dateRange,
  getOverview,
  getUser,
  setUserStatus,
  grantPremium,
  revokePremium,
  getGoal,
  getHabit,
  getReports,
  getReport,
  dismissReport,
};
