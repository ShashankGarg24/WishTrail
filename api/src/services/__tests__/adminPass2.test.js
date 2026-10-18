jest.mock("../../config/supabase", () => ({ query: jest.fn() }));
jest.mock("../emailService", () => ({
  sendAdminBroadcastEmail: jest.fn(),
  getAdminCampaignTemplate: () => "<p>Preview</p>",
  getAdminCampaignText: () => "Preview",
}));
jest.mock("../productUpdateService", () => ({ getUpdateByVersion: jest.fn() }));
jest.mock("../../models/extended/UserPreferences", () => ({ find: jest.fn() }));
jest.mock("../../models/Config", () => ({
  findOne: jest.fn(),
  getValue: jest.fn(),
  setValue: jest.fn(),
  find: jest.fn(),
}));
const { query } = require("../../config/supabase");
const prefs = require("../../models/extended/UserPreferences");
const email = require("../emailService");
const Config = require("../../models/Config");
const campaigns = require("../adminCampaignService");
const product = require("../adminProductService");
const input = {
  mode: "all",
  subject: "Hello",
  title: "News",
  body: "Progress",
  ctaUrl: "/dashboard",
};
let rows;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_JWT_SECRET = "pass2-test-secret";
  rows = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: "User",
    email: `user${i}@example.com`,
  }));
  query.mockImplementation(async (sql, params) => ({
    rows: sql.includes("ORDER BY u.id")
      ? rows.filter((u) => u.id > params[0]).slice(0, 200)
      : rows,
  }));
  prefs.find.mockReturnValue({
    select: () => ({ lean: async () => [{ userId: 2 }] }),
  });
  email.sendAdminBroadcastEmail.mockResolvedValue({ success: true });
});
test("review excludes opt-outs, binds audience/content and requires confirmation", async () => {
  const review = await campaigns.review(input, "admin");
  expect(review.estimatedRecipients).toBe(11);
  expect(review.excludedOptOut).toBe(1);
  await expect(
    campaigns.send({ ...input, reviewToken: review.reviewToken }, "admin"),
  ).rejects.toThrow("explicitly confirm");
  await expect(
    campaigns.send(
      {
        ...input,
        body: "Changed",
        reviewToken: review.reviewToken,
        confirmed: true,
      },
      "admin",
    ),
  ).rejects.toThrow("changed");
  expect(email.sendAdminBroadcastEmail).not.toHaveBeenCalled();
});
test("send bounds concurrency, reports failures and prevents same-process replay", async () => {
  let concurrent = 0;
  let peak = 0;
  email.sendAdminBroadcastEmail.mockImplementation(async ({ to }) => {
    concurrent++;
    peak = Math.max(peak, concurrent);
    await new Promise((resolve) => setTimeout(resolve, 1));
    concurrent--;
    if (to === "user3@example.com")
      throw new Error("provider secret must not leak");
  });
  const review = await campaigns.review(input, "admin");
  const payload = {
    ...input,
    confirmed: true,
    reviewToken: review.reviewToken,
  };
  const sent = await campaigns.send(payload, "admin");
  expect(sent).toMatchObject({ sent: 10, failed: 1, attempted: 11 });
  expect(peak).toBeLessThanOrEqual(5);
  expect(JSON.stringify(sent)).not.toContain("provider secret");
  expect(
    email.sendAdminBroadcastEmail.mock.calls.some(
      ([arg]) => arg.to === "user1@example.com",
    ),
  ).toBe(false);
  await expect(campaigns.send(payload, "admin")).rejects.toThrow(
    "already started",
  );
});
test("audience drift and arbitrary URLs fail before delivery; no-goals uses actual records", async () => {
  const review = await campaigns.review(input, "admin");
  rows.pop();
  await expect(
    campaigns.send(
      { ...input, confirmed: true, reviewToken: review.reviewToken },
      "admin",
    ),
  ).rejects.toThrow("changed");
  for (const ctaUrl of [
    "javascript:alert(1)",
    "https://evil.example",
    "https://wishtrail.in@evil.example",
  ]) {
    await expect(
      campaigns.review({ ...input, ctaUrl }, "admin"),
    ).rejects.toThrow("CTA");
  }
  await campaigns.scan(campaigns.audience({ mode: "noGoals" }));
  expect(query.mock.calls.at(-1)[0]).toContain(
    "NOT EXISTS (SELECT 1 FROM goals",
  );
});
test("test mail uses configured address only and includes ending", async () => {
  process.env.ADMIN_TEST_EMAIL = "test@example.com";
  await campaigns.test({
    ...input,
    to: "attacker@example.com",
    ending: "See you soon",
  });
  expect(email.sendAdminBroadcastEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "test@example.com",
      text: expect.objectContaining({ body: "Progress\n\nSee you soon" }),
    }),
  );
  delete process.env.ADMIN_TEST_EMAIL;
});
test("expired reviews and review tokens used as admin authentication are rejected", async () => {
  const jwt = require("jsonwebtoken");
  const expired = jwt.sign(
    { scope: "campaign-review", admin: "admin" },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: -1 },
  );
  await expect(
    campaigns.send(
      { ...input, confirmed: true, reviewToken: expired },
      "admin",
    ),
  ).rejects.toThrow("expired");
  const review = await campaigns.review(input, "admin");
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  require("../../middleware/adminAuth").requireAdminAuth(
    { headers: { authorization: `Bearer ${review.reviewToken}` } },
    res,
    next,
  );
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
test("delivery rechecks opt-outs and never expands the reviewed audience", async () => {
  const review = await campaigns.review(input, "admin");
  let checks = 0;
  prefs.find.mockImplementation(() => ({
    select: () => ({
      lean: async () =>
        ++checks === 1 ? [{ userId: 2 }] : [{ userId: 2 }, { userId: 3 }],
    }),
  }));
  const result = await campaigns.send(
    { ...input, confirmed: true, reviewToken: review.reviewToken },
    "admin",
  );
  expect(result).toMatchObject({
    requested: 11,
    attempted: 10,
    skippedSinceReview: 1,
  });
  expect(
    email.sendAdminBroadcastEmail.mock.calls.some(
      ([arg]) => arg.to === "user2@example.com",
    ),
  ).toBe(false);
});
test("promotion contract validates dates, surfaces, audience and safe content", () => {
  const base = {
    enabled: true,
    title: "Offer",
    ctaLabel: "View",
    ctaUrl: "/premium",
    audience: "all",
    surface: "announcement_card",
  };
  expect(product.validatePromotion(base)).toMatchObject({
    title: "Offer",
    ctaUrl: "https://wishtrail.in/premium",
  });
  expect(() =>
    product.validatePromotion({ ...base, surface: "<script>" }),
  ).toThrow("Unsupported");
  expect(() =>
    product.validatePromotion({
      ...base,
      startAt: "2026-10-19",
      endAt: "2026-10-18",
    }),
  ).toThrow("End");
  expect(() => product.setMaintenance({ enabled: "false" })).rejects.toThrow(
    "boolean",
  );
});
test("config administration rejects ordinary user tokens and invalid legacy writes", async () => {
  const express = require("express");
  const request = require("supertest");
  const jwt = require("jsonwebtoken");
  const app = express();
  app.use(express.json());
  app.use("/config", require("../../routes/configRoutes"));
  app.use((err, req, res, next) =>
    res.status(err.statusCode || 500).json({ message: err.message }),
  );
  process.env.JWT_SECRET = "ordinary";
  const userToken = jwt.sign({ id: 1 }, "ordinary");
  expect(
    (
      await request(app)
        .post("/config")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ key: "maintenance_mode", value: true })
    ).status,
  ).toBe(401);
  const adminToken = require("../../middleware/adminAuth").signAdminToken({
    scope: "admin-panel",
    email: "admin",
  });
  const response = await request(app)
    .post("/config")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ key: "arbitrary_js", value: "bad" });
  expect(response.status).toBe(400);
  expect(Config.setValue).not.toHaveBeenCalled();
});
test("maintenance permits configured admin recovery but blocks ordinary product requests", async () => {
  Config.isMaintenanceMode = jest.fn().mockResolvedValue(true);
  Config.findOne.mockResolvedValue({ description: "Maintenance" });
  process.env.ADMIN_API_ROUTE_SEGMENT = "ops/test";
  const middleware = require("../../middleware/maintenanceMode");
  const next = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await middleware({ path: "/api/v1/ops/test/login" }, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  await middleware({ path: "/api/v1/users" }, res, next);
  expect(res.status).toHaveBeenCalledWith(503);
  delete process.env.ADMIN_API_ROUTE_SEGMENT;
});
test("absent remote config keeps maintenance and the promotion contract disabled", async () => {
  Config.findOne.mockReturnValue({ lean: async () => null });
  Config.getValue.mockResolvedValue(null);
  const result = await product.get();
  expect(result.maintenance.enabled).toBe(false);
  expect(result.promotion).toMatchObject({ enabled: false, surface: 'announcement_card' });
  expect(result.promotionPlacementLive).toBe(false);
});
