# Weekly Trail implementation: lazy creation and six-month retention

Weekly Trail now has live weekly data, immutable completed recaps, responsive Home/detail views, and recap references merged into the existing Profile → My Trail timeline. The native app uses this same frontend in its WebView. Existing goal timeline behavior is preserved; All / Goals / Recaps filters are available. No Monthly Trail, sharing, or invented Momentum score is included.

## Enable

Apply the migration to the intended database before deploying the new API:

```powershell
cd api
node database/migrations/run_013_weekly_trail.js
```

The runner uses the existing database environment configuration. This migration has **not** been run against a connected database during implementation.

No Weekly Trail scheduler, cron route, timer, queue, recurring job, batch finalizer, or backfill endpoint remains. Inactive users receive no automatic processing. Nothing is generated merely because Monday arrives.

The user's explicit **do not backfill** instruction overrides the document's optional recent-history generation sections. Home and the initial My Trail/history request inspect only the previous completed local week. History pagination reads existing snapshots only. An explicitly requested older week can be created on demand if it qualifies, has retained source evidence, and is inside retention. Returning after a long absence never causes historical sweeps or creation of all missed weeks.

Configuration (positive integers; invalid values fall back to defaults):

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `WEEKLY_TRAIL_RETENTION_MONTHS` | 6 | Calendar-month retention |
| `WEEKLY_TRAIL_CLEANUP_BATCH_SIZE` | 25 | Expired rows deleted per relevant request; capped at 100 |
| `WEEKLY_TRAIL_MIN_ACTIVE_DAYS` | 2 | Qualification threshold |
| `WEEKLY_TRAIL_MIN_GOALS_COMPLETED` | 1 | Qualification threshold |
| `WEEKLY_TRAIL_MIN_GOAL_PROGRESS_EVENTS` | 2 | Qualification threshold |
| `WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS` | 3 | Qualification threshold |
| `WEEKLY_TRAIL_COMEBACK_GAP_WEEKS` | 4 | Gap between qualifying retained recaps for COMEBACK |

A completed recap is persisted only if **any** qualification threshold is reached. Feelings, passive activity, and account age never qualify a week. One routine completion does not create permanent storage. Current-week metrics remain live regardless of qualification.

Retention uses the user's local calendar date minus the configured number of months, clamping to the last valid day of the target month (August 31 minus six months becomes February 28/29). Weeks whose `end_local_date` is on or after the cutoff remain available. Relevant reads delete at most one configured batch of expired snapshots for that user. All history, teaser, detail, and seen-marker reads also enforce the cutoff independently, so an undeleted cleanup backlog is never exposed or recreated. Underlying goals, habits, updates, and logs are untouched. My Trail references are derived from snapshot summaries, so no separate orphan-reference cleanup is necessary.

## Contracts and persistence

- GET `/weekly-trail/current`: live current week only; never inserts a current-week snapshot.
- GET `/weekly-trail/teaser`: `NEW_RECAP`, `CURRENT`, or `NO_DATA`; after viewing, the latest completed summary carries `SEEN_RECAP` while Home displays the current week.
- GET `/weekly-trail/history?cursor=2026-W40&limit=20`: retained compact summaries, descending keyset pagination; limit capped at 50; response includes retention months and local cutoff.
- GET `/weekly-trail/:periodKey`: frozen completed recap or live current week; invalid/future keys return 400, non-qualifying, absent, or expired historical weeks return 404.
- POST `/weekly-trail/:periodKey/seen`: monotonic per-user last-seen marker.

All routes use existing authentication, derive ownership from `req.user`, and return `Cache-Control: private, no-store`. Prefix paths with the existing API base `/api/v1`.

`weekly_trail_snapshots` stores user ID, ISO period key, local date bounds, timezone, formula version, finalized timestamp, and compact JSON metrics/highlights. A `(user_id, period_key)` unique constraint and `ON CONFLICT DO NOTHING` make finalization safe under concurrent user requests. The loser reads the winning row; existing snapshots are never updated by calculation. The same index supports descending history; the unique constraint index also serves descending history via a backward scan; there are no additional Weekly Trail indexes. Recap IDs themselves serve as My Trail references because the existing My Trail is derived UI, not an event table. No second event system or duplicated snapshot body was introduced.

