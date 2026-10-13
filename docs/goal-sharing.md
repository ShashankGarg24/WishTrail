# Goal sharing

Share Studio reuses `ShareModal` and `ShareableGoalCard`. The same snapshot renderer powers the preview, structured Feed card, and browser image export (1080 × 1920 or 1080 × 1080). Profile / My Trail retains its existing behavior.

## Data and privacy

- Authenticated `GET /goals/:id/share-context` is owner-only. The server derives its allowlisted context from existing goals, updates, and recorded subgoal completions.
- Journey duration is inclusive calendar days from goal creation through completion, or today, in the owner's timezone. Invalid date ranges omit duration and summary counts.
- Progress update count counts nonblank text updates within that interval. Active days count distinct update dates, plus completion day once. These are not lifetime consistency or historical progress deltas.
- Journey points are start, up to two recorded intermediate events, and completion. Subgoal events need real completion dates; their private text is not copied. A selected milestone can be shared on its own journey.
- Feeling and a user-entered share note require opt-in. Journals, existing notes, exact locations, comments, and community information never enter the share snapshot.
- Photo uses the owner's existing HTTPS completion attachment when it loads with CORS. Missing media removes the Photo option; image failures preserve the editor and allow retry or structured posting.
- Authenticated `POST /goals/:id/shares` rebuilds the context, checks its revision, and validates options. It persists a versioned render snapshot on the existing Activity model, without changing goal privacy or storing rendered images/editor state.
- Snapshot visibility is independent of source privacy. Private posts require their owner; public snapshots still respect blocks. Shared snapshots bypass live goal enrichment. Source goal access remains separately guarded.

## Feed behavior

Explicit completion sharing updates one rich activity per owner/goal. The Feed suppresses the corresponding automatic completion activity before pagination when the rich post is visible to that viewer. Request IDs and fingerprints handle retries; partial unique Mongo indexes enforce concurrency. The share service ensures Activity indexes exist before its first post, including when automatic index creation is disabled.

Completed list cards offer Share for seven days from their stored completion date; Goal Detail retains Share Achievement. Existing backdated completion dates therefore affect list-card eligibility.

## Native release

The existing Expo WebView forwards `WT_SHARE_IMAGE` to `expo-sharing`, using a temporary PNG through `expo-file-system`. Requests must originate from the configured web app origin. Temporary files are removed after the OS sheet returns, including errors/cancellation.

**Rebuild the native application** to include the new `expo-sharing` dependency. A web-only update cannot add this native module. Validate the OS sheet on physical iOS and Android devices before release; the Android Metro bundle and bridge unit tests do not substitute for that check.

## Focused checks

- API Jest: `goalShareContract`, `goalShareService`, `goalShareAccess`, and `goalShareFeed` test suites.
- Node tests: `frontend/tests/goalShare.test.mjs` and `app/tests/goalImageSharing.test.cjs`.
- Frontend production build; browser checks with mocked APIs for mobile/desktop layouts, both PNG dimensions, visibility opt-outs, template eligibility, and retry behavior.
- The repository's frontend lint command currently references an unavailable `@typescript-eslint/recommended` configuration. Focused checks can run with an explicit ESLint configuration until that existing setup is repaired.
