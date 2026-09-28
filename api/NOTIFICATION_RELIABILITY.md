# Notification reliability implementation

Implemented from `WishTrail_Notification_Reliability_Implementation_Spec.docx`. No commits, pushes, production database operations, or live push sends were performed.

## Behavior

- Motivation: user-local 08:00 inclusive to 10:30 exclusive.
- Daily-log reminders: user-local 20:00 inclusive to 22:00 exclusive, only if no current local-day journal entry exists.
- Both require enabled master/topic preferences and an active mobile FCM-capable token before creating a claim or history. Mutable eligibility is checked again before delivery.
- PostgreSQL string IDs normalize to safe integers before MongoDB lookups. Invalid identifiers fail closed. Genuinely absent preferences retain existing defaults; current topic settings are daily/off booleans.
- Journal timestamps use a half-open UTC interval calculated from local midnight and the next local midnight, including daylight-saving changes.
- Non-critical push is suppressed from 22:00 inclusive to 08:00 exclusive. Relevant social history remains available; quiet-hour alerts are not replayed in a morning burst.
- Likes for the same recipient/type/target aggregate in fixed ten-minute buckets. The first insert may push; further actors update one history entry. Follow requests, comments, replies, mentions, and follows retain their separate context.
- Push uses normal Android priority, normal web urgency, APNs priority 5, and no explicit sound. OS/channel settings still determine actual presentation. No existing type is designated critical.
- Daily-log pushes now link to the existing dashboard route instead of the nonexistent bare `/profile` route.

## Persistence and retries

New MongoDB `ScheduledNotificationDelivery` records contain `userId`, `notificationType`, `localDate`, `status`, `attemptCount`, `claimedAt`, `claimToken`, `sentAt`, `retryable`, `lastErrorCode`, `createdAt`, and `updatedAt`.

```js
{ userId: 1, notificationType: 1, localDate: 1 } // UNIQUE
{ createdAt: 1 } // TTL expireAfterSeconds: 604800
```

An insert atomically claims the daily key. The unique index rejects concurrent duplicates. Retryable FAILED records can be reclaimed after five minutes; CLAIMED records after a ten-minute lease. There are at most three attempts, and each retry must still satisfy the local-time window and eligibility checks. A new random fencing token prevents an old worker from overwriting the replacement owner's outcome. Ownership is checked again before provider submission. Claim indexes are explicitly ensured before processing, even with automatic index creation disabled.

- `CLAIMED -> SENT`: at least one FCM submission succeeded. This is not proof the user saw the notification.
- `CLAIMED -> FAILED`: provider rejection, changed eligibility, or operation failure. Only retryable failures can be reclaimed.
- Stale `CLAIMED -> CLAIMED`: lease recovery increments attempts and replaces the fencing token.
- `SENT`: never retried for that local day.

The claim ID is reused as the notification-history ID, preventing additional history rows on retries. Partial provider acceptance is treated as success to avoid re-alerting devices that already accepted the message; failed devices in that batch are not separately retried.

The new daily cleanup deletes only internal delivery records older than seven days. MongoDB TTL provides asynchronous cleanup as well. Journals and notification-center history are untouched by this cleanup; existing 30-day history retention elsewhere remains unchanged.

Additional schema/index changes:

- Notification: one sparse unique `lifecycleKey`, current `aggregateActors`, and persisted `priority`.
- NotificationPushBudget: unique `(userId, localDate)` and seven-day `createdAt` TTL. Records are created only when the optional numeric cap is enabled.
- DailyLogsEntry: `(userId, createdAt)` index.
- DeviceToken: `(userId, isActive, platform)` index.

## Deployment

From `api/`, run the additive index installer with the existing `MONGODB_URI`:

```sh
node scripts/ensure-notification-indexes.js
```

It creates indexes without dropping collections or existing indexes. No PostgreSQL schema migration is needed. The installer was not run against production; indexes were created and verified in temporary MongoDB integration tests.

Deploy API/indexes first, then frontend and rebuilt mobile app, then the updated workflow on the default branch. Old app builds cannot perform the new logout handshake. Verify permissions, account switching, logout/offline recovery, background arrival, and notification taps on actual Android/iOS devices.

