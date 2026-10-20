# API request audit

This is a source-code audit, not a recording of authenticated browser traffic.
Actual counts depend on cached data, the selected tab, push events and user actions.

| Surface | Finding and action |
| --- | --- |
| Shared API client | Concurrent identical GETs could reach the server separately before store caches were populated. They now share a pending promise, scoped by access token, URL/query and timeout. No completed-response cache was added. |
| Home / Dashboard | Bootstrap requests stats, goals, habits, dashboard years and recent activity, plus product updates and shared shell requests. These serve distinct UI needs. Kept these loads; fixed habit-cache reuse, including empty results. |
| Habit lists | Cache previously ignored limit, sort and archived filters and rejected empty lists. The key now includes all list parameters, local date and account. Search results and newly appended habits invalidate list freshness. |
| Feed | Replacing the user object retriggered feed, trending and suggested-user loads. Dependencies now track account identity, username and interest values. |
| Discover | Replacing an otherwise identical interests array retriggered discovery requests. Dependencies now track interest values. Search debounce and filters remain intact. |
| Profile | Populating the habits list reran the tab loader, fetching overview analytics again. Removed list lengths as triggers; account, tab, privacy and follow changes still trigger the loader. |
| Notifications | The header and page use different request parameters/scopes. They are not interchangeable. Preserved forced refreshes on foreground/push events and finite request timeouts. |
| Leaderboard | The page already gets rankings, podium, personal rank and stats in one response; search is debounced. No extra response cache added. |

## Freshness and compatibility

- Sharing lasts only while a request is pending; success and failure both remove it.
- A dispatched write and its completion invalidate pending-read reuse, so a
  refresh after a mutation cannot attach to a read from before that mutation.
- Custom request options (including cancellation signals, headers and adapters)
  keep independent requests.
- Existing store cache durations, mutation calls, pagination and explicit refresh
  flows are retained.

## Verification

Automated tests cover concurrent reads, fresh reads after settlement, differing
parameters/accounts, independently cancellable requests, failure/retry and reads
before/during/after a write. Existing frontend tests and the production build are
also run.

For real-world counts, compare Network recordings with the same account and
cache state: cold Home load, Feed, Profile overview, Discover search, then return
to Home. Verify goal/habit edits and notification foreground refresh separately.
The guaranteed reduction is N identical overlapping eligible reads to one
network request; no overall percentage is claimed without those recordings.
