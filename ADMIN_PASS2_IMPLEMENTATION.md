# WishTrail admin — Pass 2 implementation

Scope: **PASS 2 only** of `WishTrail_Admin_Redesign_Codex_Two_Pass_Spec.docx`. The complete document was read and the current implementation was inspected before edits. The user explicitly authorized Pass 2; the document's example prompt to start with Pass 1 was treated as an example, not a replacement for that request.

**No new application database tables, MongoDB collections, schema migrations, audit system, code editor, or dependencies. No commit or push.** Existing, uncommitted Pass 1 work was retained. Verification used synthetic browser responses and ephemeral fixtures, with no live email sends, release publications, application-config mutations, or application database connections.

## Inspection and implementation map

| Area | Existing code/persistence reused | Pass 2 result |
| --- | --- | --- |
| Shell | `AdminPage.jsx`, `AdminLayout.jsx`, `AdminSidebar.jsx`, shared admin components, configurable UI/API prefixes | Separate Campaigns, Releases, Product Control routes; shared confirmation/loading/error behavior |
| Audiences | PostgreSQL `users` and `goals`; MongoDB `UserPreferences.notifications.email.enabled` | Selected, all active, inactive over X days, active accounts with no goal records; opt-outs excluded |
| Email | `emailService.sendAdminBroadcastEmail`, its escaped HTML/plain-text templates and SMTP infrastructure | Audience → Content → Preview → Review → Send; configured-address test send; bounded delivery; current-operation results |
| Releases | `product_updates`, `productUpdateService.js`, existing public What's New behavior | Search/sort/API pagination, editor, plain-text responsive previews, publish/delete confirmations, campaign handoff |
| Product Control | Existing MongoDB `Config` model and `maintenance_mode` consumer | Admin-only validated maintenance control and public maintenance message |
| Promotions | Existing `Config` collection, new allowlisted `promotion` key | Safe structured contract, save/reload, predefined announcement-card previews; live placement explicitly deferred |
| Premium and other flags | Existing premium admin authorization from Pass 1; `config/premiumFeatures.js`, frontend feature constants and environment configuration | Existing premium grants retained; source/deployment settings are not presented as live remote controls |

The existing `Config` model already provides a key/value mechanism. No replacement store was added. Product Control has no generic key/value editor. Writes use only allowlisted, validated settings. Existing `updatedBy` is not repurposed to record admin identities or history.

## Files changed for Pass 2

Backend:

- `api/src/services/adminCampaignService.js`: validated audiences/content, eligibility scans, signed review, test send and bounded delivery.
- `api/src/services/adminProductService.js`: maintenance/promotion contract validation and existing Config persistence.
- `api/src/controllers/adminPass2Controller.js`: admin campaign/product endpoints and release lookup.
- `api/src/routes/adminRoutes.js`: register Pass 2 operations behind existing admin authentication.
- `api/src/controllers/adminController.js`: release pagination/search/sort integration and input validation; remove obsolete immediate-send handler.
- `api/src/services/adminService.js`: remove obsolete unbounded, opt-out-unaware broadcast implementation.
- `api/src/services/productUpdateService.js`: parameterized admin release search/pagination with allowlisted sorting; public list behavior preserved.
- `api/src/services/emailService.js`: WishTrail blue palette for the existing admin campaign template only.
- `api/src/routes/configRoutes.js`, `api/src/controllers/configController.js`: admin authentication and allowlisted validation for legacy config administration.
- `api/src/middleware/maintenanceMode.js`: configured admin prefix remains reachable during maintenance; replace broad health substring exemption with exact health/status paths.
- `api/src/services/adminService.js`, `api/src/services/adminOperationsService.js`: habit admin reads tolerate deployed schemas without `habits.is_archived`, falling back to the existing `is_active` status without a migration.
- `api/src/services/__tests__/adminPass2.test.js`, `api/tests/adminPass2.sql.cjs`.

Frontend:

- `frontend/src/pages/AdminPage.jsx`, `frontend/src/admin/AdminLayout.jsx`, `frontend/src/admin/AdminSidebar.jsx`, `frontend/src/services/adminApi.js`: routes, navigation, title and API bindings.
- `frontend/src/admin/campaigns/CampaignsPage.jsx`, `presets.js`: guided composer, retained copy presets, real audience targeting, email-template preview, review, test send and results.
- `frontend/src/admin/releases/ReleasesPage.jsx`, `ReleasePreview.jsx`: release management and responsive What's New preview semantics.
- `frontend/src/admin/product/ProductPage.jsx`, `PromotionCard.jsx`: maintenance control and saved promotion contract with mobile/web previews of the same predefined component.
- `frontend/src/admin/admin.css`: scoped forms, workflow, preview and responsive styles.
- Removed the replaced `frontend/src/admin/legacy/LegacyOperations.jsx`.
- `frontend/scripts/admin-pass2-smoke.cjs`; adjusted the release-confirmation title assertion in `admin-pass1-smoke.cjs` for the upgraded screen.
- This handoff document. `ADMIN_PASS1_IMPLEMENTATION.md` remains the historical Pass 1 handoff.

