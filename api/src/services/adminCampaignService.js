const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { query } = require("../config/supabase");
const UserPreferences = require("../models/extended/UserPreferences");
const emailService = require("./emailService");
const productUpdates = require("./productUpdateService");

const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};
const text = (value, max, required = false) => {
  if (value !== undefined && typeof value !== "string")
    fail("Content must be plain text");
  const clean = (value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (clean.length > max || (required && !clean))
    fail(`Content is required and must fit its field limit (${max})`);
  return clean;
};
const safeUrl = (value) => {
  if (value !== undefined && (typeof value !== "string" || value.length > 2000))
    fail("CTA URL must be text, at most 2000 characters");
  const base = new URL(process.env.FRONTEND_URL || "https://wishtrail.in");
  let url;
  try {
    url = new URL(value || "/dashboard", base);
  } catch {
    fail("Invalid CTA URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    ![base.origin, "https://wishtrail.in", "https://www.wishtrail.in"].includes(
      url.origin,
    )
  )
    fail("CTA must link to WishTrail");
  return url.toString();
};
const audience = (input) => {
  const mode = input.mode;
  if (!["selected", "all", "inactive", "noGoals"].includes(mode))
    fail("Choose a valid audience");
  let userIds = [];
  if (mode === "selected") {
    if (
      !Array.isArray(input.userIds) ||
      !input.userIds.length ||
      input.userIds.length > 1000
    )
      fail("Select 1–1000 users");
    userIds = [
      ...new Set(
        input.userIds.map((id) => {
          if (
            !/^[1-9]\d*$/.test(String(id)) ||
            !Number.isSafeInteger(Number(id))
          )
            fail("Invalid user ID");
          return Number(id);
        }),
      ),
    ].sort((a, b) => a - b);
  }
  const inactiveDays = mode === "inactive" ? Number(input.inactiveDays) : 0;
  if (
    mode === "inactive" &&
    (!Number.isInteger(inactiveDays) ||
      inactiveDays < 1 ||
      inactiveDays > 36500)
  )
    fail("Inactive days must be 1–36500");
  return { mode, userIds, inactiveDays };
};
const content = async (input) => {
  const result = {
    subject: text(input.subject, 180, true),
    title: text(input.title, 180, true),
    subtitle: text(input.subtitle, 220),
    body: text(input.body, 5000, true),
    ending: text(input.ending, 500),
    ctaLabel: text(input.ctaLabel || "Open WishTrail", 80, true),
    ctaUrl: safeUrl(input.ctaUrl),
    linkedReleaseVersion: text(input.linkedReleaseVersion, 50),
  };
  if (/[\r\n]/.test(result.subject)) fail("Subject must be one line");
  if (
    result.linkedReleaseVersion &&
    !(await productUpdates.getUpdateByVersion(result.linkedReleaseVersion))
  )
    fail("Linked release no longer exists");
  return result;
};
const secret = () => process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Keyset batches bound database reads and SMTP concurrency; there is no queue/history store.
async function scan(target, visit = async () => {}) {
  let after = 0;
  const stats = {
    matched: 0,
    estimatedRecipients: 0,
    excludedOptOut: 0,
    excludedInvalidEmail: 0,
  };
  const fingerprint = crypto.createHash("sha256");
  while (true) {
    const result = await query(
      `SELECT u.id, u.name, u.email FROM users u
      WHERE u.is_active = true AND u.id > $1
      AND ($2 <> 'selected' OR u.id = ANY($3::bigint[]))
      AND ($2 <> 'inactive' OR COALESCE(u.last_active_at, u.created_at) < NOW() - make_interval(days => $4::int))
      AND ($2 <> 'noGoals' OR NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = u.id))
      ORDER BY u.id LIMIT 200`,
      [after, target.mode, target.userIds, target.inactiveDays],
    );
    if (!result.rows.length) break;
    const rows = result.rows;
    const prefs = await UserPreferences.find({
      userId: { $in: rows.map((u) => Number(u.id)) },
      "notifications.email.enabled": false,
    })
      .select("userId")
      .lean();
    const disabled = new Set(prefs.map((p) => String(p.userId)));
    const eligible = [];
    for (const user of rows) {
      stats.matched++;
      if (disabled.has(String(user.id))) stats.excludedOptOut++;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || ""))
        stats.excludedInvalidEmail++;
      else {
        eligible.push(user);
        stats.estimatedRecipients++;
        fingerprint.update(JSON.stringify([String(user.id), user.email]));
      }
    }
    await visit(eligible);
    after = rows[rows.length - 1].id;
  }
  return {
    ...stats,
    excludedInactiveOrMissing:
      target.mode === "selected" ? target.userIds.length - stats.matched : 0,
    fingerprint: fingerprint.digest("hex"),
  };
}
const used = new Map(); // Short-lived replay protection for this process only.
async function review(input, admin) {
  const target = audience(input);
  const copy = await content(input);
  const stats = await scan(target);
  const reviewToken = jwt.sign(
    {
      scope: "campaign-review",
      admin,
      digest: hash({ target, copy, stats }),
      nonce: crypto.randomUUID(),
    },
    secret(),
    { expiresIn: "10m" },
  );
  const preview = {
    ...copy,
    recipientName: "there",
    body: [copy.body, copy.ending].filter(Boolean).join("\n\n"),
  };
  return {
    ...stats,
    content: copy,
    audience: target,
    reviewToken,
    expiresInSeconds: 600,
    previewHtml: emailService.getAdminCampaignTemplate(preview),
    previewText: emailService.getAdminCampaignText(preview),
  };
}
async function send(input, admin) {
  if (input.confirmed !== true || !input.reviewToken)
    fail("Review and explicitly confirm the campaign first");
  let token;
  try {
    token = jwt.verify(input.reviewToken, secret());
  } catch {
    fail("Review expired; review the campaign again", 409);
  }
  if (token.scope !== "campaign-review" || token.admin !== admin)
    fail("Invalid campaign review", 403);
  const target = audience(input);
  const copy = await content(input);
  const approved = [];
  const stats = await scan(target, (users) => {
    approved.push(...users);
  });
  if (token.digest !== hash({ target, copy, stats }))
    fail("Audience or content changed; review again", 409);
  for (const [key, expiry] of used) if (expiry < Date.now()) used.delete(key);
  if (used.has(token.nonce))
    fail(
      "This campaign send was already started; review before another send",
      409,
    );
  used.set(token.nonce, token.exp * 1000);
  const result = {
    requested: stats.estimatedRecipients,
    attempted: 0,
    sent: 0,
    failed: 0,
    failures: [],
    ...stats,
  };
  for (let batch = 0; batch < approved.length; batch += 200) {
    const snapshot = approved.slice(batch, batch + 200);
    // Never expand the reviewed audience. Recheck account state and preferences before delivery.
    const active = await query(
      "SELECT id, email FROM users WHERE is_active = true AND id = ANY($1::bigint[])",
      [snapshot.map((u) => u.id)],
    );
    const activeEmails = new Map(
      active.rows.map((u) => [String(u.id), u.email]),
    );
    const prefs = await UserPreferences.find({
      userId: { $in: snapshot.map((u) => Number(u.id)) },
      "notifications.email.enabled": false,
    })
      .select("userId")
      .lean();
    const optedOut = new Set(prefs.map((p) => String(p.userId)));
    const users = snapshot.filter(
      (u) =>
        activeEmails.get(String(u.id)) === u.email &&
        !optedOut.has(String(u.id)),
    );
    for (let i = 0; i < users.length; i += 5) {
      await Promise.all(
        users.slice(i, i + 5).map(async (user) => {
          result.attempted++;
          try {
            await deliver(copy, user.email, user.name);
            result.sent++;
          } catch {
            result.failed++;
            if (result.failures.length < 10)
              result.failures.push({
                userId: user.id,
                message:
                  "Delivery failed. Check mail service configuration or provider delivery logs.",
              });
          }
        }),
      );
    }
  }
  result.skippedSinceReview = result.requested - result.attempted;
  return result;
}
function deliver(copy, to, recipientName) {
  return emailService.sendAdminBroadcastEmail({
    to,
    subject: copy.subject,
    text: {
      ...copy,
      recipientName,
      body: [copy.body, copy.ending].filter(Boolean).join("\n\n"),
    },
  });
}
function testAddress() {
  const address = process.env.ADMIN_TEST_EMAIL || process.env.ADMIN_EMAIL || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}
async function test(input) {
  const to = testAddress();
  if (!to) fail("Configure ADMIN_TEST_EMAIL or ADMIN_EMAIL for test delivery");
  const copy = await content(input);
  await deliver({ ...copy, subject: `[Test] ${copy.subject}` }, to, "Admin");
  return { sent: 1, to };
}
module.exports = {
  review,
  send,
  test,
  scan,
  audience,
  content,
  safeUrl,
  text,
  testAddress,
};