Existing required configuration: MongoDB, PostgreSQL, Firebase Admin credentials, `CRON_SECRET` in the API and GitHub Actions, and the API base URL in the workflow. The MongoDB role needs index-creation permission. Redis remains optional for delivery correctness and only assists quote personalization.

New optional setting: `NOTIFICATION_DAILY_PUSH_CAP=0`, disabled by default. A proposed starting threshold is **20 non-actionable push attempts per user per local day**, subject to product review and usage data; it is not enabled. Actionable follow/community join requests bypass the cap. Preferences, quiet hours, and aggregation run before budget suppression. Reserved attempts count even if the subsequent provider call fails.

## Device lifecycle and limits

Registration requires authentication, associates tokens with that authenticated account, deactivates prior-account associations for the same token, and keeps other physical devices active. Valid native timezone information updates the canonical PostgreSQL user timezone.

Native logout requests backend unregister before local auth is cleared, deletes the stored refresh credential, and revokes the local FCM token. Failed unregister is stored in SecureStore and retried on startup/resume and before new registration. The bridge waits at most ten seconds; unregister requests time out after eight seconds. Expired credentials cannot complete backend unregister, leaving local token revocation and later invalid-token feedback as fallbacks. Browser logout also attempts unregister, revokes its token, and clears registration bookkeeping.

Uninstall is not immediately detectable. Invalid/unregistered FCM responses deactivate stale tokens. Fully offline logout cannot guarantee immediate backend deactivation or provider revocation.

The current app uses React Native Firebase/FCM, not Expo push tickets. Legacy Expo-formatted tokens are excluded from FCM eligibility; no separate Expo receipt system was added. FCM per-token submission responses are processed, but this integration has no end-user delivery receipt.

Exactly-once external delivery cannot be guaranteed across provider acceptance followed by a crash before saving SENT. Lease recovery can resubmit at that boundary. Stable IDs/tags reduce duplicate history/presentation but do not eliminate the provider boundary.

## Cron

Tabs were replaced with valid YAML indentation. Secrets are sent as headers, not URL parameters. Workflow timeouts and schedule concurrency controls supplement MongoDB claims.

| UTC schedule | Work |
| --- | --- |
| `0 * * * *` | Motivation and daily-log eligibility checks |
| `0 1 * * *` | Optional nightly quote generation |
| `0 2 * * *` | Seven-day internal delivery cleanup |

Hourly UTC execution normally reaches India at 08:30/20:30 local time. GitHub delays can move it later; reminders outside their windows are skipped. Redis outages cannot bypass persistent duplicate protection.