## Endpoints

Paths are relative to the existing configured `/api/v1/<admin-segment>` prefix. All require the existing admin JWT and configured IP checks.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/campaigns/options` | Configured test address; no arbitrary recipient input |
| POST | `/campaigns/review` | Validates audience/content, queries eligibility/exclusions, returns normalized content, actual email-template previews, and a 10-minute review token |
| POST | `/campaigns/test` | Sends current validated copy to `ADMIN_TEST_EMAIL`, falling back to a valid `ADMIN_EMAIL` |
| POST | `/campaigns/send` | Requires review token and `confirmed: true`; revalidates content/audience before delivery |
| POST | `/email/send` | Legacy URL now uses the same reviewed/confirmed send contract; immediate sends are rejected |
| GET | `/product-updates` | Existing endpoint extended with `search`, allowlisted `sortBy` (`createdAt`, `version`, `title`, `type`), `sortOrder`, `page`, `limit` |
| GET | `/product-updates/:version` | Exact release lookup for deep-linked campaign handoff |
| POST / PUT / DELETE | `/product-updates[/:version]` | Existing create/update/delete retained, with stricter text/length/type/version validation on writes |
| GET | `/product-control` | Maintenance, saved/default promotion contract and explicit deployment-required boundaries |
| PUT | `/product-control/maintenance` | Boolean `enabled` and plain-text `message` up to 500 characters |
| PUT | `/product-control/promotion` | Structured, validated predefined promotion contract |

Legacy `/api/v1/config` administrative reads/writes/deletes now require admin JWTs rather than ordinary user authentication. Writes/deletes allow only `maintenance_mode` and `promotion`. `GET /config/maintenance` remains public and compatible; `PUT /config/maintenance` validates a real boolean. Admin recovery uses the new admin-prefixed endpoints even while maintenance is active.

## Campaign behavior and limits

- All segments require `users.is_active = true`. Inactivity uses `COALESCE(last_active_at, created_at)` and the selected day threshold. No-goals uses `NOT EXISTS` against actual `goals` rows rather than potentially stale cached totals.
- Explicit email opt-outs are excluded. Missing preferences retain the product's established default of email enabled. Invalid/missing addresses are excluded. Review shows these counts and, for selected users, inactive/missing account exclusions.
- Selected IDs are validated, deduplicated and capped at 1,000 per request. Users can still target the entire eligible audience through computed segments.
- Copy presets do not change targeting. The existing presets and optional ending are retained. Linked releases are checked for existence. The release handoff is a deep-link query parameter, not saved campaign state.
- Email preview uses the existing server-generated escaped template in a sandboxed iframe. CTA URLs must resolve to the configured frontend origin or supported WishTrail HTTPS origins; credentials, script schemes and third-party origins are rejected.
- The signed review binds normalized targeting, content, eligibility counts and eligible recipient IDs/email addresses to the admin identity. Review tokens have a separate scope from login tokens and cannot authenticate admin API requests.
- On send, audience/content drift or expired reviews return 409 and require review again. Actual recipients never expand beyond the verified send snapshot. Each delivery batch rechecks active state, email identity and email opt-outs. Cross-store changes cannot be made atomic; the checks occur immediately before each batch.
- PostgreSQL/MongoDB reads use batches of 200. SMTP delivery uses at most five concurrent calls. The verified recipient snapshot is held in process memory for the current request; there is no queue, job record, draft, campaign history or scheduled task.
- Results include requested/attempted/sent/failed/skipped counts and up to ten failed user IDs with a safe troubleshooting message. SMTP internals are not returned.
- Review-token replay is blocked in the current API process until expiry. This is a short-lived security guard, not durable history or cross-instance exactly-once delivery. Restarting or using another instance loses that guard. A hosting timeout, crash or connection loss can leave delivery outcome uncertain. The UI tells the operator to keep the page open and review before retrying; a repeat campaign may deliver duplicates.

## Releases and Product Control

- `product_updates` has no draft/publication-status field. Saving creates/updates a release immediately visible in the existing public list. No field is overloaded to imitate drafts and no schema expansion was made.
- Major/minor uses the existing `is_major` field. Major releases remain eligible for the existing What's New prompt and its existing version-comparison rules. This does not force all users to see a release again. Plain text and line breaks follow existing What's New semantics; mobile/web previews are responsive layout previews, not app emulators.
- Saving offers Open What's New and Create a campaign actions. Deletion requires the shared custom confirmation.
- Maintenance is a real runtime setting. The admin UI and configured admin API prefix remain available to disable it. Product requests still receive the existing maintenance response.
- Promotion fields: enabled, title, subtitle, CTA label/WishTrail link, offer copy, UTC start/end, audience (`all`, `free`, `premium`) and fixed `announcement_card` surface. Dates, lengths and enum values are validated server-side. Price/offer copy is display text, not a billing change.
- Promotion save/reload uses existing Config persistence. **No existing user-facing promotion placement was found.** Both previews use `PromotionCard`, and the screen explicitly says live placement is deferred. Enabled/date/audience values are a stored contract for a future reviewed deployment, not active targeting or display behavior.
- Absent remote fields return disabled/default contracts. No new public remote-config consumers or native app changes were introduced. Existing premium authorization fixes and grant/revoke controls remain in place from Pass 1.

## Deferred / omitted

- Campaign history, persisted drafts, scheduling, durable retries and delivery history: not implemented; would need additional durable workflow/history infrastructure.
- Draft/Published releases: existing schema lacks a suitable field. Revision history/rollback and rich text editing are excluded.
- Live promotion placement and its audience/date evaluation: require a deliberate user-facing deployment. Runtime config persistence itself is supported by the existing store and is implemented.
- Remote feature switches, minimum/latest native version, force update and rollout controls: no established runtime consumers were found. They are listed as deployment-required instead of displaying ineffective toggles.
- Premium feature limits, navigation/component/CSS changes, API URLs/authentication and database configuration remain deployment responsibilities.
- Optional system health/jobs/history were omitted. No monitoring persistence was introduced.

## Verification

- Baseline before Pass 2: frontend lint/build passed; 23 backend suites / 178 tests passed.
- Final frontend `npm run lint` and `npm run build`: passed. Existing Browserslist, PostCSS and bundle-size warnings remain.
- Final backend `npm test -- --runInBand`: 24 suites / 188 tests passed.
- `node api/tests/adminOperations.sql.cjs` and `node api/tests/adminPass2.sql.cjs`: passed against isolated in-memory PGlite fixtures of existing tables; no application database used.
- `node frontend/scripts/admin-pass1-smoke.cjs`: passed regression checks for login/deep links, filters, selection, CSV, details, account/premium/report actions, mobile navigation, cancellation and 401 handling.
- `node frontend/scripts/admin-pass2-smoke.cjs`: passed desktop/mobile workflow checks for reviews, cancellation, test delivery, results, stale reviews, release search/pagination/publication/campaign handoff, maintenance confirmation and promotion save/reload. All API operations are synthetic fixtures. Pass 2 script blocks unrelated external network requests.
- Backend `npm run lint`: still blocked by the pre-existing missing ESLint configuration. Explicit `no-undef` / `no-unreachable` checks passed on Pass 2 backend files using the installed ESLint with Node/ES2022/Jest environments.
- `git diff --check`: passed.

Optional SQL/browser tools use the existing external temporary installation from Pass 1. No dependency manifest or lockfile was changed:

```powershell
$env:WT_ADMIN_TEST_TOOLS = Join-Path $env:TEMP 'wishtrail-admin-pass1-tools'
node api/tests/adminOperations.sql.cjs
node api/tests/adminPass2.sql.cjs
# Frontend must run separately on the configured test origin:
# cd frontend; npm run dev -- --host 127.0.0.1 --port 5175
node frontend/scripts/admin-pass1-smoke.cjs
node frontend/scripts/admin-pass2-smoke.cjs
```

Set `WT_ADMIN_TEST_ORIGIN` or `WT_ADMIN_UI_ROUTE` if needed. Synthetic screenshots are under the external tools directory's `artifacts` folder.

## Manual staging checklist

1. Open the configured admin URL and refresh each Pass 2 route. Verify the sidebar and mobile drawer, keyboard focus, dialogs and error/retry behavior.
2. Compare each audience's estimate with staging records, including opted-out, deactivated, missing-email and no-goals accounts. Verify writing presets leave targeting intact.
3. Configure an approved `ADMIN_TEST_EMAIL` (or valid `ADMIN_EMAIL`), send only a test, and inspect text/HTML content, ending, greeting and CTA in a mailbox.
4. Review a small, approved staging audience. Cancel final confirmation, then explicitly send. Verify opt-outs receive nothing and the result counts match provider delivery behavior. Change an audience or let review expire and verify review is required again.
5. Search/sort/page releases, preview mobile/web, and cancel publication/deletion. Publish an approved staging release, verify What's New, and open its prefilled Campaign without sending.
6. Verify ordinary user tokens cannot administer config or call Pass 2 admin endpoints. Test configured admin prefix and allowed-IP restrictions.
7. On staging, enable maintenance with a public message; verify product access is blocked, admin login remains reachable, and the admin maintenance endpoint can restore service.
8. Save/reload a promotion contract; verify validation and responsive previews. Verify the UI clearly says live placement is deferred and no user-facing offer appears merely from saving.
9. Confirm absent Config records preserve defaults and ordinary frontend/native behavior. No deployment environment variable should appear writable through Admin.
