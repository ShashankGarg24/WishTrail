// Runs only against an ephemeral in-memory PostgreSQL engine with fixture records.
// No application database connection or migration is used.
const assert = require("node:assert/strict");
const path = require("node:path");
const { PGlite } = require(
  path.join(
    process.env.WT_ADMIN_TEST_TOOLS,
    "node_modules/@electric-sql/pglite",
  ),
);
const stub = (name, value) => {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports: value };
};
const chain = (rows) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => rows,
});

(async () => {
  const db = new PGlite();
  try {
    // Existing production column names, with a minimal fixture schema for real SQL evaluation.
    await db.exec(`
      SET TIME ZONE 'Asia/Kolkata';
      CREATE TABLE users (id bigint PRIMARY KEY, name text, username text, email text, is_active boolean,
        is_verified boolean, premium_expires_at timestamptz, total_goals int, completed_goals int,
        last_seen_update_version text, created_at timestamptz, updated_at timestamptz, last_active_at timestamptz,
        refresh_token_web text, refresh_token_app text);
      CREATE TABLE goals (id bigint PRIMARY KEY, user_id bigint, title text, category text, year int,
        completed_at timestamptz, target_date timestamptz, is_public boolean, is_updates_public boolean,
        created_at timestamptz, updated_at timestamptz);
      CREATE TABLE habits (id bigint PRIMARY KEY, user_id bigint, name text, description text, category text,
        frequency text, days_of_week int[], target_type text, target_value numeric, target_unit text,
        daily_target_count int, target_days int, current_streak int, longest_streak int, max_streak int,
        is_public boolean, is_active boolean, created_at timestamptz);
      CREATE TABLE goal_updates (id bigint, goal_id bigint, user_id bigint, text text, emotion text,
        date_key date, created_at timestamptz);
      CREATE TABLE habit_logs (id bigint, habit_id bigint, user_id bigint, date_key date,
        occurred_at timestamptz, status text, value numeric, note text, completion_count int);
      INSERT INTO users VALUES
        (7, 'Zoe', 'zoe', 'zoe@example.test', true, true, null, 2, 1, '1.0', '2026-01-01T23:59:00Z', NOW(), NOW(), 'web', 'app'),
        (8, 'Alex', 'alex', 'alex@example.test', true, false, null, 1, 0, null, '2026-01-02T00:01:00Z', NOW(), '2025-01-01', 'web', 'app');
      INSERT INTO goals VALUES
        (1, 7, 'Walk', 'HEALTH_FITNESS', 2026, NULL, NULL, true, true, '2026-01-01T10:00:00Z', NOW()),
        (2, 7, 'Read', 'EDUCATION_LEARNING', 2026, NOW(), NULL, false, false, '2026-01-01T11:00:00Z', NOW()),
        (3, 8, 'Learn', 'EDUCATION_LEARNING', 2026, NULL, NULL, false, false, '2026-01-01T12:00:00Z', NOW());
      INSERT INTO habits (id,user_id,name,frequency,days_of_week,target_type,current_streak,longest_streak,max_streak,is_active,created_at)
        VALUES (1,7,'Walk','daily',NULL,'count',3,0,8,true,NOW()),
               (2,8,'Read','custom',ARRAY[1,3,5],'count',0,0,0,false,NOW());
      INSERT INTO goal_updates VALUES (1,1,7,'Real progress','happy','2026-01-01','2026-01-01T23:59:00Z');
      INSERT INTO habit_logs VALUES (1,1,7,'2026-01-02','2026-01-02T00:01:00Z','done',1,'',2);
    `);
    const query = (sql, params) => db.query(sql, params);
    stub("../src/config/supabase", { query });
    stub("../src/services/emailService", {});
    stub("../src/models/DailyLogsEntry", {
      aggregate: async () => [],
      find: () => chain([]),
    });
    stub("../src/models/extended/UserPreferences", {
      find: (filter) =>
        chain(
          filter["notifications.email.enabled"] === false
            ? [{ userId: 8 }]
            : [],
        ),
      findOne: () => chain({ notifications: { email: { enabled: false } } }),
    });
    stub("../src/models/Report", { countDocuments: async () => 2 });
    stub("../src/models/Activity", {});
    stub("../src/models/extended/GoalDetails", {
      findOne: () => chain({ description: "Description" }),
    });
    stub("../src/services/goalDivisionService", {
      computeGoalProgress: async () => ({
        percent: 30,
        breakdown: { subGoals: [], habits: [] },
      }),
    });
    stub("../src/services/pgUserService", {});
    const lists = require("../src/services/adminService");
    const operations = require("../src/services/adminOperationsService");
    let users = await lists.getUsers({
      sortBy: "name",
      sortOrder: "asc",
      page: 1,
      limit: 1,
    });
    assert.equal(users.users[0].username, "alex");
    assert.equal(users.pagination.total, 2);
    users = await lists.getUsers({
      search: "Zoe",
      emailNotifications: "enabled",
    });
    assert.equal(users.users[0].username, "zoe");
    users = await lists.getUsers({ emailNotifications: "disabled" });
    assert.equal(users.users[0].username, "alex");
    const goals = await lists.getGoals({ userId: "7", status: "completed" });
    assert.equal(goals.pagination.total, 1);
    assert.equal(goals.goals[0].title, "Read");
    const habits = await lists.getHabits({ userId: 7, status: "inactive" });
    assert.equal(habits.pagination.total, 1);
    assert.equal(habits.habits[0].bestStreak, 8);
    assert.equal(habits.habits[0].status, "Inactive");
    assert.equal(habits.habits[0].isArchived, false);
    const noLogs = await lists.getHabits({ userId: 8, status: "inactive" });
    assert.equal(noLogs.habits[0].lastLogAt, null);
    assert.equal(noLogs.habits[0].isArchived, true);
    const overview = await operations.getOverview({
      start: "2026-01-01",
      end: "2026-01-02",
    });
    assert.equal(overview.metrics.newUsers, 2);
    assert.deepEqual(overview.daily, [
      { day: "2026-01-01", users: 1, progress: 1, logs: 0 },
      { day: "2026-01-02", users: 1, progress: 0, logs: 1 },
    ]);
    assert.equal(
      (await operations.getUser(7)).user.emailNotificationsEnabled,
      false,
    );
    assert.equal((await operations.getGoal(1)).progress.percent, 30);
    const habitDetail = await operations.getHabit(1);
    assert.equal(habitDetail.recentLogs.length, 1);
    assert.equal(habitDetail.habit.is_archived, false);
    await operations.setUserStatus(7, false);
    let row = (await db.query("SELECT * FROM users WHERE id=7")).rows[0];
    assert.equal(row.is_active, false);
    assert.equal(row.refresh_token_web, null);
    assert.equal(row.refresh_token_app, null);
    await operations.setUserStatus(7, true);
    row = (await db.query("SELECT * FROM users WHERE id=7")).rows[0];
    assert.equal(row.is_active, true);
    assert.equal(row.refresh_token_web, null);
    assert.equal(
      (await db.query("SELECT COUNT(*)::int AS count FROM goals")).rows[0]
        .count,
      3,
    );
    console.log(
      "PASS: real PostgreSQL queries, timezone boundaries, filters/sorting/counts, details, deactivation/reactivation; no live database used.",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