Typical recap JSON is roughly 0.7–2 KB, depending on titles and optional highlights, plus PostgreSQL row/index overhead. Formula version 3 uses current habit fields without schedule-history storage; earlier stored versions remain frozen. It holds at most seven active date keys, one win, one rhythm, two attention items, and emotion counts. No notes, journal prose, raw logs, photos, or activity arrays are stored. Snapshot titles survive entity deletion/renaming after finalization. Account hard deletion cascades snapshots ; existing account deactivation continues to retain data but blocks access, consistent with current account policy.

Weekly Trail creates only the snapshot table and optional user last-seen column. It reuses existing source tables and indexes. There is no habit schedule-history table, function, trigger, baseline, or source-table migration. The Habit service uses `is_archived`; optional `is_active` and `is_archived` flags are read through `to_jsonb(row)` so absent columns do not break aggregation. Missing flags default to active and not archived; existing false/true lifecycle values are respected. Goal completion uses `completed_at`, matching the existing Goal service.

## Exact calculations and reused data

- Monday through Sunday in the user's validated IANA timezone, with ISO week-year keys such as `2026-W41`. Local midnight conversion reuses `utility/timezone.js`, including DST; weeks are not fixed UTC durations. Current adherence includes dates through today, not future days. Stored snapshots keep their original timezone even when the user's setting changes.
- Unique progressed goals: `goal_updates` with nonblank `text`, matching existing Goal Metrics/Goal Health semantics, plus `goals.completed_at` in the period. Repeated updates and completion of the same goal count once toward progressed goals. Mood-only and administrative/social changes do not count.
- Goal progress events: count distinct meaningful goal/date updates (the source table allows one update per goal/day). This is separate from unique goals progressed. Completion independently qualifies through `goalsCompleted`.
- Habit completions: successful scheduled occurrences from `habit_logs`; canonical completion timestamps map to local dates, with retained legacy occurrence/date fallback. Skipped/missed logs are excluded. Each eligible day expects `daily_target_count` (default 1), and completions cap at that day's target. Extra repetitions are not extra scheduled occurrences.
- Denominator: sum of eligible daily targets. Daily habits use every eligible day; custom/weekly habits use explicit `days_of_week`. Empty custom schedules are not treated as misses. Dates before creation are excluded. Currently archived/inactive habits are excluded for the whole calculation. Current frequency, scheduled weekdays, and daily target apply to elapsed dates in the period. V1 does not reconstruct midweek status or schedule transitions.
- Consistency: rounded `100 * completed / eligible`, or null when no eligible schedule exists or the habit has an unrecognized/missing frequency. In that sparse-data case retained completions remain visible and adherence is unavailable with `HABIT_SCHEDULE_UNAVAILABLE`.
- Active days: unique local dates with a meaningful goal event or counted habit success, maximum seven.
- Biggest Win: latest goal completion, then stable entity-ID ordering. Numerical delta/milestone history is not stored in the existing goal schema, so those unsupported priorities are omitted instead of using current percentages as historical changes. No invented habit achievement is substituted.
- Strongest Rhythm: at least two eligible occurrences, positive completions, and known schedule; exact adherence ratio, then completion count, then stable ID. Historical streaks are not available, so they are not tie-breakers.
- Attention: up to two active, incomplete goals classified Slipping/Stalled by existing `deriveGoalHealth`, followed by active habits below 50% adherence with at least two eligible occurrences. Quiet weeks omit this section. No mood-driven attention.
- Feelings: explicit `goal_updates.emotion`, non-default habit moods, and `DailyLogsEntry.mood`; at least three samples. MongoDB queries project only mood and timestamp. Habit `neutral` is excluded because old writes use it as an implicit default; explicit neutral habit selections cannot be distinguished from defaults. Goal and journal explicit moods remain eligible. Feelings never affect progress.

## Source limits