References: [MongoDB TTL behavior](https://www.mongodb.com/docs/manual/core/index-ttl/), [FCM error codes](https://firebase.google.com/docs/cloud-messaging/error-codes), [FCM normal priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority), [GitHub scheduling limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Verification

Final command results and the changed-file manifest follow below. Live production credentials, actual device delivery, device sound behavior, iOS native build, signed Android APK, and physical-device permission/logout UI were not verified.

| Command / working directory | Result |
| --- | --- |
| `npm test -- --runInBand` in `api/` | 52 passed, 0 failed; 4 suites |
| `node --test api/tests/notificationReliability.integration.cjs` from root with `WT_MONGO_TEST_MODULE` set | 18 passed, 0 failed; real temporary MongoDB 7.0.24, mocked FCM |
| `node --test tests/mobileInteractions.test.cjs tests/onboardingState.test.cjs` in `app/` | 8 passed, 0 failed |
| `node --test tests/startupSession.test.mjs` in `frontend/` | 5 passed, 0 failed |
| `npm run build` in `frontend/` | Passed; existing Browserslist and chunk-size warnings |
| `npx expo export --platform android --output-dir <temporary directory>` in `app/` | Passed; Hermes bundle, not a signed APK |
| `npm run lint` in `api/` | Blocked: no repository ESLint configuration |
| `npm run lint` in `frontend/` | Blocked: existing `@typescript-eslint/recommended` config cannot be resolved |
| Workflow parsing with installed `js-yaml` | Passed |
| `git diff --check` | Passed |

83 tests passed across the final suites. Integration tests cover real unique-index contention with 24 workers, Redis failure, bounded retries, stale-owner fencing, seven-day cleanup isolation, journal boundaries, quiet hours/history, aggregation, opt-out during aggregation, repeat likes, optional-budget contention, partial provider success, logout, and invalid-token deactivation. A Node 18 AbortSignal listener warning was emitted; the suite completed with exit code 0.

Reproduce the optional integration tests without changing application dependencies:

```powershell
npm install --prefix "$env:TEMP/wishtrail-notification-test" mongodb-memory-server@10 --no-audit --no-fund
$env:WT_MONGO_TEST_MODULE = "$env:TEMP/wishtrail-notification-test/node_modules/mongodb-memory-server"
node --test api/tests/notificationReliability.integration.cjs
```

The first run downloads a MongoDB binary. Tests use temporary databases, not production URLs or provider credentials. Initial test-harness runs completed their cases but hung during top-level cleanup; grouping the tests into a suite fixed Node 18 teardown. The final run exited successfully. An initial root-level `npm test` invocation found no root package.json; backend results above are from `api/`.

## Changed-file manifest

Files changed for this reliability task:

- `.github/workflows/cron.yml`
- `api/env.example`
- `api/NOTIFICATION_RELIABILITY.md` (new report)
- `api/scripts/ensure-notification-indexes.js` (new)
- `api/src/controllers/notificationController.js`
- `api/src/models/DailyLogsEntry.js`
- `api/src/models/DeviceToken.js`
- `api/src/models/Notification.js`
- `api/src/models/NotificationPushBudget.js` (new)
- `api/src/models/ScheduledNotificationDelivery.js` (new)
- `api/src/routes/cronRoutes.js`
- `api/src/routes/notificationRoutes.js`
- `api/src/services/dailyLogsService.js`
- `api/src/services/motivationService.js`
- `api/src/services/notificationPolicy.js` (new)
- `api/src/services/pushService.js`
- `api/src/services/scheduledDeliveryService.js` (new)
- `api/src/services/scheduledNotificationService.js` (new)
- `api/src/services/__tests__/notificationReliability.test.js` (new)
- `api/tests/notificationReliability.integration.cjs` (new)
- `app/index.js` (extends earlier mobile fixes)
- `app/tests/mobileInteractions.test.cjs` (extends earlier tests)
- `frontend/src/services/api.js`
- `frontend/src/services/nativeNotifications.js` (extends earlier permission work)
- `frontend/src/services/webPush.js`
- `frontend/src/store/apiStore.js`

Earlier requested changes remain uncommitted in `frontend/src/App.jsx`, `frontend/src/components/CreateHabitModal.jsx`, `frontend/src/components/EditHabitModal.jsx`, `frontend/src/components/settings/NotificationsSection.jsx`, `frontend/src/pages/FeedPage.jsx`, and new `app/webViewGestures.js`. These were not reimplemented during this task.

## Working-tree diff statistics

The following is `git diff --stat` against HEAD, including earlier uncommitted mobile/modal work. New untracked files are excluded by Git from this command and are listed in the manifest above.

```text
 .github/workflows/cron.yml                         |  97 +++---
 api/env.example                                    |   6 +-
 api/src/controllers/notificationController.js      |  38 +--
 api/src/models/DailyLogsEntry.js                   |   2 +
 api/src/models/DeviceToken.js                      |   2 +
 api/src/models/Notification.js                     |  79 +++--
 api/src/routes/cronRoutes.js                       |  13 +-
 api/src/routes/notificationRoutes.js               |   6 +-
 api/src/services/dailyLogsService.js               |  85 +-----
 api/src/services/motivationService.js              | 106 +------
 api/src/services/pushService.js                    | 332 +++++----------------
 app/index.js                                       | 283 ++++++++----------
 frontend/src/App.jsx                               |  42 +++
 frontend/src/components/CreateHabitModal.jsx       |  20 +-
 frontend/src/components/EditHabitModal.jsx         |  25 +-
 .../components/settings/NotificationsSection.jsx   | 139 +++++----
 frontend/src/pages/FeedPage.jsx                    |  30 +-
 frontend/src/services/api.js                       |   2 +-
 frontend/src/services/webPush.js                   |  14 +-
 frontend/src/store/apiStore.js                     |   4 +
 20 files changed, 517 insertions(+), 808 deletions(-)
```
