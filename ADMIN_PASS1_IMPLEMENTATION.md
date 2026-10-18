# WishTrail admin — Pass 1 implementation

Scope: PASS 1 of `WishTrail_Admin_Redesign_Codex_Two_Pass_Spec.docx` only. The full document was read before implementation. An inspection map and behavior changes were reported before edits.

**No application database table, MongoDB collection, schema migration, admin audit system, or dependency was added. No commit or push was made.**

## Inspection and reuse map

| Area | Existing code/data reused | Implementation |
| --- | --- | --- |
| Routing/auth | `App.jsx`, `AdminPage.jsx`, `adminApi.js`, `adminAuth.js` | Configurable UI/API prefixes; separately authenticated admin shell and login; route-backed sections |
| Overview | PostgreSQL `users`, `goals`, `goal_updates`, `habits`, `habit_logs`; MongoDB `Report` | UTC range of 1–90 days; actual daily signups/update/log counts; totals; open/reviewing reports; refresh time |
| People | `adminService.js`; `users.is_active`, `is_verified`, `premium_expires_at`, refresh-token columns; `UserPreferences`, `DailyLogsEntry` | Search/filter/sort/page/export; account drawer; related records; deactivate/reactivate; premium controls |
| Goal details | `goals`, `goal_updates`, `GoalDetails`, `pgGoalUpdateService`, `goalDivisionService.computeGoalProgress` | Metadata, visibility, description, read-only weighted breakdown and recent updates |
| Habit details | `habits`, `habit_logs` | Schedule, configured targets, streaks, last log, latest daily records |
| Reports | Existing `Report` and `Activity` models plus PostgreSQL users | Paginated status filters, reporter/resource links, resource inspection, dismissal |
| Existing communication/releases | Original `AdminPage.jsx` forms and `adminApi` endpoints | Preserved in `admin/legacy/LegacyOperations.jsx`; new navigation labels and shared delete confirmation; no Pass 2 workflow |
| Premium auth | `premiumRoutes.js`, `premiumController.js`, existing `pgUserService` methods | Admin JWT required before exposing grant/revoke; ordinary subscription/status routes keep their existing authentication |

No new model is declared or new storage initialized. All application writes update existing user/report records or call existing premium/release/email operations.

## Changed files

- `frontend/src/App.jsx`: mount independent admin workspace, hide ordinary product chrome there, keep admin reachable during maintenance, skip ordinary auth bootstrap on admin routes.
- `frontend/src/pages/AdminPage.jsx`: small login/session/router entry replacing the original monolithic panel.
- `frontend/src/services/adminApi.js`: new operations and stale-session-safe 401 cleanup.
- `frontend/src/services/api.js`: ordinary user-session failure cannot redirect an admin workspace to ordinary `/auth`.
- `frontend/src/admin/config.js`, `admin.css`, `AdminLayout.jsx`, `AdminSidebar.jsx`, `AdminHeader.jsx`, `LoginPage.jsx`.
- `frontend/src/admin/shared/`: table, filters, pagination, drawer, confirmation, empty/error/skeleton states, formatting/CSV, resource/search hooks, accessible native-dialog overlay.
- `frontend/src/admin/overview/OverviewPage.jsx`.
- `frontend/src/admin/users/UsersPage.jsx`, `UserDetail.jsx`.
- `frontend/src/admin/goals/GoalsPage.jsx`, `GoalDetail.jsx`.
- `frontend/src/admin/habits/HabitsPage.jsx`, `HabitDetail.jsx`.
- `frontend/src/admin/reports/ReportsPage.jsx`.
- `frontend/src/admin/legacy/LegacyOperations.jsx`.
- `api/src/middleware/adminAuth.js`, `controllers/adminController.js`, `routes/adminRoutes.js`, `services/adminService.js`.
- `api/src/controllers/adminOperationsController.js`, `services/adminOperationsService.js`.
- `api/src/services/goalDivisionService.js`: optional read-only preloaded goal details for admin progress inspection; existing callers keep their behavior.
- `api/src/routes/premiumRoutes.js`, `controllers/premiumController.js`.
- `api/src/services/__tests__/adminAuth.test.js`, `adminOperations.test.js`, `adminGoalProgress.test.js`.
- `api/tests/adminOperations.sql.cjs`, `frontend/scripts/admin-pass1-smoke.cjs`.
- This handoff document.

## Endpoints

