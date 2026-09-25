# WishTrail application and feature reference

Reviewed: 26 September 2026. Scope: the current local source in `frontend/`, `api/`, and `app/`.

This is a source-based inventory of the application: what people can do, how each feature behaves, its limits, its implementation, and where the code is incomplete. **“Available” means wired into the checked-in application, not verified against a running production deployment.** Production configuration, database migrations, third-party credentials, actual delivery of emails/push notifications, and store publication were not tested. No production data or credentials are included.

The older `WISHTRAIL_FEATURES.md` and premium implementation guides are historical context. Where they disagree with executable code, this reference follows the code and calls out discrepancies.

## Contents

1. [Product and availability](#1-product-and-availability)
2. [Pages and navigation](#2-pages-and-navigation)
3. [Registration, authentication, and sessions](#3-registration-authentication-and-sessions)
4. [Dashboard](#4-dashboard)
5. [Goals](#5-goals)
6. [Habits](#6-habits)
7. [Daily logs](#7-daily-logs)
8. [Profiles and settings](#8-profiles-and-settings)
9. [Social feed, discovery, and conversations](#9-social-feed-discovery-and-conversations)
10. [Leaderboards and analytics](#10-leaderboards-and-analytics)
11. [Notifications](#11-notifications)
12. [Sharing, uploads, inspiration, and feedback](#12-sharing-uploads-inspiration-and-feedback)
13. [Product updates](#13-product-updates)
14. [Administration](#14-administration)
15. [Premium](#15-premium)
16. [Communities](#16-communities)
17. [Mobile application and web platform](#17-mobile-application-and-web-platform)
18. [Architecture and data](#18-architecture-and-data)
19. [Operations and background jobs](#19-operations-and-background-jobs)
20. [Known gaps and differences](#20-known-gaps-and-differences)
21. [Core user journeys](#21-core-user-journeys)
22. [Maintenance of this reference](#22-maintenance-of-this-reference)
23. [API route inventory](#23-api-route-inventory)

## 1. Product and availability

WishTrail is a personal development and social progress application. Its main workflow is to create goals, divide them into smaller actions, build supporting habits, log daily reflections, review progress, and share selected accomplishments with other users.

| Area | Availability in current source | Main purpose |
| --- | --- | --- |
| Accounts | Available; email/Google integrations need configuration | Register, sign in, reset/change passwords, delete account |
| Dashboard | Available | See progress and manage goals and habits |
| Goals and goal updates | Available | Plan, break down, document, complete, and share goals |
| Habits and occurrence logs | Available | Track repeated actions, schedules, moods, streaks, and history |
| Daily logs | Available | Private personal reflection with text and/or emotion |
| Daily-log export | UI and API exist; implementation defect | Export PDF/text; see section 20 |
| Social profiles/feed | Available | Follow people, view public progress, like and discuss activities |
| Discovery and leaderboard | Available | Find people/goals and browse achievement rankings |
| Notifications | Available; push requires configuration and permission | In-app inbox, requests, device registration, push |
| Automatic reminders | Mostly disabled | Service code exists but scheduled invocation is commented out |
| Admin panel | Available with separate admin authentication | Browse records, inspect counts, compose email, manage release notes |
| Premium | Partially implemented | Expiration and limits exist; payment verification is unfinished |
| Communities | Backend and components exist; web routes disabled | Groups, shared items, member approval, and chat |
| AI coaching | Supporting code/configuration; not a live daily-log workflow | Daily-log enrichment call is commented out |
| Mobile app | Implemented WebView shell | Host the web app with native authentication/push bridges |

User categories are anonymous visitors, signed-in users, users with an unexpired premium timestamp, and separately authenticated administrators. Community role checks also exist in the community backend.

## 2. Pages and navigation

Source: [frontend/src/App.jsx](frontend/src/App.jsx), [Header](frontend/src/components/Header.jsx), [BottomTabBar](frontend/src/components/BottomTabBar.jsx), [PrivateRoute](frontend/src/components/PrivateRoute.jsx).

| URL | Access | Behavior |
| --- | --- | --- |
| `/` | Public | Landing page; authenticated users redirect to dashboard |
| `/auth` | Public | Sign-in and signup experience |
| `/reset-password` | Public | Password reset from emailed token |
| `/inspiration` | Public | Inspirational content and video presentation |
| `/privacy-policy` | Public | Privacy information |
| `/terms-of-service` | Public | Terms |
| `/community-guidelines` | Public | Community conduct information |
| `/copyright-policy` | Public | Copyright information |
| `/whats-new` | Public | Product release notes |
| `/admin` by default | Separate admin login | Administrative console; configurable through `VITE_ADMIN_UI_ROUTE` |
| `/dashboard` | Signed in | Personal goals and habits |
| `/feed` | Signed in | Activity feed |
| `/discover` | Signed in | Goal and user discovery |
| `/notifications` | Signed in | Inbox and follow requests |
| `/profile/:username` | Signed in | Own or another person's profile |
| `/settings` | Signed in | Personal information, security, notifications, account |
| `/leaderboard` | Signed in | Ranking interface |
| `/habits/:id/analytics` | Signed in | Individual habit analytics |
| `/goals/:goalId/analytics` | Signed in | Individual goal analytics and updates |
| `/goal/:goalId` | Signed in | Opens goal context through the feed page |
| `/error/generic`, `/error/network`, `/error/500`, `/error/permission`, `/error/auth` | Public | Specific error/recovery screens |
| Unmatched URL | Public | Not-found page |
| `/communities`, `/communities/:id` | Disabled | Route declarations are commented out |

Most pages are lazy loaded. The shell provides a loading screen, toast messages, light/dark appearance, scroll restoration, and a mobile bottom navigation bar for authenticated users. Footer visibility depends on route and native-app context. A startup maintenance check can replace the entire application with the maintenance screen.

The app accepts a `url` query parameter for internal navigation and `feedback=1` to request the feedback dialog. Individual pages also use query parameters for tabs and selected content.

## 3. Registration, authentication, and sessions

Sources: [auth routes](api/src/routes/authRoutes.js), [auth controller](api/src/controllers/authController.js), [auth service](api/src/services/authService.js), [signup UI](frontend/src/components/MultiStepSignup.jsx), [API client](frontend/src/services/api.js).

### Registration

- Email/password registration and a multi-step OTP signup flow exist.
- Availability checks support email and optional username before completion.
- OTP request, verification, and resend are separate API operations.
- Signup validation requires a name of 2–100 characters, a valid email, and a password of at least 6 characters.
- Username validation permits 3–20 letters, digits, dots, hyphens, and underscores.
- OTP input must be exactly six numeric digits. OTP records carry purpose, expiration, verification/attempt state, and a TTL index; repeated incorrect attempts are limited in the OTP model.
- Profile-related onboarding code covers username, date of birth, interests, and location. Route validators defined in a file are not proof that a separate profile-completion endpoint is mounted; see the API inventory for actual routes.
- Generated initial avatars provide a fallback for users without an uploaded image.

### Sign-in and recovery

- Email/password sign-in returns authentication state to the frontend store.
- Google sign-in submits a Google token for backend verification. Browser and native Google sign-in have separate client integration paths.
- `/auth/me` restores the current account. Logout is authenticated.
- Access-token refresh supports an HTTP-only refresh cookie on the web. The native shell includes a refresh-token bridge and secure-storage support.
- Forgot-password sends a reset flow; reset validates a 64-character token.
- Reset and settings password validation require at least eight characters, a letter, a digit, and a special character. This is stricter than the signup route's six-character minimum.
- Google-only accounts can request a password-setup OTP and set an email/password credential after verification.
- Protected frontend routes redirect unauthenticated users; backend `protect` checks are separate from the frontend guard.

### Account deletion

Sources: [account UI](frontend/src/components/settings/AccountSection.jsx), [user controller](api/src/controllers/userController.js), [deletion service](api/src/services/accountDeletionService.js).

The Account settings danger zone opens a confirmation dialog, sends an email verification code, accepts a six-digit code, and requests permanent deletion. The UI includes resend/loading/error/success states. Deletion is immediate in the implemented flow, not a scheduled deactivation.

Cleanup spans the SQL account and related goals/habits/social records, MongoDB preferences, daily logs, activity/comments/notifications, device tokens, OTP/reset records, reports/feedback, and community references. It repairs affected counters and attempts Cloudinary cleanup of associated images. Optional community feed models are loaded defensively. This is a multi-store workflow; it should not be described as one atomic transaction across every external service.

## 4. Dashboard

Sources: [DashboardPage](frontend/src/pages/DashboardPage.jsx), [userController](api/src/controllers/userController.js), [apiStore](frontend/src/store/apiStore.js).

The dashboard is the primary authenticated workspace. It provides goal/habit tabs, a time-dependent greeting, summary metrics with explanatory dialogs, creation controls, idea suggestions, and actionable cards.

- Goal view supports a selected year, text search, all/completed/in-progress filters, newest/oldest sorting, and nine cards per page.
- Goal cards open details, public post context, sharing, editing, completion, completion editing, or deletion as appropriate to their state.
- Habit cards open detail/edit flows and completion actions. Habit creation and curated habit ideas are available from the dashboard.
- Habit completion records can carry mood; the UI updates counts after a successful log.
- Deletion uses confirmation dialogs. Dependency checks warn when another goal references a goal or habit.
- Goal and habit idea selection prefills creation forms; suggestions are editable starting points.
- Progress explanations cover consistency/trends and meaningful active days, rather than requiring users to infer metric definitions.
- The dashboard can display the latest unseen major product update.

Year-management API operations exist for listing, adding, and deleting dashboard years. Adding a year is constrained to the current year ±5 in the user controller, while goal route validation separately restricts explicit goal years to 2020–2030. These ranges are not identical.

## 5. Goals

Sources: [goalController](api/src/controllers/goalController.js), [goalRoutes](api/src/routes/goalRoutes.js), [pgGoalService](api/src/services/pgGoalService.js), [goalDivisionService](api/src/services/goalDivisionService.js), [CreateGoalWizard](frontend/src/components/CreateGoalWizard.jsx), [GoalDetailsModal](frontend/src/components/GoalDetailsModal.jsx).

### Goal fields and validation

| Field/concept | Behavior |
| --- | --- |
| Title | Required; 3–100 characters |
| Description | Optional; at most 200 characters |
| Category | Must match one of the 13 supported category identifiers |
| Target date | Optional ISO date in route validation |
| Year | Explicit route value must be 2020–2030 |
| Visibility | `isPublic`; creation treats only boolean/string true as public |
| Subgoals | Smaller steps, optionally linked to another owned goal |
| Habit links | Supporting habits with weighted contribution |
| Completion | Completion timestamp plus optional reflection, image, feeling, and visibility |
| Daily update | Text and/or emotion associated with a local calendar day |

Categories: Health & Fitness (`HEALTH_FITNESS`), Mental Health, Education & Learning, Career & Work, Personal Growth, Finance, Creative, Side Projects, Travel & Experiences, Relationships, Family, Lifestyle, and Other. Exact identifiers are in [category.js](api/src/constants/category.js).

### Lifecycle and limits

1. Create a goal directly or start from a suggested template.
2. Edit its details while permitted by the current state.
3. Add or update subgoals and supporting habit links.
4. Record day-by-day progress notes/emotions.
5. Review calculated progress, timeline, and analytics.
6. Complete the goal and optionally provide a reflection/image/feeling.
7. Edit completion information later, share it, or delete the goal.

Creation checks the free/premium active-goal limit, subgoal count, and habit-link count. It also performs an additional hard-coded five-active-goals check and a 50-goals-per-year check. The second check can prevent premium users from reaching the configured ten-active-goals allowance.

**Completed goals cannot be uncompleted.** The toggle endpoint explicitly rejects reopening an already completed goal. A route name containing “toggle” does not imply reversible completion. The former daily-completion counter is deprecated in the controller; the old claim of a live three-completions-per-day limit is not supported by that path.

### Subgoals and weighted progress

- A subgoal may have a title, weight, completion flag/date, note, and linked goal ID.
- Linking to oneself is rejected, and linked goals are checked for ownership.
- A completed linked goal can fulfill a subgoal's contribution.
- Supporting habits contribute progress based on available target-completion or target-day data.
- Weights are normalized for computation if their total differs from 100; when all weights are zero, components receive equal shares.
- Computed progress is bounded to 0–100. A completed parent goal always reports 100.
- An incomplete goal without subgoals or linked habits reports zero in the division calculation.
- The scheduled-day fallback for a linked habit without explicit targets currently returns zero; it is not a fully implemented alternative progress source.
- Deletion/dependency UI warns about parent goals before removing referenced content.

### Completion information

- Optional note is capped at 300 characters by the controller.
- Optional upload supports PNG, JPG/JPEG, and WEBP, up to 1 MB.
- Images use Cloudinary when configured; completion editing attempts to remove an old Cloudinary image when replaced/removed.
- The completion interface represents feelings including neutral, relieved, satisfied, happy, proud, accomplished, grateful, and excited.
- A supplied completion date is normalized using the user's timezone.
- Public completion can produce social activity. Ownership is checked before modifying the goal.
- A 10–300-character completion-note validator is defined in the route file but is not attached to the mounted toggle route; it should not be treated as the effective minimum-note rule.

### Daily goal updates

Sources: [pgGoalUpdateService](api/src/services/pgGoalUpdateService.js), [GoalAnalyticsPage](frontend/src/pages/GoalAnalyticsPage.jsx).

- List goal updates, fetch today's update, upsert today's update, or delete today's update.
- Require text or an emotion; text is capped at 300 characters.
- Emotion values are `great`, `good`, `okay`, `challenging`, and `neutral`; the UI labels challenging “Tough” and neutral “Skip”.
- These updates are separate from account-level daily logs and from habit completion records.
- Goal analytics loads update history in batches of ten.
- Goal timeline support includes goal creation/completion, subgoal additions/completions, habit additions, and habit target achievements.

### Public goal presentation

Goal posts combine the goal, author, completion context, and associated social interactions. Search and trending endpoints feed discovery. A public share endpoint and dynamically generated OG image endpoint support external previews. The SPA `/goal/:goalId` route itself remains authentication-protected.

## 6. Habits

Sources: [habitController](api/src/controllers/habitController.js), [pgHabitService](api/src/services/pgHabitService.js), [pgHabitLogService](api/src/services/pgHabitLogService.js), [habitService](api/src/services/habitService.js), [CreateHabitModal](frontend/src/components/CreateHabitModal.jsx), [HabitDetailModal](frontend/src/components/HabitDetailModal.jsx).

### Definition and scheduling

- Habit name is required and capped at 100 characters; description is capped at 200.
- Scheduling supports daily and selected weekdays. Weekday indices run Sunday 0 through Saturday 6; legacy weekly values are normalized to custom in parts of the code.
- Records support timezone, visibility, related goal, reminders, and activity counters.
- Habit creation is limited by plan; reminder requests also pass a premium feature check.
- Creation forwards `targetCompletions` and `targetDays` to the database service. Editing also persists these fields and supports clearing them with null. Linked-goal calculations use the service's camelCase target/counter fields and ownership-filtered `getHabitById` lookup.
- Reminder fields and generation services are present, but automatic sending is disabled in the current cron wiring.

### Actions and history

- Create, list, search through the list endpoint, retrieve, edit, archive, and delete.
- View dependency information before deletion; linked goals may be affected.
- Log a completion with status, mood, and optional date.
- Completion records preserve occurrence timestamps and moods, supporting multiple occurrences rather than just a single daily checkbox.
- Retrieve paginated daily logs and expand the occurrences within each day.
- Edit an individual occurrence's timestamp/mood or delete it using its log ID and completion index.
- Individual edit/delete routes verify IDs, ownership, and that the selected log entry exists.
- Statistics expose total completions, total days, current streak, and longest streak.

Habit occurrence storage uses UTC timestamps/date indexing; analytics regroup occurrences into the user's local calendar. Daily logs use a local `dayKey`, so those two data models should not be described as identical.

### Analytics and heatmap

The habit analytics page provides date-range controls, current/longest streak, completion/consistency metrics, follow-through, done/skipped/missed distribution, a daily heatmap/timeline, weekly charts, and expandable log history. Logs load in pages of 20.

Backend analytics/heatmap requests are capped to 60 days for free accounts and 365 for premium. The current individual analytics UI caps free users at 30 days, creating a UI/API difference. History access limits are not proof that old database rows are physically deleted.

An OG streak-image route exists without the authenticated router guard. Habit social sharing also includes an environment flag (`HABIT_SHARE_ENABLED`) in the service; it is not enabled by default in that path.

## 7. Daily logs

Sources: [dailyLogsService](api/src/services/dailyLogsService.js), [dailyLogsController](api/src/controllers/dailyLogsController.js), [DailyLogsEntry](api/src/models/DailyLogsEntry.js), [DailyLogsEntryModal](frontend/src/components/DailyLogsEntryModal.jsx), [ProfilePage](frontend/src/pages/ProfilePage.jsx).

Daily logs are personal reflections, independent of goal-specific updates.

- Submit text, an emotion, or both; an entirely empty entry is rejected.
- Supported emotions: happy, motivated, okay, stressed, sad, angry. Legacy calm is converted to motivated on update.
- One entry per user per local calendar day for both plans.
- Effective service limit: 300 characters for both plans. The premium configuration says 500, but the service's fixed 300-character check still applies.
- Creation also applies `DAILY_LOGS_MAX_WORDS`, default 120 words.
- Each entry can store a prompt key/text, tags, content, emotion, timestamps, and local day key.
- Four rotating prompts concern smiling, helping someone, sacrifice for a loved one, and gratitude. Prompt selection uses the service's UTC-based day rotation, separately from the user's local submission limit.
- Retrieve today's entry or paginated personal history, edit an owned entry, and delete an owned entry.
- The profile history has expandable entries, a deletion confirmation, pagination, and export controls.
- The service removes deprecated visibility, word-count, and active-state fields. Public/friends/private daily-log visibility from older documentation is not the current implemented model.
- An unmounted highlights handler remains in the controller; it is not evidence of an available public highlights API.

### Export and AI status

Export UI and backend formatting support PDF/plain text, simple/diary styling, an optional date range, and optional stored motivational text. Empty date ranges return no-data errors; reversed ranges are rejected. **The premium export validator currently asks for the nonexistent `dailyLogs` feature category instead of `daily_logs`, which throws before export.** Treat export as implemented but blocked by this defect.

Groq-based supportive-response/mood-analysis code exists, using a configured API key and a timeout. Its invocation during daily-log creation is commented out. New logs should not be described as receiving live AI-generated coaching merely because the helper exists.

## 8. Profiles and settings

Sources: [ProfilePage](frontend/src/pages/ProfilePage.jsx), [SettingsPage](frontend/src/pages/SettingsPage.jsx), [settings components](frontend/src/components/settings), [settingsController](api/src/controllers/settingsController.js), [UserPreferences](api/src/models/extended/UserPreferences.js).

### Profiles

- Username-based own/other profile rendering.
- Avatar, name, username, biography/profile information, location, interests, quote, and supported social links.
- Overview/progress content, goal and habit lists, follower/following lists, and analytics summaries.
- Goal/habit detail and sharing actions from profile cards.
- Own-profile daily-log entry/history management.
- Follow, unfollow, request/cancel request, block, and report actions when viewing another user.
- Private-account and block handling restrict access in relevant backend paths; frontend profile restrictions are not the sole enforcement mechanism.
- Profile goals and habits use pages of nine; follower/following lists use batches of 20; daily-log history uses batches of 14.

### Personal information

Edit supported name/username/profile fields, upload avatar, select interests, set city/location, enter a favorite quote, and manage website/YouTube/Instagram links. The email field is disabled in the personal-info UI. Save/cancel controls track unsaved changes. City autocomplete uses the public location-search endpoint.

### Security

Change password with the current password, or use OTP password setup for a Google account. Password inputs and submission states support the relevant security form flow. Two-factor authentication and logged-in device management sections are commented out; those are not available user-facing features.

### Notifications and account

- Notification preferences are persisted through settings endpoints and include email/push-related configuration.
- Native notification controls request the current OS permission state and can open system app settings when permission is disabled.
- Account settings include account/habit privacy controls, light/dark appearance, blocked-user management, subscription presentation, and permanent account deletion.
- Theme preferences support light and dark. The application also persists/uses theme state in the frontend store.
- Blocking is represented in both social SQL services and settings/moderation flows; its effect must be assessed by the consuming read path.

## 9. Social feed, discovery, and conversations

Sources: [socialController](api/src/controllers/socialController.js), [activityController](api/src/controllers/activityController.js), [pgFollowService](api/src/services/pgFollowService.js), [ActivityCommentsModal](frontend/src/components/ActivityCommentsModal.jsx), [DiscoverPage](frontend/src/pages/DiscoverPage.jsx), [FeedPage](frontend/src/pages/FeedPage.jsx).

### Follow relationships

- Follow/unfollow another account; following oneself is rejected.
- Private accounts use pending follow requests with accept, reject, and cancellation operations.
- Retrieve followers, following, follow status, mutual followers, suggested users, popular users, and follow statistics.
- Blocking prevents following in the follow controller.
- Follow requests can also be managed from notifications by notification ID.

### Activity feed and interaction

- Personalized feed endpoint, recent activities, trending activities, user activities, and a single activity lookup.
- Activity model/presentation supports events such as goal creation/completion, following, streaks, achievements, and level-related events. A supported event type is not proof that every producer is active.
- Like/unlike an activity; goals also have a separate like endpoint.
- Read activity comments, add a comment, reply to a comment, and like/unlike a comment.
- Comments use the MongoDB activity/comment model while social likes are supported by SQL services.
- Comment text has a model limit of 1,000 characters. Empty comments/replies are rejected.
- Reply code verifies the parent comment belongs to the activity and the activity is public; mention data supports conversation notifications.
- Post/detail/comment modals allow interaction without requiring a separate full-page route.

### Discovery

- Goal and user tabs with URL tab state.
- Debounced text search; category filtering for goals.
- Default trending-goal retrieval and public-goal search use the current `/goals` endpoints.
- User search results include follow/unfollow interaction.
- Top achievers are loaded from the leaderboard.
- Curated goal/habit suggestions use local template data, categories/interests, and shuffle/refresh. They are not proof of an LLM recommendation system.
- The old `exploreController.js` still exists, but explore is not mounted in the server, and `exploreRoutes.js` exports an empty router.

### Moderation

- Report content with a required reason.
- The mounted report controller accepts `user` or `activity` as target types. Do not advertise independent goal/comment reporting based on older documentation.
- Block/unblock and list blocked accounts through moderation/settings operations.
- No dedicated admin report-review or ban-management endpoint is mounted in the current admin router.

## 10. Leaderboards and analytics

Sources: [leaderboardController](api/src/controllers/leaderboardController.js), [LeaderboardPage](frontend/src/pages/LeaderboardPage.jsx), [metrics helpers](api/src/utility/metrics.js), [GoalAnalyticsPage](frontend/src/pages/GoalAnalyticsPage.jsx), [HabitAnalyticsPage](frontend/src/pages/HabitAnalyticsPage.jsx).

The leaderboard UI displays a podium for the first three returned entries, ranking rows, profile navigation, and pagination with 20 entries per request. The backend offers global, category, friends, and statistics endpoints; the current UI should not be described as exposing every backend filter. Global leaderboard authentication is optional at the API, although the SPA page requires login. Global ranking code supports completed-goal and streak ordering, category input, timeframe input, caching, and per-viewer following decoration.

Goal analytics combines completion/progress, time context, subgoals, linked habits, timeline, and paginated daily goal updates. Habit analytics focuses on scheduled occurrences, completed/skipped/missed behavior, streaks, time series, heatmaps, and individual completion history. User/dashboard analytics aggregate across personal actions.

### Metric definitions in shared helpers

| Metric | Definition/behavior |
| --- | --- |
| Percentage | Rounded numerator / denominator ×100, bounded to 0–100; zero for nonpositive denominator |
| Scheduled occurrences | Daily or selected weekday occurrences within a date range, starting no earlier than creation |
| Habit completion percentage | Completed scheduled occurrences / expected occurrences |
| Follow-through | Completed / (expected − skipped), expressed as a bounded percentage |
| Active days | Number of unique valid calendar date keys, optionally excluding days after an end date |
| Trend | Current percentage minus previous percentage, in percentage points; null without previous data |
| Quantitative progress | Current value / target value |
| Milestone progress | Completed weight / total weight, or completed milestone count / count when unweighted |

These definitions are the shared helper behavior, not a claim that every historical metric in the repository uses the helpers. Repeated completions and distinct active days are different quantities.

## 11. Notifications

Sources: [notification routes](api/src/routes/notificationRoutes.js), [Notification](api/src/models/Notification.js), [notificationController](api/src/controllers/notificationController.js), [pushService](api/src/services/pushService.js), [webPush](frontend/src/services/webPush.js), [NotificationsPage](frontend/src/pages/NotificationsPage.jsx).

- In-app notification list with read/unread handling.
- Mark one notification read, mark all read, and delete a notification.
- Dedicated pending-follow-request retrieval and accept/reject actions.
- Device registration, device listing, device unregistration, and a test-push API.
- Device registration uses optional-auth middleware but the controller still requires a resolved authenticated user, including its token fallback path; it is not anonymous unrestricted registration.
- Browser push uses Firebase messaging and its dedicated service worker, with browser permission and configuration prerequisites.
- Web push initialization occurs after authentication with a short delay and is skipped inside the native WebView.
- Foreground push handling refreshes notification state; click/deep-link handling routes users into the app.
- Native Firebase messaging integrates tokens and push-tap forwarding with the web shell.
- Notification producers include social interactions such as follows, requests, likes, and conversation events. Reminder producers also exist but many scheduled invocations are disabled.
- Model-level deduplication/cooldown logic exists for certain repeated like notifications.

The active cleanup job deletes notifications older than 30 days by creation time. Model expiry fields may indicate longer lifetimes for some notification types, but the cleanup query does not exempt them; do not promise those longer retention periods as effective behavior.

## 12. Sharing, uploads, inspiration, and feedback

### Sharing and uploads

Sources: [ShareModal](frontend/src/components/ShareModal.jsx), [ShareSheet](frontend/src/components/ShareSheet.jsx), [ShareableGoalCard](frontend/src/components/ShareableGoalCard.jsx), [upload routes](api/src/routes/uploadRoutes.js).

- Goal sharing components support link/share-card presentation; the frontend includes `html2canvas` for image rendering.
- Goal and habit OG-image generation is exposed by public backend routes.
- Profile avatar uploads use multipart field `avatar`, a 1 MB limit, and Cloudinary.
- Replacing a profile avatar attempts cleanup of the old Cloudinary asset.
- Community avatar/banner upload endpoints exist, accept field `image`, and check community membership/role. Their presence does not enable the disabled community pages.
- Completion attachments use field `attachment` and a MIME allowlist; avatar upload should not be assumed to use that same MIME filter.

### Inspiration

The public inspiration page and video embed component provide curated motivational content. Local quotes also appear in dashboard/discovery interfaces. This is distinct from the disabled per-entry AI enrichment and from scheduled morning motivation services.

### Feedback

Sources: [FeedbackButton](frontend/src/components/FeedbackButton.jsx), [feedbackRoutes](api/src/routes/feedbackRoutes.js).

- Global feedback entry point with an authenticated submission API.
- Required rating: poor, fair, good, great, or excellent.
- Optional message, maximum 500 characters.
- Optional screenshot, PNG or JPG/JPEG, maximum 1 MB.
- Submission stores a feedback record; screenshot upload uses Cloudinary when available.
- `feedback=1` can trigger the feedback interface through application startup navigation.

## 13. Product updates

Sources: [WhatsNewPage](frontend/src/pages/WhatsNewPage.jsx), [WhatsNewModal](frontend/src/components/WhatsNewModal.jsx), [productUpdateController](api/src/controllers/productUpdateController.js), [productUpdateService](api/src/services/productUpdateService.js).

- Public release history and filtering by update type.
- Types: feature, enhancement, and bug fix (`bug_fix`).
- Each update carries version, title, description, major-update flag, and persistence timestamps.
- Authenticated users can fetch the latest relevant major update and mark it seen.
- The dashboard has a release-note modal; the stored last-seen version prevents treating every visit as a first encounter.
- Admin creation, editing, and deletion use the version identifier.
- Duplicate versions produce a conflict response; missing edit/delete targets produce not-found responses.
- Admin mutations invalidate cached What's New lists, and cache failure does not intentionally prevent publishing.
- The admin email composer can populate content from a selected release note.

## 14. Administration

Sources: [AdminPage](frontend/src/pages/AdminPage.jsx), [adminController](api/src/controllers/adminController.js), [adminService](api/src/services/adminService.js), [adminAuth](api/src/middleware/adminAuth.js), [adminApi](frontend/src/services/adminApi.js).

### Access

- Default web route `/admin`, configurable separately from the backend segment.
- Default API prefix `/api/v1/admin`; `ADMIN_API_ROUTE_SEGMENT` changes its segment.
- Login compares email/username and password to configured admin credentials.
- Admin JWTs use `admin-panel` scope and default to eight-hour expiry.
- Protected admin requests validate the token and compare its recorded login IP with the current request IP when both exist.
- An allowed-IP helper exists but is not applied in `requireAdminAuth`; a configured allowlist must not be described as enforced by this middleware.
- This is separate from ordinary user authentication and the incomplete admin checks on legacy premium/config APIs.

### User, goal, and habit records

| View | Data and controls |
| --- | --- |
| Users | Search name/username/email; inactivity-day and email-preference filters; pagination; user ID, identity/email, active state, joined/last-active dates, goal/habit counts, last daily-log update, last seen release |
| Goals | Search and status filtering; owner identity/email; title/category/year, public flag, completion state/time, number/latest date of goal updates |
| Habits | Search and active/inactive filtering; owner identity/email; schedule/target type, logs/latest log date, current/best streak, creation time |
| Analytics | Total users, users active today, inactive users using a threshold, total goals |

Lists default to 20 records and cap the requested page size at 100. Habit administrative activity uses approximately a seven-day recent-log rule; it is not synonymous with archival state. SQL filter fallback for new habits and the displayed status calculation are not exactly the same.

### Email composer

- Audience modes: selected user IDs, all active accounts, or accounts inactive beyond a threshold.
- Form fields include subject, heading/title, subtitle, body, ending, call-to-action label, and WishTrail destination.
- Template presets cover custom, inactivity, no-goals messaging, comeback, feature release, motivation, and feedback; presets are content choices, not separate backend audience modes.
- Release-note selection can prefill a feature-release email.
- A visual email preview helps review the message before sending.
- Backend strips HTML/control characters and caps subject/title at 180 characters, subtitle at 220, body at 5,000, and CTA label at 80.
- CTA hostname validation accepts WishTrail hosts or the configured frontend hostname.
- The current service accepts an `ending` field but does not pass it into the email payload it builds.
- The service returns requested/sent/failed counts based on settled email-service promises. This is not proof of recipient inbox delivery.
- Recipient SQL selection does not itself apply the user-list email-preference filter; the list filter and broadcast selection are distinct paths.

### Release-note management

List, create, edit, and delete releases; set type and major status; require nonempty title, description, and version; show loading/result states; connect releases to the email composer. No user deletion, goal editing, account banning, or moderation-queue route is provided by this admin router.

## 15. Premium

Sources: [backend configuration](api/src/config/premiumFeatures.js), [enforcement](api/src/utility/premiumEnforcement.js), [premiumController](api/src/controllers/premiumController.js), [frontend hooks](frontend/src/hooks/usePremium.js).

Premium is determined by a future `premium_expires_at` timestamp. Helpers compute days remaining and whether expiry is within seven days. Frontend hooks/indicators expose limits and upgrade presentation, but backend enforcement determines actual acceptance.

### Configured allowances

This table describes configuration, **not a guarantee of end-to-end behavior**. Exceptions follow immediately below.

| Capability | Free | Premium |
| --- | --- | --- |
| Active goals | 5 | 10 |
| Subgoals per goal | 1 | 5 |
| Linked habits per goal | 1 | 5 |
| Active habits | 5 | 10 |
| Habit history | 60 days | Unlimited configured retention |
| Reminder allowance | None | Up to 5 per habit |
| Daily-log entries/day | 1 | 1 |
| Daily-log characters | 300 | 500 |
| Daily-log retention | 60 days | Unlimited configured retention |
| Daily-log export | No | Yes |
| Joined communities | 7 | 50 |
| Owned communities | 3 | 10 |
| Create communities | Yes | Yes |
| Basic analytics | Yes | Yes |
| Advanced insights/custom reports flags | No | Yes |
| Analytics history request cap | 60 days | 365 days |
| AI suggestions/recommendation/prompt flags | No | Yes |
| AI request allowance | 0/day | 100/day |

### Effective behavior and incomplete commerce

- Goal creation has the additional five-active-goals check, overriding the larger allowance in that path.
- Daily-log service applies 300 characters even to premium entries.
- Export has a mismatched configuration key and currently errors before formatting.
- Free habit analytics UI uses 30 days despite a 60-day backend allowance.
- Retention settings do not establish an active deletion job for each data type.
- AI flags, advanced-insight flags, and custom-report flags are configuration entries; they are not proof of separate complete UI features.
- Subscribe accepts monthly/quarterly/annual/lifetime plan names corresponding to 1/3/12/1200 months; unknown plans fall back to one month.
- Payment verification is commented out. There is no verified payment-gateway purchase flow in this controller.
- Cancellation returns expiry information; payment-processor auto-renewal cancellation is only a commented integration placeholder.
- Premium stats/grant/revoke/expiring/expired routes use ordinary authentication, with admin checks still TODO. They are not protected by the separate admin-panel middleware.

## 16. Communities

Sources: [communityRoutes](api/src/routes/communityRoutes.js), [communityService](api/src/services/communityService.js), [community components](frontend/src/components/community), [CommunityDetailPage](frontend/src/pages/CommunityDetailPage.jsx).

**Availability: backend registered, frontend routes commented out.** The feature is substantial source code, but is not currently reachable through its intended web pages.

Implemented backend surfaces include:

- Discover communities, list memberships, create/update/get/delete a community.
- Join/leave, pending membership lists, member approval/removal, and member analytics.
- Dashboard, feed, aggregate analytics, and individual item progress/analytics.
- Suggest a shared goal/habit, approve suggestions, create a new item, copy a personal item, and remove an item.
- Join/leave shared items and retrieve joined items across communities.
- Send/delete chat messages and toggle reactions.
- Avatar/banner upload with community membership/role checks.
- Community, member, item, participation, announcement, activity, and chat data models.

The persistent server starts Socket.IO with community join/leave rooms and broadcasts new/deleted messages and reaction changes. A TCP Redis adapter is optional. Serverless entry points should not be assumed to provide the same persistent socket behavior. Legacy ID/storage assumptions remain in parts of this module.

## 17. Mobile application and web platform

Sources: [app/index.js](app/index.js), [app/package.json](app/package.json), [Android shortcut plugin](app/plugins/withAndroidShortcuts.js), [web manifest](frontend/public/manifest.webmanifest), [service worker](frontend/public/sw.js).

### Native shell

- Expo/React Native app hosts the configured web application in a WebView.
- `WEB_URL` and `API_URL` choose the hosted frontend/backend; absent configuration falls back to localhost and a derived API URL.
- Introductory onboarding slides explain goals, social progress, and habits.
- Loading/progress/splash handling coordinates with dashboard-ready messages.
- Web/native bridge synchronizes authentication, user ID, refresh state, navigation path, Google sign-in requests, and notification permission state.
- SecureStore and AsyncStorage support persistent native state, with defensive module availability checks.
- Firebase messaging handles registration/permission and notification navigation; the source contains older comments about Expo push removal, which should not be confused with the newer FCM implementation.
- Android 13+ requests notification permission; iOS uses the native messaging permission path when available.
- External-origin HTTP links and supported external URL schemes open outside the WebView.
- Custom pull-to-refresh applies to feed and notifications, with progress overlay and reload messaging.
- Android shortcut plugin/configuration is present. Native OS behavior depends on the built app and platform configuration.
- Android and iOS project folders exist. Repository presence does not establish Play Store/App Store availability.

### Web platform

- React SPA with responsive Tailwind layouts, light/dark mode, modal interactions, skeletons/loading states, and error boundary/screens.
- Public legal pages, SEO component, robots file, sitemap, and web manifest.
- Firebase's messaging service worker handles push. The general worker intentionally avoids duplicating push handling.
- The presence of a manifest/service worker is not evidence of full offline goal/habit editing or offline synchronization.
- Performance hooks, lazy loading, shared API state/caching, Vercel Speed Insights, and configurable Datadog browser instrumentation are present.

## 18. Architecture and data

### Application layers

| Layer | Implementation in this repository |
| --- | --- |
| Web | React 18, Vite 5, React Router 6, Zustand 4, Tailwind 3, Axios |
| Charts/interaction | Chart.js/react-chartjs-2, Framer Motion, Lucide, react-hot-toast |
| API | Node.js, Express 4, validation/middleware/controllers/services |
| Structured relational data | PostgreSQL through `pg` and Supabase configuration |
| Document data | MongoDB/Mongoose, including extended goal/profile data |
| Cache | Redis/Upstash integration and domain cache helpers |
| Images | Cloudinary; canvas-based backend image generation; frontend html2canvas |
| Email | Nodemailer-backed email service |
| Push/auth providers | Firebase Admin/client messaging; Google OAuth verification |
| Optional AI | Groq request helpers |
| Native | Expo 53, React Native 0.79.5, React 19, WebView |
| Operations | node-cron, structured logging/Datadog hooks, Vercel deployment files |

Versions above are package declarations, not a claim that dependencies were installed or production uses those exact resolved versions.

### Data ownership

| Data | Primary source/model |
| --- | --- |
| Users/account identity/premium timestamp/counters | PostgreSQL user services |
| Goals/core completion state | PostgreSQL goal services |
| Goal notes, weighted breakdown, completion attachments/feelings | MongoDB `GoalDetails` |
| Daily goal updates | PostgreSQL goal-update service/migration |
| Habits, occurrence logs, timestamp/mood arrays | PostgreSQL habit/log services |
| Follows, blocks, likes | PostgreSQL social services |
| Activities/comments | MongoDB `Activity`, `ActivityComment` |
| Daily reflections | MongoDB `DailyLogsEntry` |
| Preferences/notification settings/extended profile data | MongoDB `UserPreferences` |
| Inbox and push devices | MongoDB `Notification`, `DeviceToken` |
| OTP/password reset | MongoDB `Otp`, `PasswordReset` |
| Feedback/reports/configuration | MongoDB models |
| Product updates | PostgreSQL product-update service |
| Communities/chat | MongoDB community models, optional feed connection |
| Achievements | Achievement/UserAchievement models; not evidence of an active complete award system |

Numeric SQL IDs coexist with MongoDB ObjectIds and legacy string representations. Several controllers convert identifiers explicitly. Some older services still reference removed models, so reading a model or helper alone is insufficient to label a feature live.

### API conventions

- Default prefix `/api/v1`; version is configurable with `API_VERSION`.
- Most controllers return a JSON success flag and a data object; error envelopes vary by route.
- Pagination conventions vary: page/limit on many lists, skip/limit for daily logs, offset/limit for goal updates.
- Multipart endpoints handle uploads; daily-log export streams text/PDF; OG routes return images.
- Standard user authentication and separate admin authentication are distinct middleware.
- Public/optional-auth routes are listed in the route inventory; resource-specific ownership/privacy checks happen inside controllers/services.

## 19. Operations and background jobs

Sources: [server](api/src/server.js), [cron routes](api/src/routes/cronRoutes.js), [cron jobs](api/src/cron), [maintenance middleware](api/src/middleware/maintenanceMode.js), [syncController](api/src/controllers/syncController.js).

### Server behavior

- Connects databases, initializes the identity Bloom filter, imports scheduled jobs, and mounts API routers.
- Configurable CORS with known web/local origins plus environment-provided exact origins/regexes.
- Helmet, compression, request logging, JSON and URL-encoded parsers with 10 MB limits, cookies, and static upload serving.
- Central error/not-found handling and a health endpoint.
- Rate-limiter creation code exists, but the general/auth/user limiter registrations in `server.js` are commented out.
- The persistent-server entry point creates HTTP and Socket.IO; deployment configuration also supports serverless hosting.

### Background execution status

| Job | Schedule or trigger | Current source behavior |
| --- | --- | --- |
| Identity Bloom filter rebuild | Daily `0 0 * * *` | Active scheduled callback |
| Notification cleanup | Daily `0 2 * * *` | Active; deletes records older than 30 days |
| Daily-log prompt | Hourly | Scheduler exists, service call commented out |
| Morning motivation | Hourly with intended local-time filtering | Service call commented out |
| Nightly quote generation | `0 1 * * *` | Service call commented out |
| Habit reminders | Every minute | Service call commented out |
| Inactivity reminders | Hourly at minute 15 | Service call commented out |
| Cron daily-log/morning/nightly/cleanup endpoints | External authenticated POST | Executable handlers exist |
| Cron habit/inactivity endpoints | External authenticated POST | Bodies commented out; no success response after authorization |

Cron endpoints require `CRON_SECRET` through `x-cron-key` or a `key` query parameter. Without a configured secret they return a not-configured response. The presence of an endpoint does not prove an external scheduler is configured. Cron expressions without an explicit timezone should not be assumed to run in each user's timezone.

### Maintenance and configuration

- Public maintenance-status read, authenticated configuration reads/writes, and a maintenance toggle API.
- Maintenance blocks normal requests with HTTP 503 and a message, while health/status exceptions remain accessible.
- If checking maintenance state fails, middleware allows requests through.
- Frontend checks maintenance at startup and substitutes a dedicated page when enabled.
- Config routes have ordinary user authentication; “admin only” appears as a comment, not a mounted admin check.
- Public `/sync/latest` returns the latest product update and configuration snapshot with no-cache headers. It is not a general offline data-sync endpoint.

### Runtime dependencies

Core data operations depend on the configured PostgreSQL/MongoDB services and appropriate migrations. Google sign-in needs matching client configuration; email needs a working mail provider; images need Cloudinary; push needs Firebase credentials, service worker/native setup, and user permission; optional AI needs its API key; distributed socket delivery needs TCP Redis. Configuration names can be consulted in `api/env.example` and source; secret values are intentionally excluded from this document.

## 20. Known gaps and differences

These are findings from source inspection, not reproduced production incidents. They are included because they materially change what the application can currently promise.

| Finding | Consequence | Evidence |
| --- | --- | --- |
| Community SPA routes commented out | Community components/backend do not imply a reachable web feature | `frontend/src/App.jsx` |
| Daily-log AI enrichment invocation commented out | No automatic new-entry coaching from that path | `dailyLogsService.js` |
| Reminder scheduler calls commented out | Scheduled reminders are not active merely because jobs are imported | `api/src/cron/` |
| Habit/inactivity external cron handlers have empty bodies | Authorized calls do not complete normally through those handlers | `cronRoutes.js` |
| Export requests `dailyLogs`, config defines `daily_logs` | Export throws before producing the document | `premiumEnforcement.js` |
| Five-active-goals check after plan check | Configured premium allowance of ten can be blocked | `goalController.js` |
| Premium log length says 500; service says 300 | Effective service limit remains 300 | Premium config and daily-log service |
| Free habit analytics UI 30; API 60 | Different visible/API range limits | Habit analytics page/controller |
| Linked habit without explicit target returns zero fallback | Some weighted goal progress may remain zero | `goalDivisionService.js` |
| Goal reopen explicitly rejected | Completion cannot be undone through toggle | `goalController.js` |
| Deprecated daily-completion tracking | Old three-per-day completion claim is unsupported | `goalController.js` |
| Daily-log visibility removed | Old public/friends/private reflection feature is outdated | `dailyLogsService.js` |
| Premium payment validation is a placeholder | Subscription route is not a verified paid purchase flow | `premiumController.js` |
| Premium administrative routes lack admin middleware | Ordinary authentication is the mounted access control | `premiumRoutes.js` |
| Config management lacks admin middleware | Do not describe config writes as admin-only | `configRoutes.js` |
| Admin IP allowlist helper unused | IP-bound tokens exist, but that allowlist is not enforced | `adminAuth.js` |
| API rate-limit registrations commented out | No global/auth limiter from these registrations | `server.js` |
| Global notification cleanup ignores longer type expiry | Thirty-day cleanup can supersede model lifetime fields | `notificationJobs.js` |
| Two-factor/device session UI commented out | Neither is an available settings feature | `SecuritySection.jsx` |
| Explore router empty/unmounted | Old explore APIs are not live | `exploreRoutes.js`, server |
| Daily-log highlights handler unmounted | Handler existence does not establish public reflection highlights | `DailyLogsRoutes.js` |
| Goal year and dashboard year validation differ | Some dashboard years may fail goal creation | Goal routes/user controller |
| Legacy helper/model references remain | Avoid assuming every service method is in the current working path | Habit/community/older service code |

Other historical claims such as a full points/level economy, priority-based scoring, duration completion locks, all achievement producers, automated custom reports, or live AI goal generation should be treated as unverified unless traced to a current mounted controller and reachable UI. This reference does not promote them to available features based on old prose or a schema field.

## 21. Core user journeys

### New user to first goal

Open authentication → sign up/verify OTP or use Google → establish profile → dashboard → create a goal or choose a suggestion → set category/year/details → optionally add subgoals/habits → save within current limits → open goal details and analytics.

### Daily habit and reflection

Dashboard habit tab → open/log a habit → record completion and mood → review streak/history → open daily-log entry → write text and/or select emotion → submit the day's single entry → revisit/edit it from personal profile history.

### Goal completion and sharing

Open owned goal → review subgoal/habit progress → complete with optional note/image/feeling/date → choose visibility → view completed goal/post → share link/card → edit completion information later if needed. Reopening is rejected.

### Social connection

Discover user or open profile → follow → if private, wait for acceptance → interact with visible activities using likes/comments/replies → receive relevant inbox notifications → block/report if needed.

### Administrative release communication

Admin login → release-note tab → create/edit a versioned update → mark type/major status → optionally select that release in the email composer → choose audience and review preview → send → inspect returned results. Publishing and email sending are separate actions.

## 22. Maintenance of this reference

When changing a feature, update its user behavior, validation/limits, access rules, UI route, API route, persistence, and availability status together. Reconcile frontend plan configuration against backend enforcement and actual service checks. Before calling an integration production-live, verify it against the deployed version with appropriate test accounts and provider configuration.

This review used static source inspection. It did not launch the app, execute account mutations, send emails/push notifications, subscribe users, or exercise live databases. Documentation-only checks cover file structure, source links, and route-inventory coverage.

## 23. API route inventory

The following inventory records registered route declarations. Paths use the default `/api/v1` prefix and default `admin` segment. Authentication labels describe route middleware; controllers can add ownership, privacy, token, or feature checks. “Registered” does not mean end-to-end verified: refer to the feature sections and known gaps above, particularly for communities, premium, exports, and cron handlers.


### /auth

Source: [authRoutes.js](api/src/routes/authRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public | `register` |
| POST | `/api/v1/auth/login` | Public | `login` |
| POST | `/api/v1/auth/refresh` | Public | `refreshToken` |
| POST | `/api/v1/auth/google` | Public | `googleAuth` |
| POST | `/api/v1/auth/forgot-password` | Public | `forgotPassword` |
| POST | `/api/v1/auth/reset-password` | Public | `resetPassword` |
| POST | `/api/v1/auth/check-existing` | Public | `checkExistingUser` |
| POST | `/api/v1/auth/request-otp` | Public | `requestOTP` |
| POST | `/api/v1/auth/verify-otp` | Public | `verifyOTP` |
| POST | `/api/v1/auth/resend-otp` | Public | `resendOTP` |
| POST | `/api/v1/auth/logout` | User | `logout` |
| GET | `/api/v1/auth/me` | User | `getMe` |
| PUT | `/api/v1/auth/profile` | User | `updateProfile` |
| PUT | `/api/v1/auth/password` | User | `updatePassword` |
| POST | `/api/v1/auth/password-setup/request-otp` | User | `requestPasswordSetupOTP` |
| POST | `/api/v1/auth/password-setup/verify` | User | `setPasswordWithOTP` |

### /users

Source: [userRoutes.js](api/src/routes/userRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/users` | User | `getUsers` |
| GET | `/api/v1/users/dashboard` | User | `getDashboardStats` |
| GET | `/api/v1/users/profile` | User | `getProfileSummary` |
| GET | `/api/v1/users/analytics` | User | `getAnalytics` |
| POST | `/api/v1/users/account/deletion-otp` | User | `requestAccountDeletionOTP` |
| DELETE | `/api/v1/users/account` | User | `deleteAccount` |
| POST | `/api/v1/users/timezone` | User | `updateTimezone` |
| GET | `/api/v1/users/dashboard/years` | User | `getDashboardYears` |
| POST | `/api/v1/users/dashboard/years` | User | `addDashboardYear` |
| DELETE | `/api/v1/users/dashboard/years/:year` | User | `deleteDashboardYear` |
| GET | `/api/v1/users/suggestions` | User | `getSuggestedUsers` |
| GET | `/api/v1/users/interests` | User | `listInterests` |
| GET | `/api/v1/users/search` | User | `searchUsers` |
| GET | `/api/v1/users/:id` | User | `getUser` |
| GET | `/api/v1/users/:id/analytics` | User | `getUserAnalytics` |
| GET | `/api/v1/users/:username/goals` | User | `getUserGoals` |
| GET | `/api/v1/users/:id/goals/yearly/:year` | User | `getUserYearlyGoals` |
| GET | `/api/v1/users/:id/activities` | User | `getUserActivities` |
| PUT | `/api/v1/users/privacy` | User | `updatePrivacy` |
| GET | `/api/v1/users/:userId/block-status` | User | `getBlockStatus` |

### /goals

Source: [goalRoutes.js](api/src/routes/goalRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/goals/:id/share` | Public | `getShareableGoal` |
| GET | `/api/v1/goals/:id/og-image` | Public | `generateOGImage` |
| GET | `/api/v1/goals` | User | `getGoals` |
| GET | `/api/v1/goals/trending` | User | `getTrendingGoals` |
| GET | `/api/v1/goals/search` | User | `searchGoals` |
| GET | `/api/v1/goals/:id/analytics` | User | `getGoalAnalytics` |
| GET | `/api/v1/goals/:id/post` | User | `getGoalPost` |
| GET | `/api/v1/goals/:id/timeline` | User | `getGoalTimeline` |
| GET | `/api/v1/goals/:id/dependencies` | User | `checkGoalDependencies` |
| GET | `/api/v1/goals/:id/updates` | User | `getGoalUpdates` |
| GET | `/api/v1/goals/:id/updates/today` | User | `getTodayGoalUpdate` |
| PUT | `/api/v1/goals/:id/updates/today` | User | `upsertTodayGoalUpdate` |
| DELETE | `/api/v1/goals/:id/updates/today` | User | `deleteTodayGoalUpdate` |
| POST | `/api/v1/goals` | User | `createGoal` |
| GET | `/api/v1/goals/yearly/:year` | User | `getYearlyGoalsSummary` |
| GET | `/api/v1/goals/:id` | User | `getGoal` |
| PUT | `/api/v1/goals/:id` | User | `updateGoal` |
| DELETE | `/api/v1/goals/:id` | User | `deleteGoal` |
| PATCH | `/api/v1/goals/:id/like` | User | `toggleGoalLike` |
| GET | `/api/v1/goals/:id/progress` | User | `getProgress` |
| PUT | `/api/v1/goals/:id/subgoals` | User | `setSubGoals` |
| PATCH | `/api/v1/goals/:id/subgoals/:index` | User | `toggleSubGoal` |
| PUT | `/api/v1/goals/:id/habits` | User | `setHabitLinks` |
| PATCH | `/api/v1/goals/:id/toggle` | User | `Inline handler` |
| PATCH | `/api/v1/goals/:id/completion` | User | `Inline handler` |

### /social

Source: [socialRoutes.js](api/src/routes/socialRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/social/follow/:userId` | User | `followUser` |
| DELETE | `/api/v1/social/follow/:userId` | User | `unfollowUser` |
| GET | `/api/v1/social/follow/requests` | User | `getFollowRequests` |
| POST | `/api/v1/social/follow/requests/:followerId/accept` | User | `acceptFollowRequest` |
| POST | `/api/v1/social/follow/requests/:followerId/reject` | User | `rejectFollowRequest` |
| DELETE | `/api/v1/social/follow/requests/:userId` | User | `cancelFollowRequest` |
| GET | `/api/v1/social/followers` | User | `getFollowers` |
| GET | `/api/v1/social/following` | User | `getFollowing` |
| GET | `/api/v1/social/following/check/:userId` | User | `checkFollowingStatus` |
| GET | `/api/v1/social/mutual/:userId` | User | `getMutualFollowers` |
| GET | `/api/v1/social/suggestions` | User | `getSuggestedUsers` |
| GET | `/api/v1/social/stats` | User | `getFollowStats` |
| GET | `/api/v1/social/feed` | User | `getActivityFeed` |
| GET | `/api/v1/social/popular` | User | `getPopularUsers` |

### /activities

Source: [activityRoutes.js](api/src/routes/activityRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/activities/recent` | Optional user | `getRecentActivities` |
| GET | `/api/v1/activities/trending` | User | `getTrendingActivities` |
| GET | `/api/v1/activities/stats` | User | `getActivityStats` |
| GET | `/api/v1/activities/user/:userId` | User | `getUserActivities` |
| GET | `/api/v1/activities/:id` | User | `getActivity` |
| PATCH | `/api/v1/activities/:id/like` | User | `toggleActivityLike` |
| GET | `/api/v1/activities/:id/comments` | User | `getActivityComments` |
| POST | `/api/v1/activities/:id/comments` | User | `addActivityComment` |
| POST | `/api/v1/activities/:id/comments/:commentId/replies` | User | `replyToActivityComment` |
| PATCH | `/api/v1/activities/:id/comments/:commentId/like` | User | `toggleCommentLike` |

### /leaderboard

Source: [leaderboardRoutes.js](api/src/routes/leaderboardRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/leaderboard` | Optional user | `getGlobalLeaderboard` |
| GET | `/api/v1/leaderboard/category/:category` | User | `getCategoryLeaderboard` |
| GET | `/api/v1/leaderboard/friends` | User | `getFriendsLeaderboard` |
| GET | `/api/v1/leaderboard/stats` | User | `getLeaderboardStats` |

### /upload

Source: [uploadRoutes.js](api/src/routes/uploadRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/upload/avatar` | User | `Inline handler` |
| POST | `/api/v1/upload/community/:id/avatar` | User | `Inline handler` |
| POST | `/api/v1/upload/community/:id/banner` | User | `Inline handler` |

### /location

Source: [locationRoutes.js](api/src/routes/locationRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/location/search-city` | Public | `Inline handler` |

### /daily-logs

Source: [DailyLogsRoutes.js](api/src/routes/DailyLogsRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/daily-logs/prompt` | User | `getPrompt` |
| POST | `/api/v1/daily-logs` | User | `createEntry` |
| PATCH | `/api/v1/daily-logs/:entryId` | User | `updateEntry` |
| DELETE | `/api/v1/daily-logs/:entryId` | User | `clearEntry` |
| GET | `/api/v1/daily-logs/me` | User | `getMyEntries` |
| GET | `/api/v1/daily-logs/export` | User | `exportMyDailyLogs` |

### /feedback

Source: [feedbackRoutes.js](api/src/routes/feedbackRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/feedback` | User | `Inline handler` |

### /habits

Source: [habitRoutes.js](api/src/routes/habitRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/habits/:id/og-image` | Public | `generateStreakOGImage` |
| GET | `/api/v1/habits` | User | `listHabits` |
| POST | `/api/v1/habits` | User | `createHabit` |
| GET | `/api/v1/habits/stats` | User | `getStats` |
| GET | `/api/v1/habits/analytics` | User | `getAnalytics` |
| GET | `/api/v1/habits/:id` | User | `getHabit` |
| GET | `/api/v1/habits/:id/analytics` | User | `getHabitAnalytics` |
| GET | `/api/v1/habits/:id/logs` | User | `getHabitLogs` |
| PATCH | `/api/v1/habits/:id/logs/:logId/completions/:completionIndex` | User | `updateHabitLogCompletionEntry` |
| DELETE | `/api/v1/habits/:id/logs/:logId/completions/:completionIndex` | User | `deleteHabitLogCompletionEntry` |
| GET | `/api/v1/habits/:id/dependencies` | User | `checkHabitDependencies` |
| PUT | `/api/v1/habits/:id` | User | `updateHabit` |
| PATCH | `/api/v1/habits/:id/archive` | User | `archiveHabit` |
| DELETE | `/api/v1/habits/:id` | User | `deleteHabit` |
| POST | `/api/v1/habits/:id/log` | User | `toggleLog` |
| GET | `/api/v1/habits/:id/heatmap` | User | `getHeatmap` |

### /moderation

Source: [moderationRoutes.js](api/src/routes/moderationRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/moderation/report` | User | `reportContent` |
| POST | `/api/v1/moderation/block/:userId` | User | `blockUser` |
| DELETE | `/api/v1/moderation/block/:userId` | User | `unblockUser` |
| GET | `/api/v1/moderation/blocked` | User | `listBlocked` |

### /notifications

Source: [notificationRoutes.js](api/src/routes/notificationRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/notifications/devices/register` | Optional user | `registerDevice` |
| GET | `/api/v1/notifications` | User | `getNotifications` |
| GET | `/api/v1/notifications/follow-requests` | User | `getFollowRequests` |
| POST | `/api/v1/notifications/follow-requests/:notificationId/accept` | User | `acceptFollowRequest` |
| POST | `/api/v1/notifications/follow-requests/:notificationId/reject` | User | `rejectFollowRequest` |
| GET | `/api/v1/notifications/devices` | User | `listDevices` |
| PATCH | `/api/v1/notifications/:id/read` | User | `markAsRead` |
| PATCH | `/api/v1/notifications/read-all` | User | `markAllAsRead` |
| DELETE | `/api/v1/notifications/:id` | User | `deleteNotification` |
| POST | `/api/v1/notifications/devices/unregister` | User | `unregisterDevice` |
| POST | `/api/v1/notifications/test-push` | User | `testPush` |

### /communities

Source: [communityRoutes.js](api/src/routes/communityRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/communities/mine` | User | `listMyCommunities` |
| GET | `/api/v1/communities/discover` | User | `discoverCommunities` |
| GET | `/api/v1/communities/joined/items` | User | `myJoinedItems` |
| POST | `/api/v1/communities` | User | `createCommunity` |
| PATCH | `/api/v1/communities/:id` | User | `updateCommunity` |
| GET | `/api/v1/communities/:id` | User | `getCommunity` |
| GET | `/api/v1/communities/:id/dashboard` | User | `getDashboard` |
| GET | `/api/v1/communities/:id/analytics` | User | `getAnalytics` |
| GET | `/api/v1/communities/:id/feed` | User | `feed` |
| POST | `/api/v1/communities/:id/chat` | User | `Inline handler` |
| DELETE | `/api/v1/communities/:id/chat/:msgId` | User | `Inline handler` |
| POST | `/api/v1/communities/:id/reactions` | User | `Inline handler` |
| GET | `/api/v1/communities/:id/items` | User | `listItems` |
| GET | `/api/v1/communities/:id/items/pending` | User | `listPendingItems` |
| POST | `/api/v1/communities/:id/items` | User | `suggestItem` |
| POST | `/api/v1/communities/:id/items/:itemId/approve` | User | `approveItem` |
| POST | `/api/v1/communities/:id/items/create` | User | `createNewItem` |
| POST | `/api/v1/communities/:id/items/copy` | User | `copyFromPersonal` |
| POST | `/api/v1/communities/:id/items/:itemId/join` | User | `joinItem` |
| POST | `/api/v1/communities/:id/items/:itemId/leave` | User | `leaveItem` |
| DELETE | `/api/v1/communities/:id/items/:itemId` | User | `removeItem` |
| GET | `/api/v1/communities/:id/items/:itemId/progress` | User | `getItemProgress` |
| GET | `/api/v1/communities/:id/items/:itemId/analytics` | User | `getItemAnalytics` |
| POST | `/api/v1/communities/:id/join` | User | `join` |
| POST | `/api/v1/communities/:id/leave` | User | `leave` |
| DELETE | `/api/v1/communities/:id` | User | `deleteCommunity` |
| GET | `/api/v1/communities/:id/members` | User | `members` |
| GET | `/api/v1/communities/:id/members/pending` | User | `pendingMembers` |
| POST | `/api/v1/communities/:id/members/:userId/approve` | User | `approveMember` |
| DELETE | `/api/v1/communities/:id/members/:userId` | User | `removeMember` |
| GET | `/api/v1/communities/:id/members/:userId/analytics` | User | `memberAnalytics` |

### /settings

Source: [settingsRoutes.js](api/src/routes/settingsRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/settings/privacy` | User | `getPrivacySettings` |
| POST | `/api/v1/settings/privacy` | User | `updatePrivacySettings` |
| GET | `/api/v1/settings/theme` | User | `getThemeSettings` |
| POST | `/api/v1/settings/theme` | User | `updateThemeSettings` |
| GET | `/api/v1/settings/blocked` | User | `getBlockedUsers` |
| POST | `/api/v1/settings/blocked` | User | `blockUser` |
| DELETE | `/api/v1/settings/blocked/:username` | User | `unblockUser` |
| GET | `/api/v1/settings/notifications` | User | `getNotificationSettings` |
| POST | `/api/v1/settings/notifications` | User | `updateNotificationSettings` |
| POST | `/api/v1/settings/password` | User | `updatePassword` |

### /premium

Source: [premiumRoutes.js](api/src/routes/premiumRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/premium/status` | User | `getPremiumStatus` |
| GET | `/api/v1/premium/features` | User | `getFeatureLimits` |
| POST | `/api/v1/premium/subscribe` | User | `subscribeToPremium` |
| POST | `/api/v1/premium/cancel` | User | `cancelSubscription` |
| GET | `/api/v1/premium/stats` | User | `getPremiumStats` |
| GET | `/api/v1/premium/expiring` | User | `getExpiringUsers` |
| GET | `/api/v1/premium/expired` | User | `getExpiredUsers` |
| POST | `/api/v1/premium/grant` | User | `grantPremiumToUser` |
| DELETE | `/api/v1/premium/revoke` | User | `revokePremiumFromUser` |

### /product-updates

Source: [productUpdateRoutes.js](api/src/routes/productUpdateRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/product-updates` | Public | `getAllUpdates` |
| GET | `/api/v1/product-updates/type/:type` | Public | `getUpdatesByType` |
| GET | `/api/v1/product-updates/latest` | User | `getLatestMajorUpdate` |
| POST | `/api/v1/product-updates/seen` | User | `markUpdateAsSeen` |
| POST | `/api/v1/product-updates` | Admin token | `createUpdate` |
| DELETE | `/api/v1/product-updates/:version` | Admin token | `deleteUpdate` |

### /sync

Source: [syncRoutes.js](api/src/routes/syncRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/sync/latest` | Public | `getLatestSyncData` |

### /admin

Source: [adminRoutes.js](api/src/routes/adminRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/admin/login` | Public | `login` |
| GET | `/api/v1/admin/users` | Admin token | `getUsers` |
| GET | `/api/v1/admin/goals` | Admin token | `getGoals` |
| GET | `/api/v1/admin/habits` | Admin token | `getHabits` |
| GET | `/api/v1/admin/analytics` | Admin token | `getAnalytics` |
| POST | `/api/v1/admin/email/send` | Admin token | `sendEmail` |
| GET | `/api/v1/admin/product-updates` | Admin token | `getProductUpdates` |
| POST | `/api/v1/admin/product-updates` | Admin token | `createProductUpdate` |
| PUT | `/api/v1/admin/product-updates/:version` | Admin token | `updateProductUpdate` |
| DELETE | `/api/v1/admin/product-updates/:version` | Admin token | `deleteProductUpdate` |

### /config

Source: [configRoutes.js](api/src/routes/configRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| GET | `/api/v1/config/maintenance` | Public | `getMaintenanceStatus` |
| GET | `/api/v1/config` | User | `getAllConfigs` |
| GET | `/api/v1/config/:key` | User | `getConfigByKey` |
| POST | `/api/v1/config` | User | `upsertConfig` |
| PUT | `/api/v1/config/maintenance` | User | `toggleMaintenanceMode` |
| DELETE | `/api/v1/config/:key` | User | `deleteConfig` |

### /cron

Source: [cronRoutes.js](api/src/routes/cronRoutes.js).

| Method | Path | Route access | Handler |
| --- | --- | --- | --- |
| POST | `/api/v1/cron/habit-reminders` | Cron secret | `Inline handler` |
| POST | `/api/v1/cron/daily-logs-prompts` | Cron secret | `Inline handler` |
| POST | `/api/v1/cron/morning-quotes` | Cron secret | `Inline handler` |
| POST | `/api/v1/cron/nightly-quotes` | Cron secret | `Inline handler` |
| POST | `/api/v1/cron/inactivity-reminders` | Cron secret | `Inline handler` |
| POST | `/api/v1/cron/delete-old-notifications` | Cron secret | `Inline handler` |

### Health

| Method | Path | Route access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Public | API running status, timestamp, environment, API version |

Inventory total: **211 registered HTTP route declarations**, including health. Explore contributes no mounted routes. The admin prefix and API version are configurable.
