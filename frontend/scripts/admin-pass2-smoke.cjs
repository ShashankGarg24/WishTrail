// All API calls use synthetic fixtures; no live email, config write or release publication.
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

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [],
      requests = [],
      mutations = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("dialog", async (dialog) => {
      errors.push("Unexpected native dialog");
      await dialog.dismiss();
    });
    await page.addInitScript(() =>
      localStorage.setItem("wishtrail_admin_token", "fixture-admin"),
    );
    let maintenance = { enabled: false, message: "Back soon" };
    let promotion = {
      enabled: false,
      title: "",
      subtitle: "",
      ctaLabel: "View",
      ctaUrl: "/premium",
      offerCopy: "",
      startAt: "",
      endAt: "",
      audience: "all",
      surface: "announcement_card",
    };
    const releases = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Release ${i + 1}`,
      version: `2.${i}.0`,
      type: "feature",
      isMajor: true,
      description: "Plain text release details",
      createdAt: "2026-10-18T00:00:00Z",
    }));
    let stale = false;
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ||
      route.request().url().includes("/api/")
        ? route.fallback()
        : route.abort(),
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const endpoint =
        url.pathname.split("/api/v1/")[1]?.split("/").slice(1).join("/") || "";
      const method = req.method(),
        payload = method === "GET" ? null : req.postDataJSON();
      requests.push({ endpoint, method, query: url.search, payload });
      if (method !== "GET") mutations.push(endpoint);
      const json = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(
            status === 200
              ? { success: true, data }
              : { success: false, message: data },
          ),
        });
      if (url.pathname.includes("/config/maintenance"))
        return json({ maintenanceMode: false });
      if (endpoint === "campaigns/options")
        return json({ testAddress: "admin@example.test" });
      if (endpoint === "campaigns/review")
        return json({
          matched: 25,
          estimatedRecipients: 22,
          excludedOptOut: 2,
          excludedInvalidEmail: 1,
          excludedInactiveOrMissing: 0,
          reviewToken: "fixture-review",
          content: payload,
          previewHtml: "<h1>WishTrail preview</h1>",
        });
      if (endpoint === "campaigns/test")
        return json({ sent: 1, to: "admin@example.test" });
      if (endpoint === "campaigns/send") {
        assert.equal(payload.confirmed, true);
        assert.equal(payload.reviewToken, "fixture-review");
        if (stale) {
          stale = false;
          return json("Audience changed; review again", 409);
        }
        return json({
          requested: 22,
          attempted: 21,
          sent: 20,
          failed: 1,
          skippedSinceReview: 1,
          failures: [{ userId: 3, message: "Delivery failed" }],
        });
      }
      if (endpoint === "product-updates" && method === "GET") {
        const search = url.searchParams.get("search") || "",
          pageNum = Number(url.searchParams.get("page") || 1),
          limit = Number(url.searchParams.get("limit") || 20);
        const items = releases.filter((r) =>
          r.title.toLowerCase().includes(search.toLowerCase()),
        );
        return json({
          updates: items.slice((pageNum - 1) * limit, pageNum * limit),
          pagination: {
            page: pageNum,
            limit,
            total: items.length,
            pages: Math.max(1, Math.ceil(items.length / limit)),
          },
        });
      }
      if (endpoint.startsWith("product-updates/") && method === "GET")
        return json({
          update: releases.find(
            (r) => r.version === decodeURIComponent(endpoint.split("/").at(-1)),
          ),
        });
      if (endpoint === "product-updates" && method === "POST") {
        const update = {
          ...payload,
          id: 99,
          createdAt: new Date().toISOString(),
        };
        releases.unshift(update);
        return json({ update });
      }
      if (endpoint.startsWith("product-updates/") && method === "DELETE")
        return json({ deleted: true });
      if (endpoint.startsWith("product-updates/") && method === "PUT")
        return json({ update: payload });
      if (
        endpoint === "product-control" ||
        endpoint.startsWith("product-control/")
      ) {
        if (method === "PUT" && endpoint.endsWith("/maintenance"))
          maintenance = payload;
        if (method === "PUT" && endpoint.endsWith("/promotion"))
          promotion = payload;
        return json({
          maintenance,
          promotion,
          deploymentRequired: ["Premium limits", "Minimum app version"],
        });
      }
      return json("Unexpected fixture endpoint: " + endpoint, 404);
    });
    await page.goto(`${origin}${base}/campaigns`);
    await page.getByLabel("Audience", { exact: false }).selectOption("noGoals");
    await page.getByRole("button", { name: "Continue to content" }).click();
    await page.getByLabel("Writing preset").selectOption("noGoals");
    await page
      .getByRole("button", { name: "Preview message", exact: true })
      .click();
    await page.getByTitle("Campaign email preview").waitFor();
    assert.equal(
      requests.find((r) => r.endpoint === "campaigns/review").payload.mode,
      "noGoals",
    );
    assert(!mutations.includes("campaigns/send"));
    await page
      .getByRole("button", { name: "Send test to admin@example.test" })
      .click();
    await page
      .getByText("Test sent to admin@example.test", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Mobile preview", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review audience and send" })
      .click();
    await page.getByText("22 of 25 active matches", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Confirm and send\u2026" }).click();
    await page
      .getByRole("dialog", { name: "Send this campaign?" })
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert(!mutations.includes("campaigns/send"));
    await page.getByRole("button", { name: "Confirm and send\u2026" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Send campaign", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "20 sent \u00b7 1 failed" })
      .waitFor();
    await page.getByText("User 3: Delivery failed").waitFor();
    await page.goto(`${origin}${base}/releases`);
    await page.getByRole("table", { name: "Releases" }).waitFor();
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByText("Release 25", { exact: true }).waitFor();
    await page
      .getByRole("textbox", { name: "Search releases" })
      .fill("Release 12");
    await page.getByText("Release 12", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Delete release?" })
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert(!requests.some((r) => r.method === "DELETE"));
    await page.getByLabel("Version", { exact: true }).fill("3.0.0");
    await page.getByLabel("Title", { exact: true }).fill("New paths");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Safe structured plain text");
    await page
      .getByRole("button", { name: "Review publication\u2026" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Publish", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Create a campaign from this release" })
      .click();
    await page.getByLabel("Audience", { exact: false }).selectOption("all");
    await page.getByRole("button", { name: "Continue to content" }).click();
    await page.getByRole("textbox", { name: "Subject", exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('input[maxlength="180"]')?.value ===
        "New in WishTrail: New paths",
    );
    assert.equal(
      await page.getByLabel("Linked release version (optional)").inputValue(),
      "3.0.0",
    );
    // A stale review must close the send dialog and demand another review.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByLabel("Audience", { exact: false }).selectOption("all");
    await page.getByRole("button", { name: "Continue to content" }).click();
    await page
      .getByRole("button", { name: "Preview message", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review audience and send" })
      .click();
    stale = true;
    await page.getByRole("button", { name: "Confirm and send\u2026" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Send campaign", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review audience and send" })
      .waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.goto(`${origin}${base}/product-control`);
    await page.getByRole("heading", { name: "Maintenance mode" }).waitFor();
    await page.getByLabel(/^Status/).selectOption("true");
    await page
      .getByRole("button", { name: "Review maintenance change\u2026" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert(!mutations.includes("product-control/maintenance"));
    await page
      .getByRole("button", { name: "Review maintenance change\u2026" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Apply change", exact: true })
      .click();
    await page
      .getByText("Maintenance setting updated", { exact: true })
      .waitFor();
    assert.equal(maintenance.enabled, true);
    await page.getByLabel("Title", { exact: true }).fill("A seasonal offer");
    await page.getByLabel("Offer / price copy").fill("Special offer");
    await page
      .getByRole("button", { name: "Review promotion contract\u2026" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Apply change", exact: true })
      .click();
    await page.getByText("Promotion contract saved", { exact: true }).waitFor();
    assert.equal(promotion.title, "A seasonal offer");
    await page.reload();
    await page.getByLabel("Title", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Title", { exact: true }).inputValue(),
      "A seasonal offer",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const section of ["campaigns", "releases", "product-control"]) {
      await page.goto(`${origin}${base}/${section}`);
      await page
        .getByRole("heading", {
          name:
            section === "product-control"
              ? "Product Control"
              : section[0].toUpperCase() + section.slice(1),
          exact: true,
        })
        .waitFor();
      await page.waitForTimeout(200);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `Mobile overflow in ${section}`,
      );
      const dir = path.join(process.env.WT_ADMIN_TEST_TOOLS, "artifacts");
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({
        path: path.join(dir, `pass2-${section}-mobile.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: campaign review/confirmation/test/result/stale review, releases pagination/search/publication/handoff, product confirmations/config reload and mobile layouts. Synthetic API only.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
