// Browser smoke test with synthetic API responses. It never contacts the live API.
// WT_ADMIN_TEST_TOOLS points to a temporary, external Playwright installation.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(
  path.join(process.env.WT_ADMIN_TEST_TOOLS, "node_modules/playwright"),
);
const origin = process.env.WT_ADMIN_TEST_ORIGIN || "http://127.0.0.1:5175";
let base = "/admin";
for (const file of [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
]) {
  const filename = path.join(__dirname, "..", file);
  if (fs.existsSync(filename)) {
    const value = fs
      .readFileSync(filename, "utf8")
      .match(/^VITE_ADMIN_UI_ROUTE\s*=\s*([^\r\n]*)/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, "");
    if (value) base = `/${value.replace(/^\/+|\/+$/g, "")}`;
  }
}
base = process.env.WT_ADMIN_UI_ROUTE || base;
const users = Array.from({ length: 25 }, (_, index) => ({
  id: String(index + 1),
  name: `Person ${String(index + 1).padStart(2, "0")}`,
  username: `person${index + 1}`,
  email: `person${index + 1}@example.test`,
  emailNotificationsEnabled: true,
  completedGoals: 2,
  totalGoals: 4,
  totalHabits: 3,
  createdAt: "2026-01-01T10:00:00Z",
  lastActiveAt: "2026-10-17T09:30:00Z",
  lastDailyUpdatedAt: "2026-10-17T10:00:00Z",
  accountActive: true,
  isVerified: true,
  premiumExpiresAt: index === 0 ? "2028-01-01T00:00:00Z" : null,
  lastUpdateSeen: "1.4.0",
}));
const goal = {
  id: "9",
  title: "Build a reading habit",
  category: "EDUCATION_LEARNING",
  completed: false,
  totalGoalUpdates: 12,
  lastGoalUpdateAt: "2026-10-17T10:00:00Z",
  isPublic: true,
  createdAt: "2026-01-01T10:00:00Z",
  user: { id: "1", username: "person1" },
};
const habit = {
  id: "6",
  name: "Read a chapter",
  frequency: "daily",
  daysOfWeek: null,
  status: "Active",
  totalLogs: 21,
  currentStreak: 7,
  bestStreak: 12,
  lastLogAt: "2026-10-17T10:00:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  user: { id: "1", username: "person1" },
};
const report = {
  _id: "a".repeat(24),
  reporterId: 2,
  targetType: "user",
  targetId: 1,
  reason: "spam",
  description: "Synthetic report for testing.",
  status: "open",
  createdAt: "2026-10-17T10:00:00Z",
  reporter: { username: "person2" },
  targetUser: { username: "person1" },
};
const release = {
  id: 1,
  version: "1.4.0",
  title: "A clearer journey",
  type: "feature",
  isMajor: true,
  description: "Synthetic release note.",
  createdAt: "2026-10-17T10:00:00Z",
};
let releaseDeleted = false;
let expireNextUsers = false;
let requests = [];
let mutations = [];
const pageData = (items, key, search) => {
  const page = Number(search.get("page") || 1),
    limit = Number(search.get("limit") || 20);
  return {
    [key]: items.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / limit)),
    },
  };
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", async (dialog) => {
      errors.push(`Unexpected native dialog: ${dialog.message()}`);
      await dialog.dismiss();
    });
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        pathname = url.pathname;
      const endpoint =
        pathname.split("/api/v1/")[1]?.split("/").slice(1).join("/") || "";
      const method = req.method();
      requests.push({ endpoint, method, search: url.search });
      let data = {};
      const json = (value, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(value),
        });
      if (pathname.includes("/config/"))
        return json({
          success: true,
          data: { isMaintenanceMode: false },
          isMaintenanceMode: false,
        });
      if (method !== "GET")
        mutations.push({ endpoint, method, body: req.postDataJSON() });
      if (endpoint === "login") data = { token: "synthetic-admin-session" };
      else if (endpoint === "overview") {
        const daily = Array.from({ length: 14 }, (_, index) => ({
          day: `2026-10-${String(index + 1).padStart(2, "0")}`,
          users: [3, 5, 2, 7, 4, 8, 6][index % 7],
          progress: [9, 12, 8, 17, 14, 20, 16][index % 7],
          logs: [15, 19, 16, 25, 22, 32, 29][index % 7],
        }));
        data = {
          metrics: {
            totalUsers: 1248,
            activeToday: 184,
            newUsers: 92,
            totalGoals: 3472,
            activeGoals: 2180,
            completedGoals: 1292,
            totalHabits: 2168,
            recentGoalProgress: 450,
            recentHabitLogs: 782,
          },
          daily,
          needsAttention: { openReports: 1 },
          refreshedAt: new Date().toISOString(),
        };
      } else if (endpoint === "users") {
        if (expireNextUsers) {
          expireNextUsers = false;
          return json(
            { success: false, message: "Invalid or expired admin token" },
            401,
          );
        }
        let filtered = users.filter((user) =>
          `${user.name} ${user.email} ${user.username}`
            .toLowerCase()
            .includes((url.searchParams.get("search") || "").toLowerCase()),
        );
        if (url.searchParams.get("sortBy") === "name")
          filtered = [...filtered].sort(
            (a, b) =>
              a.name.localeCompare(b.name) *
              (url.searchParams.get("sortOrder") === "asc" ? 1 : -1),
          );
        data = pageData(filtered, "users", url.searchParams);
      } else if (/^users\/\d+\/status$/.test(endpoint)) {
        const user = users.find((user) => user.id === endpoint.split("/")[1]);
        user.accountActive = req.postDataJSON().active;
        data = { accountActive: user.accountActive };
      } else if (/^users\/\d+\/premium$/.test(endpoint)) {
        const user = users.find((user) => user.id === endpoint.split("/")[1]);
        user.premiumExpiresAt =
          method === "DELETE" ? null : "2028-01-01T00:00:00Z";
        data = { premiumExpiresAt: user.premiumExpiresAt };
      } else if (/^users\/\d+$/.test(endpoint))
        data = {
          user: users.find((user) => user.id === endpoint.split("/")[1]),
          activity: { goalUpdates: [], habitLogs: [], dailyLogs: [] },
        };
      else if (endpoint === "goals")
        data = pageData([goal], "goals", url.searchParams);
      else if (endpoint === "goals/9")
        data = {
          goal: {
            id: 9,
            title: goal.title,
            user_id: 1,
            owner_username: "person1",
            is_public: true,
            is_updates_public: false,
            category: goal.category,
            year: 2026,
            created_at: goal.createdAt,
            update_count: 12,
          },
          details: { description: "Read thoughtfully every day." },
          progress: {
            percent: 40,
            breakdown: {
              subGoals: [
                {
                  title: "Finish first book",
                  completed: true,
                  weight: 40,
                  contribution: 40,
                },
              ],
              habits: [],
            },
          },
          recentUpdates: [
            {
              id: 1,
              text: "Finished chapter two.",
              dateKey: "2026-10-17",
              createdAt: goal.lastGoalUpdateAt,
            },
          ],
        };
      else if (endpoint === "habits")
        data = pageData([habit], "habits", url.searchParams);
      else if (endpoint === "habits/6")
        data = {
          habit: {
            id: 6,
            user_id: 1,
            owner_username: "person1",
            name: habit.name,
            frequency: "daily",
            daily_target_count: 1,
            target_days: 30,
            current_streak: 7,
            best_streak: 12,
            total_logs: 21,
            last_log_at: habit.lastLogAt,
            is_public: false,
            created_at: habit.createdAt,
          },
          recentLogs: [
            {
              id: 1,
              date_key: "2026-10-17",
              occurred_at: habit.lastLogAt,
              status: "done",
              completion_count: 1,
            },
          ],
        };
      else if (endpoint === "reports")
        data = pageData(
          report.status === url.searchParams.get("status") ||
            url.searchParams.get("status") === "all"
            ? [report]
            : [],
          "reports",
          url.searchParams,
        );
      else if (endpoint === `reports/${report._id}/dismiss`) {
        report.status = "dismissed";
        data = { report };
      } else if (endpoint === `reports/${report._id}`)
        data = {
          report,
          resource: {
            id: 1,
            username: "person1",
            is_active: users[0].accountActive,
          },
        };
      else if (endpoint === "product-updates")
        data = pageData(
          releaseDeleted ? [] : [release],
          "updates",
          url.searchParams,
        );
      else if (endpoint === "product-updates/1.4.0" && method === "DELETE") {
        releaseDeleted = true;
      } else
        return json(
          {
            success: false,
            message: `Unexpected mock endpoint ${method} ${endpoint}`,
          },
          404,
        );
      return json({ success: true, data });
    });
    await page.goto(`${origin}${base}/users?user=1`);
    await page
      .getByRole("heading", { name: "Welcome to your workspace" })
      .waitFor();
    await page
      .getByText("Email", { exact: true })
      .locator("input")
      .fill("admin@example.test");
    await page
      .getByText("Password", { exact: true })
      .locator("input")
      .fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "User details" });
    await drawer.getByRole("heading", { name: "Person 01" }).waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Person 01", exact: true })
      .waitFor();
    await page
      .getByRole("checkbox", { name: "Select all users on this page" })
      .check();
    await page.getByText("20 users selected", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Next page" }).click();
    await page
      .getByRole("button", { name: "Person 21", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("20 users selected", { exact: true }).count(),
      0,
    );
    const input = page.getByRole("textbox", {
      name: "Search name, username or email",
    });
    const before = requests.filter((item) => item.endpoint === "users").length;
    await input.fill("Person 01");
    await page
      .getByRole("button", { name: "Person 01", exact: true })
      .waitFor();
    const searchRequests = requests
      .filter((item) => item.endpoint === "users")
      .slice(before);
    assert(
      searchRequests.filter((item) => item.search.includes("search=Person+01"))
        .length <= 1,
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export this page" }).click();
    const download = await downloadPromise;
    const csv = fs.readFileSync(await download.path(), "utf8");
    assert(csv.includes("Person 01"));
    assert(!csv.includes("Person 02"));
    await page.getByRole("button", { name: "Person 01", exact: true }).click();
    await drawer.getByRole("button", { name: "Deactivate account" }).click();
    const confirmation = page.getByRole("dialog", {
      name: "Deactivate @person1?",
    });
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert(!mutations.some((item) => item.endpoint === "users/1/status"));
    await drawer.getByRole("button", { name: "Deactivate account" }).click();
    await confirmation
      .getByRole("button", { name: "Deactivate", exact: true })
      .click();
    await drawer.getByRole("button", { name: "Reactivate account" }).waitFor();
    await drawer.getByRole("button", { name: "Reactivate account" }).click();
    await page
      .getByRole("dialog", { name: "Reactivate @person1?" })
      .getByRole("button", { name: "Reactivate", exact: true })
      .click();
    await drawer.getByRole("button", { name: "Extend premium" }).waitFor();
    await drawer.getByRole("button", { name: "Revoke premium" }).click();
    await page
      .getByRole("dialog", { name: "Revoke premium?" })
      .getByRole("button", { name: "Revoke premium", exact: true })
      .click();
    await drawer.getByRole("button", { name: "Grant premium" }).waitFor();
    await drawer.getByRole("button", { name: "Goals", exact: true }).click();
    await drawer.getByRole("link", { name: goal.title }).click();
    const goalDrawer = page.getByRole("dialog", { name: "Goal details" });
    await goalDrawer.getByRole("heading", { name: goal.title }).waitFor();
    await goalDrawer.getByText("40%", { exact: true }).waitFor();
    await page.reload();
    await page
      .getByRole("dialog", { name: "Goal details" })
      .getByRole("heading", { name: goal.title })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.goto(`${origin}${base}/habits?detail=6`);
    await page
      .getByRole("dialog", { name: "Habit details" })
      .getByRole("heading", { name: habit.name })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.goto(`${origin}${base}/reports`);
    await page.getByRole("button", { name: "spam", exact: true }).click();
    await page
      .getByRole("button", { name: "Dismiss report", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Dismiss this report?" })
      .getByRole("button", { name: "Dismiss report", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Report details" })
      .getByText("dismissed", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.goto(`${origin}${base}/releases`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Delete release?" })
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.equal(releaseDeleted, false);
    await page.goto(`${origin}${base}`);
    await page
      .getByRole("heading", { name: "Your trail at a glance" })
      .waitFor();
    await page.getByText("1,248", { exact: true }).waitFor();
    const artifacts = path.join(process.env.WT_ADMIN_TEST_TOOLS, "artifacts");
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({
      path: path.join(artifacts, "overview-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("dialog", { name: "Navigation" });
    await nav.getByRole("link", { name: "Habits", exact: true }).click();
    await page.getByRole("button", { name: habit.name, exact: true }).click();
    await page.getByRole("dialog", { name: "Habit details" }).waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.keyboard.press("Escape");
    await page.goto(`${origin}${base}`);
    await page.getByText("1,248", { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(artifacts, "overview-mobile.png"),
      fullPage: true,
    });
    expireNextUsers = true;
    await page.goto(`${origin}${base}/users`);
    await page
      .getByRole("heading", { name: "Welcome to your workspace" })
      .waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("wishtrail_admin_token")),
      null,
    );
    assert(page.url().includes(`${base}/login`));
    assert.deepEqual(errors, []);
    assert(!mutations.some((item) => item.endpoint === "email/send"));
    console.log(
      "PASS: desktop/mobile routes, deep-link login, selection reset, debounce, CSV, details, confirmations, account/premium/report actions, preserved releases, 401 logout. Synthetic API only.",
    );
    console.log(`Screenshots: ${artifacts}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