There is no backfill. Explicitly requested historical recaps only describe retained evidence, not deleted raw history. Deleted goals/habits before finalization cannot have their original facts reconstructed. Schedule/target edits before snapshot generation can change adherence. Current archive state is applied without reconstructing when archiving occurred. This V1 tradeoff is intentional; no schedule changes are tracked by Weekly Trail. Historical numerical progress deltas, explicit major milestones, historical habit streaks, and a real Momentum service are absent, so those values are omitted/null. Goal attention for an explicitly requested older period uses retained goal status and last meaningful update as of its end; historical goal lifecycle transitions are not recorded. Finalized results remain frozen even if users later edit source activity.

Timezone changes keep ISO keys stable and cannot create two snapshots for a user/week. Events near a boundary in an unfinalized week use the newly configured timezone; already-finalized data does not move. Preserving the exact earlier timezone for every unfinalized historical week would require user timezone history that the application does not currently store.

## Narratives

New qualifying snapshots use `FIRST_TRAIL` when there is no earlier qualifying snapshot inside retention, `COMEBACK` when the nearest earlier qualifying snapshot is at least the configured gap away, and `WEEKLY_RECAP` otherwise. The UI renders first-trail/welcome-back copy. No percentage change against an empty calendar week is fabricated. Momentum remains null. These narratives describe retained history; no historical scan is performed to establish a first-ever event outside retention. Existing snapshot narratives are never rewritten when another week is opened later.

## UI and telemetry

Home uses the supplied mountain/blue visual direction with an original lightweight SVG landscape. Responsive detail provides consistency, four metrics, day markers, conditional highlights/feelings, quiet-week copy, week navigation, paginated history, retry states, and a link back to My Trail. My Trail combines snapshot summary references and existing goal milestones in month/year order. Stored entity titles render without fetching entities.

Datadog actions: `weekly_trail_teaser_viewed` fires when visible, `weekly_trail_opened`, `weekly_trail_history_viewed`, `weekly_trail_history_item_opened`. Backend logs `weekly_trail_finalized` only for the inserting request. Attention cards are informational, so there is no attention-action event. Event metadata contains period/current status, never private prose.

## Files

New backend: `database/migrations/013_weekly_trail.sql`, its runner, `src/services/weeklyTrailCalculator.js`, `weeklyTrailService.js`, `src/routes/weeklyTrailRoutes.js`, `src/config/weeklyTrail.js`, `src/services/weeklyTrailPolicy.js`, and three Weekly Trail test suites. Existing `server.js` registers authenticated routes. The former `weeklyTrailJobs.js` and both Weekly Trail cron/backfill routes have been removed; other feature jobs are unchanged.

New frontend: `src/components/WeeklyTrail.jsx`, `weeklyTrail.css`, `src/pages/WeeklyTrailPage.jsx`, `src/services/weeklyTrail.js`. Existing `App.jsx`, `HomeOverview.jsx`, `ProfilePage.jsx`, and `ContextualSidebar.jsx` provide entry points. Pre-existing auth and other working-tree edits were preserved.

## Verification

Targeted Jest suites cover local/ISO/DST boundaries, unique goal/day counting, midweek creation, daily targets, archived/custom schedules, missing frequency, malformed legacy timestamps, deterministic highlights, attention limits, mood thresholds, live changes, immutable reads, conflict-safe finalization, bounded history, qualification thresholds, calendar-month retention, bounded owner-scoped cleanup, expired access/recreation rejection, first/comeback narratives, no-backfill behavior, read-marker ownership, and authenticated API contracts. Existing Goal Metrics, Goal Health, and habit timezone tests are included.

Latest lifecycle-column fix: all 54 tests across the three Weekly Trail Jest suites pass. The prior broader run passed 78 tests across six suites. The production frontend build passes (existing Browserslist, PostCSS, and bundle-size warnings remain). Actual database migration/constraint execution, a real multi-connection PostgreSQL race, and browser/native visual testing were not run in this workspace. Concurrency/SQL behavior is verified at the mocked service contract level, not claimed as live database integration testing. No commit, push, or deployment was performed.
