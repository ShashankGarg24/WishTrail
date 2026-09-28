Social notification lifecycle — implementation and rollout

Reversible notifications now reflect PostgreSQL relationship state. Unlike and
unfollow reconcile the notification before the action response, with notification
errors isolated from the primary action. Delivered device pushes remain untouched.

Likes use one current aggregate per recipient/type/target, replacing the previous
10-minute history buckets. Membership and the displayed representative/count come
from current likes; the last unlike deactivates the aggregate. Follow and request
notifications use recipient/type/actor identities. A sparse unique `lifecycleKey`
index prevents competing writers from creating duplicate canonical records.

Reconciliation reads Mongo's built-in `__v` before reading source state and
conditionally increments it. Conflicting writers retry with fresh source data. PostgreSQL
like/follow mutation transactions also serialize each relationship using advisory
locks. Notification reads reconcile retained records to repair missed cleanup.
Reactivation resets unread state and the display timestamp; actor removal alone
does neither. Dismissal is retained until source state changes.

Cancelled/rejected requests are deactivated. Acceptance resolves the request,
creates/reactivates the follower notification, and retains the separate acceptance
event. New comments, replies and mentions carry the actual source comment ID in
the existing `data.commentId` field.
Source identity deduplicates repeated creation, including duplicate mentions.
Comment query-deletion middleware invalidates dependent notifications and replies;
reads and push dispatch recheck source existence. Comment messages contain no text
preview, so editing comment text requires no preview rewrite or new notification.

Push eligibility is independent of active in-app state. The default
`SOCIAL_NOTIFICATION_PUSH_COOLDOWN_SECONDS=600` is configurable. Each like aggregate
shares a cooldown across its actors, preserving grouped push behavior; each follow
action uses its own actor/recipient key. The atomic claim survives invalidation and
dismissal. Removal never sends a push. Master/social settings and explicit channel
opt-outs remain enforced. Failed push attempts retain their claim to avoid spam.
Provider delivery stays asynchronous. The optional daily cap also now retries
concurrent insert collisions without mistakenly treating them as an exhausted cap.

Goal push URLs now open the route's goal. The modal fetches current data, closes
with a message when the goal is unavailable, and ignores stale requests after
navigation. Deleted comments still link to the parent goal or feed. The notification
page fetches fresh state on entry and foreground return instead of using its
five-minute cache. This is refresh-based consistency, not a new realtime transport.

MongoDB lifecycle fields retained on Notification:

- `active`, `lifecycleKey`, `aggregateActors`, and `lastPushAt`
- `dismissed` is stored only when a user explicitly dismisses a notification

MongoDB lifecycle index retained:

- `{ lifecycleKey: 1 }`, unique and sparse, named `notification_lifecycle_unique`

The one-time `social-notification-storage-v2` deployment migration removes redundant
`aggregationKey`, `invalidatedAt`, `sourceId`, `lifecycleRevision`, and
`sourceSignature` values. Before removing `sourceId`, it copies any missing source
into `data.commentId`. It also drops the old aggregation, source, and active-list
indexes. Mongo's existing `__v` field provides compare-and-swap ordering.

There are no PostgreSQL schema changes. ScheduledNotificationDelivery and its
seven-day retention are unchanged; social events never use that collection.

Production migration completed at `2026-09-28T15:40:25.590Z`, confirmed by the
`migration.social_notifications.completed` log for `wishtrail-backend-prod`, with
`recipients: 3` and migration ID `social-notification-lifecycle-v1`.

The storage cleanup completed in production at `2026-09-28T19:29:04.333Z` for seven
documents and removed `notification_like_group_unique`,
`userId_1_active_1_createdAt_-1`, and `sourceId_1_active_1`. Its temporary startup
hook has been removed. Keep both completed migration markers in MongoDB collection
`deployment_migrations`; the migration module and tests remain as an audit and
manual recovery path.

Manual repair remains available from `api/` with the normal database environment:

```powershell
node scripts/reconcile-social-notifications.js --apply
```

This manual script intentionally reruns reconciliation even after the automatic
migration has completed. It ensures indexes itself and sends no pushes.

Deploy both the API and hosted frontend. No Android/iOS release is needed for these
changes: the native app loads the hosted frontend in its WebView, and no native
code or app permissions changed. Existing users pick up the web changes on reload.

Limits to retain in operational expectations:

- Old activity-comment notifications did not store the comment ID, and old reply
  notifications stored only the parent ID. Exact deleted-child attribution cannot
  be reconstructed reliably for those records. New records have exact source IDs;
  legacy mentions/replies can still be checked against their stored comment/parent.
- Read reconciliation repairs existing records after a secondary database failure.
  There is no cross-database transaction or durable event outbox: a first notification
  lost during a complete MongoDB outage cannot be replayed automatically.
- Reconciliation adds source database reads. It processes logical notifications in
  batches of eight; notifications with large retained histories need latency monitoring.
- No new comment editing/deletion UI or endpoints were introduced. Existing model
  deletion paths and subsequent reads perform the cleanup.

Verification performed:

```powershell
# From api/
npm test -- --runInBand
# 10 suites, 70 tests passed.

# From the repository root; uses the existing isolated Mongo test dependency.
$env:WT_MONGO_TEST_MODULE="$env:TEMP/wishtrail-notification-test/node_modules/mongodb-memory-server"
node --test api/tests/notificationReliability.integration.cjs
# 39 tests passed against an isolated real MongoDB instance.
# PostgreSQL source state and FCM are stubbed; no live database/device E2E claim.

node --test frontend/tests/notificationRequests.test.mjs
# 2 tests passed.

# From frontend/
npm run build
# Passed; existing Browserslist, mixed-import and bundle-size warnings remain.

# From api/ and frontend/, respectively
npm run lint
# API blocked: no ESLint configuration.
# Frontend blocked: missing @typescript-eslint/recommended configuration.

# From repository root
git diff --check
# Passed.
```

The Mongo suite covers source reversals, concurrent creation, stale-source CAS,
cooldown, removal without push, read/dismiss state, migration, request resolution,
comment/reply/mention deletion, source validation before push, API list/count
filtering, preferences, daily-cap races, and the existing scheduled reminders.
Additional Jest cases exercise PostgreSQL service contracts and the actual goal
controller's like and unlike branches with injected dependencies.

Changed files:

- `api/env.example`
- `api/scripts/reconcile-social-notifications.js`
- `api/src/controllers/activityController.js`
- `api/src/controllers/goalController.js`
- `api/src/controllers/notificationController.js`
- `api/src/controllers/socialController.js`
- `api/src/server.js`
- `api/src/migrations/socialNotificationDeployment.js`
- `api/src/migrations/notificationStorageCleanup.js`
- `api/src/services/__tests__/notificationStorageCleanup.test.js`
- `api/src/services/__tests__/socialNotificationDeployment.test.js`
- `api/src/models/ActivityComment.js`
- `api/src/models/Notification.js`
- `api/src/services/activityService.js`
- `api/src/services/pgFollowService.js`
- `api/src/services/pgLikeService.js`
- `api/src/services/pushService.js`
- `api/src/services/socialNotificationLifecycle.js`
- `api/src/services/__tests__/socialActionContracts.test.js`
- `api/tests/notificationReliability.integration.cjs`
- `frontend/src/components/GoalPostModal.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/pages/FeedPage.jsx`
- `frontend/src/pages/NotificationsPage.jsx`
- `docs/social-notification-lifecycle.md`
