# Goal visibility

`src/services/goalAccessPolicy.js` is the source of truth for goal permissions.

| Viewer | Goal | Timeline, updates, analytics | Edit / create a share |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Other viewer, private goal | No | No | No |
| Other viewer, public goal with private updates | Yes | No | No |
| Other viewer, public goal with public updates | Yes | Yes | No |
| Blocked viewer or inactive author | No | No | No |

Individual read endpoints use `await resolveGoalAccess(goal, viewerId)` to load
block relationships and author status. Writes use the separate `isGoalOwner`
helper, while SQL writes retain their owner constraints. Feed lists
use the pure policy for public-goal visibility after their batch block filtering.

Return only `canViewGoal`, `canViewTimeline`, and `canViewUpdates` in `permissions`
to the UI and enforce the corresponding capability on the
backend before reading restricted content. Do not infer timeline access from
goal visibility alone. Analytics contains update-derived content and therefore
uses the same audience as updates. Post/detail responses omit private breakdowns.

Shared activities remain governed by `goalShareAccess.js`. Their audience and
allowlisted snapshot are independent of the source goal. A public shared card
does not make the underlying goal public.

Goal creation and editing present two adjacent toggles: goal visibility and
updates visibility. The updates toggle controls both updates and the timeline.
A private goal always hides both from other viewers, regardless of the saved
updates preference. New goals default to private updates. Editing preserves the
existing preference. New goals default to public updates, matching the database
default. No stored visibility values are migrated.
