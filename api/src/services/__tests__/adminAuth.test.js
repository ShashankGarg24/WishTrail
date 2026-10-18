const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const {
  requireAdminAuth,
  isAllowedAdminIp,
  signAdminToken,
  getRequestIp,
} = require("../../middleware/adminAuth");
jest.mock("../../controllers/adminController", () => ({
  login: (req, res) => res.status(401).json({ success: false }),
  getUsers: jest.fn(),
  getGoals: jest.fn(),
  getHabits: jest.fn(),
  getAnalytics: jest.fn(),
  sendEmail: jest.fn(),
  getProductUpdates: jest.fn(),
  createProductUpdate: jest.fn(),
  updateProductUpdate: jest.fn(),
  deleteProductUpdate: jest.fn(),
}));
jest.mock("../../controllers/adminOperationsController", () =>
  Object.fromEntries(
    [
      "getOverview",
      "getUser",
      "setUserStatus",
      "grantPremium",
      "revokePremium",
      "getGoal",
      "getHabit",
      "getReports",
      "getReport",
      "dismissReport",
    ].map((key) => [key, (req, res) => res.json({ success: true })]),
  ),
);
jest.mock("../../controllers/premiumController", () =>
  Object.fromEntries(
    [
      "getPremiumStatus",
      "getFeatureLimits",
      "subscribeToPremium",
      "cancelSubscription",
      "getPremiumStats",
      "getExpiringUsers",
      "getExpiredUsers",
      "grantPremiumToUser",
      "revokePremiumFromUser",
    ].map((key) => [key, (req, res) => res.json({ success: true })]),
  ),
);
jest.mock("../../middleware/auth", () => ({
  protect: (req, res, next) => next(),
}));

beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = "test-admin-secret";
  delete process.env.ADMIN_ALLOWED_IPS;
});
afterAll(() => {
  delete process.env.ADMIN_JWT_SECRET;
  delete process.env.ADMIN_ALLOWED_IPS;
});
const app = () => {
  const server = express();
  server.get("/protected", requireAdminAuth, (req, res) => res.json(req.admin));
  return server;
};

test("scoped tokens succeed; ordinary, missing, expired and different-IP tokens fail", async () => {
  const server = app();
  await request(server).get("/protected").expect(401);
  await request(server)
    .get("/protected")
    .set("Authorization", `Bearer ${signAdminToken({ scope: "admin-panel" })}`)
    .expect(200);
  for (const token of [
    signAdminToken({ userId: 7 }),
    signAdminToken({ scope: "admin-panel", ip: "203.0.113.7" }),
    jwt.sign({ scope: "admin-panel" }, process.env.ADMIN_JWT_SECRET, {
      expiresIn: -1,
    }),
  ]) {
    await request(server)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  }
});

test("configured allowlist normalizes mapped IPs and cannot be bypassed by raw forwarded headers", async () => {
  process.env.ADMIN_ALLOWED_IPS = "203.0.113.7, 127.0.0.1";
  expect(isAllowedAdminIp({ ip: "::ffff:127.0.0.1" })).toBe(true);
  expect(
    isAllowedAdminIp({
      ip: "198.51.100.9",
      headers: { "x-forwarded-for": "203.0.113.7" },
    }),
  ).toBe(false);
  expect(
    getRequestIp({
      ip: "198.51.100.9",
      headers: { "x-real-ip": "203.0.113.7" },
    }),
  ).toBe("198.51.100.9");
  process.env.ADMIN_ALLOWED_IPS = "203.0.113.7";
  await request(app())
    .get("/protected")
    .set("Authorization", `Bearer ${signAdminToken({ scope: "admin-panel" })}`)
    .expect(403);
});

test("login rejects repeated attempts without any persistent rate-limit store", async () => {
  const server = express();
  server.use("/admin", require("../../routes/adminRoutes"));
  for (let i = 0; i < 10; i++)
    await request(server).post("/admin/login").expect(401);
  const result = await request(server).post("/admin/login").expect(429);
  expect(result.body.message).toContain("Too many login attempts");
});

test("legacy premium administration rejects ordinary user tokens and accepts admin tokens", async () => {
  const server = express();
  server.use("/premium", require("../../routes/premiumRoutes"));
  for (const [method, route] of [
    ["get", "stats"],
    ["get", "expiring"],
    ["get", "expired"],
    ["post", "grant"],
    ["delete", "revoke"],
  ]) {
    await request(server)
      [method](`/premium/${route}`)
      .set("Authorization", `Bearer ${signAdminToken({ userId: 7 })}`)
      .expect(401);
    await request(server)
      [method](`/premium/${route}`)
      .set(
        "Authorization",
        `Bearer ${signAdminToken({ scope: "admin-panel" })}`,
      )
      .expect(200);
  }
  await request(server).get("/premium/status").expect(200);
});