All paths below are relative to the configured `/api/v1/<admin-segment>` prefix. All require admin authentication except login.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/overview?start=YYYY-MM-DD&end=YYYY-MM-DD` | Totals, UTC daily series, report count, refreshed time |
| GET | `/users/:id` | Account detail and recent product activity |
| PATCH | `/users/:id/status` | Boolean `{ active }`; clears refresh tokens on deactivation |
| POST | `/users/:id/premium` | Integer `{ months }` from 1–120; reuses existing grant/extend method |
| DELETE | `/users/:id/premium` | Existing premium revocation |
| GET | `/goals/:id` | Read-only metadata/progress/recent updates |
| GET | `/habits/:id` | Read-only habit detail and recent logs |
| GET | `/reports?page=&limit=&status=` | Existing reports and reporter/target identities |
| GET | `/reports/:id` | Report and available resource details |
| PATCH | `/reports/:id/dismiss` | Dismiss open/reviewing report; reject stale/closed action |

Extended existing endpoints:

- `/users`: allowlisted `sortBy` (`name`, `email`, `createdAt`, `lastActiveAt`, `totalGoals`), `sortOrder`; adds verification and premium expiry fields.
- `/goals`: optional `userId`, allowlisted sorting (`title`, `category`, `createdAt`); existing search/status/pagination preserved.
- `/habits`: optional `userId`, allowlisted sorting (`name`, `createdAt`, `currentStreak`); exposes schedule and archive state; consistent recent-activity filtering and displayed status.
- `/login`: ten failed attempts per IP per 15-minute window using installed `express-rate-limit` and its process-local memory store.
- Existing `/analytics`, email and release APIs remain compatible.
- Existing `/api/v1/premium/{stats,expiring,expired,grant,revoke}` now require the scoped admin JWT. Integer grant duration is validated. Ordinary user tokens are rejected.

## Behavior and metric definitions

- Overview is the landing page. Users, Goals, Habits, Reports, Campaigns and Releases support deep links. Detail IDs are query parameters, so refresh keeps a detail drawer open.
- Date-range metrics use inclusive UTC dates, implemented with an exclusive next-day boundary. Total users/goals/habits are all-time. Active today uses `last_active_at` since UTC midnight.
- Goal progress activity counts existing `goal_updates` records created during the period. Habit activity counts daily `habit_logs` records by `occurred_at`, not individual completion timestamps. No percentage comparisons are invented.
- Weighted goal progress is computed on detail inspection through existing domain rules. If it cannot be computed, the UI explicitly says it is unavailable. No calculation is persisted by the admin view. Tables use completion state and an Inspect breakdown link rather than expensive per-row recomputation or presenting stale cached percentages.
- The legacy progress helper queries `isActive` although the current GoalDetails schema does not declare that field. Admin supplies its already-read goal details to the same calculation through an optional argument, avoiding that legacy selector. Existing user-facing callers are unchanged. Tests exercise the actual weighted calculation, including linked goals and habit target days.
- Habit Active means a log occurred in the past seven days. A new habit without logs is Inactive; archive state is separate. Best streak uses the greater existing streak field.
- User selection clears on search, explicit filters, sort, page or page-size changes. Selection is intentionally retained in the shell when opening Campaigns. Individual email preselects one account in the existing composer.
- CSV exports only the current queried page, quotes cells, and neutralizes spreadsheet formula prefixes. Search results/export wait for debounce to settle.
- Deactivation blocks ordinary authentication through existing `is_active` checks and clears both refresh tokens. It retains user content. Reactivation does not restore old refresh tokens.
- Premium controls represent timestamp-based entitlement, not an invented billing/subscription ledger. Existing active premium is extended according to the existing service.
- Configured `ADMIN_ALLOWED_IPS` is enforced on login and every admin-authenticated request, including legacy premium administration. Blank/unset means no allowlist restriction. IP resolution uses Express's trusted proxy chain instead of directly trusting raw forwarding headers. Existing server `trust proxy = 1` is retained.
- Login rate-limit counters are memory-only and instance-local; they reset on restart. No persistent rate-limit records are added.
- Admin 401 clears only the matching current admin token and redirects to admin login. Ordinary user auth remains separate. The admin UI remains available during product maintenance.
- Dialogs use focus containment/Escape support from the browser's native modal dialog, branded surfaces, and nested overlay scroll locking. Mutations show success/failure toasts and inline failure where relevant.

## Deferred or deliberately omitted

- **All Pass 2 implementation**: guided campaign audiences/review/test send/batching/opt-out changes, expanded release management, Product Control, promotions, configuration mutation, system health and jobs. Existing email/release functionality remains available; their workflows are not advertised as upgraded.
- Campaign history/drafts/scheduling and incident/job history would need durable history beyond the current product records. No such persistence is added.
- Historical DAU/WAU/MAU/retention and activity percentage comparisons are deferred because a single latest-activity timestamp is insufficient history.
- No speculative habit completion-rate denominator, schedule-history trend, or extra analytics history is created.
- Goal/habit removal and activity removal are omitted: cross-store cleanup/cascade behavior has not been established as a safe reversible moderation operation. Inspect content, dismiss a report, or use confirmed account deactivation instead.
- Password actions, MFA, RBAC and admin-account management are omitted. No password is exposed or directly changed.
- No new tables/collections, remote code/CSS/HTML editor, or admin audit system.

## Verification

Completed against synthetic fixtures; no live account mutation, email send or release publication was performed.

- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed. Existing Browserslist/PostCSS/bundle-size warnings remain.
- Backend `npm test -- --runInBand`: 23 suites / 178 tests passed, including new security, operation and actual weighted-progress tests.
- Backend `npm run lint`: blocked by the repository's missing ESLint configuration (the command existed before this work). Explicit checks for undefined identifiers/unreachable code on changed backend files passed using the installed ESLint.
- `api/tests/adminOperations.sql.cjs`: passed using isolated in-memory PGlite with fixtures of existing table structures. Verifies real PostgreSQL syntax, UTC ranges under a non-UTC database timezone, filters/sort/pagination counts, details and account transitions. Does not connect to or migrate an application database.
- `frontend/scripts/admin-pass1-smoke.cjs`: passed in headless Chrome at desktop and 390px mobile widths. Verifies deep-link login/refresh, selection resets, debounce, CSV contents, detail navigation, weighted progress, confirmation cancellation, account transitions, premium revocation, report dismissal, release-delete cancellation, mobile navigation/overflow and 401 session clearing. All API calls are intercepted with synthetic fixtures.
- `git diff --check`: passed.

The optional smoke tools are installed outside the repository in a temporary directory; application dependency manifests and lockfiles are unchanged. To reproduce the optional integration checks in PowerShell:

```powershell
$adminTestTools = Join-Path ([System.IO.Path]::GetTempPath()) 'wishtrail-admin-pass1-tools'
npm install --prefix $adminTestTools --no-audit --no-fund playwright@1.48.2 @electric-sql/pglite
$env:WT_ADMIN_TEST_TOOLS = $adminTestTools
node api/tests/adminOperations.sql.cjs
# Start frontend separately: npm run dev -- --host 127.0.0.1 --port 5175
node frontend/scripts/admin-pass1-smoke.cjs
```

The browser script uses installed Google Chrome, reads only the configured admin UI route from frontend env files, and intercepts API requests. Set `WT_ADMIN_TEST_ORIGIN` or `WT_ADMIN_UI_ROUTE` for a different test frontend. Synthetic screenshots are written beneath the temporary tools directory.

## Manual review checklist

1. Open the configured admin URL; sign in and verify Overview is the default. Refresh a Users/Goals/Habits detail URL.
2. Compare displayed totals/date-range records to a staging database. Check a UTC boundary and a period with no records.
3. Search/filter/sort/page Users. Select a page, change a filter and verify selection clears. Export a page and check CSV contents.
4. Inspect a user with disabled email notifications, a verified user, an expired-premium user, and a deactivated user. Check each detail section.
5. On staging accounts, cancel then confirm deactivate/reactivate and premium controls. Verify authentication state and retained content.
6. Inspect public/private and completed/active goals, including a weighted breakdown and a goal without extended details.
7. Inspect a new habit without logs, archived habit, custom schedule and repeated daily completions.
8. Review open/dismissed reports, a missing resource, and a stale dismissal. Confirm author/reporter navigation.
9. Verify existing email and release forms are still usable; cancel release deletion. Sending email/publishing is a separate staging verification action.
10. Test configured allowed/disallowed IPs, an expired token, ordinary user token rejection on premium administration, and failed-login throttling on staging.
11. At mobile width, open/close the drawer with keyboard and touch. Check horizontal tables, focus, Escape, empty/error/retry states, and absence of ordinary product navigation.

Stop after Pass 1 review. Do not begin Pass 2 automatically.
