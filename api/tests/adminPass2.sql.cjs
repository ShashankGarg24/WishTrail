// Existing table structures in an ephemeral PostgreSQL engine; no live DB or migration.
const assert = require("node:assert/strict");
const path = require("node:path");
const { PGlite } = require(
  path.join(
    process.env.WT_ADMIN_TEST_TOOLS,
    "node_modules/@electric-sql/pglite",
  ),
);
function stub(name, value) {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports: value };
}
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
   CREATE TABLE users (id bigint PRIMARY KEY, name text, email text, is_active boolean, created_at timestamptz, last_active_at timestamptz);
   CREATE TABLE goals (id bigint PRIMARY KEY, user_id bigint);
   CREATE TABLE product_updates (id serial PRIMARY KEY, title varchar(255), description text, version varchar(50) UNIQUE, is_major boolean, type text, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW());
   INSERT INTO users VALUES (1,'One','one@example.test',true,NOW(),NOW()), (2,'Two','two@example.test',true,NOW()-INTERVAL '60 days',NULL), (3,'Three','three@example.test',false,NOW(),NOW()), (4,'Four','four@example.test',true,NOW(),NOW());
   INSERT INTO goals VALUES (1,1);
  `);
    stub("../src/config/supabase", {
      query: (sql, params) => db.query(sql, params),
    });
    stub("../src/services/emailService", {});
    stub("../src/models/extended/UserPreferences", {
      find: () => ({ select: () => ({ lean: async () => [{ userId: 4 }] }) }),
    });
    const campaigns = require("../src/services/adminCampaignService");
    const releases = require("../src/services/productUpdateService");
    let result = await campaigns.scan(campaigns.audience({ mode: "all" }));
    assert.equal(result.matched, 3);
    assert.equal(result.estimatedRecipients, 2);
    assert.equal(result.excludedOptOut, 1);
    result = await campaigns.scan(campaigns.audience({ mode: "noGoals" }));
    assert.equal(result.matched, 2);
    assert.equal(result.estimatedRecipients, 1);
    result = await campaigns.scan(
      campaigns.audience({ mode: "inactive", inactiveDays: 30 }),
    );
    assert.equal(result.matched, 1);
    assert.equal(result.estimatedRecipients, 1);
    result = await campaigns.scan(
      campaigns.audience({ mode: "selected", userIds: [1, 3, 999] }),
    );
    assert.equal(result.estimatedRecipients, 1);
    assert.equal(result.excludedInactiveOrMissing, 2);
    for (let i = 0; i < 25; i++)
      await releases.createUpdate({
        version: `2.${i}.0`,
        title: `Release ${String(i).padStart(2, "0")}`,
        description: "Safe text",
      });
    let list = await releases.listForAdmin({
      sortBy: "title",
      sortOrder: "asc",
      limit: 20,
      offset: 20,
    });
    assert.equal(list.total, 25);
    assert.equal(list.updates.length, 5);
    assert.equal(list.updates[0].title, "Release 20");
    list = await releases.listForAdmin({ search: "Release 02" });
    assert.equal(list.total, 1);
    list = await releases.listForAdmin({
      search: "' OR 1=1 --",
      sortBy: "title; DROP TABLE users",
    });
    assert.equal(list.total, 0);
    assert.equal(
      (await db.query("SELECT COUNT(*)::int AS n FROM users")).rows[0].n,
      4,
    );
    const updated = await releases.updateUpdate("2.0.0", {
      version: "3.0.0",
      title: "New title",
      description: "New copy",
      isMajor: true,
      type: "enhancement",
    });
    assert.equal(updated.isMajor, true);
    assert.equal(
      (await releases.getUpdateByVersion("3.0.0")).title,
      "New title",
    );
    await releases.deleteUpdate("3.0.0");
    assert.equal(await releases.getUpdateByVersion("3.0.0"), null);
    console.log(
      "PASS: actual PostgreSQL campaign segments/opt-outs/exclusions and release search/sort/pagination/CRUD/injection protection. Ephemeral fixtures only.",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
