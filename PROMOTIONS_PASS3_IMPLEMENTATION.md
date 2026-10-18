# Pass 3: Promotions product integration

Implemented on October 18, 2026. No commits, pushes, deployment, database schema changes, new PostgreSQL tables, MongoDB collections, or audit system.

## API and existing contract

Added authenticated `GET /api/v1/config/active-promotion` before the admin-only dynamic config route. Response follows existing conventions:

```json
{"success":true,"data":{"promotion":null}}
```

Eligible responses replace null with `id`, `surface`, `title`, `subtitle`, `offerCopy`, `ctaLabel`, and `ctaUrl`. No raw Config document, audience, schedule, unrelated configuration, or admin metadata is returned. Responses use `Cache-Control: private, no-store`.

Reuses the existing Config `promotion` value and all existing fields: `enabled`, `title`, `subtitle`, `offerCopy`, `ctaLabel`, `ctaUrl`, `startAt`, `endAt`, `audience`, `surface`. No new stored fields. The actual contract uses singular `startAt`/`endAt` and `offerCopy`.

The resolver requires enabled=true, announcement_card, valid required content, valid dates, matching audience, and an existing-validator-approved WishTrail URL. Start is inclusive; end is exclusive: `[startAt, endAt)`. Malformed/ineligible configuration returns null. The existing enabled-promotion contract requires CTA label and destination; missing/unsafe CTA therefore rejects the promotion rather than silently weakening that contract.

Authentication loads the current user from PostgreSQL with the existing auth middleware. Audience resolution uses `isPremiumActive(user.premium_expires_at)`. Client query parameters, client flags, and JWT premium claims are not used. Config storage errors follow the existing API error handler; the client omits the card on failure.

## Home, preview, and mobile

`DashboardPage` mounts `HomeOverview` only for Overview. One shared announcement card sits after the mobile greeting/desktop top banner and before dashboard content. It is not mounted on the public landing page, other dashboard tabs, Feed, Profile, or login.

The product card and admin preview share `components/PromotionCard.jsx`; obsolete admin-only promotion styles were removed. Content renders as React text with optional subtitle/offer slots, responsive light/dark styling, semantic router links, focus indicators, and an accessible dismiss button. Preview link clicks are prevented.

The Expo app wraps this same hosted product in `app/index.js`; there is no separate native Home consumer. The existing WebView already uses localStorage for persisted web authentication. Promotion dismissal uses that same storage facility and needs no native bridge. Server-approved owned URLs become relative React Router destinations, keeping navigation in the current browser/WebView origin. Leading duplicate path slashes are normalized to prevent a network-path link.

Dismissal uses `wt_promotion_dismissed:<id>`. The ID is SHA-256 over sanitized rendering fields plus audience/start/end. Content or schedule changes produce a new identity; admin metadata changes do not. Storage failures are caught, with in-memory dismissal retained for the current mount. Dismissal is local to the browser/WebView origin, not synchronized across devices.

Fetching uses the existing authenticated Axios client, a five-second timeout, cancellation, one in-flight request per mounted consumer, and no page loader or placeholder. Visible Home revalidates every minute and on focus/visibility restoration. Hidden pages do not poll. Failed revalidation removes a stale card; user changes cannot display the previous user's result. No new state-management or server-cache dependency was introduced.

## Files changed

- `api/src/services/activePromotionService.js`: sanitized eligibility resolver and existing Config read.
- `api/src/controllers/configController.js`: product response and no-store headers.
- `api/src/routes/configRoutes.js`: authenticated product endpoint.
- `api/src/services/adminProductService.js`: live-placement indicator and config description.
- `api/src/services/__tests__/activePromotion.test.js`: eligibility, boundaries, identity, privacy, authentication, API failures.
- `api/src/services/__tests__/adminPass2.test.js`: live-placement expectation.
- `frontend/src/components/PromotionCard.jsx`: shared card.
- `frontend/src/components/ActivePromotion.jsx`: fetching, revalidation, cancellation, dismissal.
- `frontend/src/utils/promotion.js`: local storage helpers, fetch normalization, internal destination conversion.
- `frontend/src/components/HomeOverview.jsx`: single Overview placement.
- `frontend/src/admin/product/PromotionCard.jsx`: shared-card preview wrapper.
- `frontend/src/admin/product/ProductPage.jsx`: accurate live behavior and UTC boundary copy.
- `frontend/src/admin/admin.css`: removed obsolete independently styled card.
- `frontend/tests/promotion.test.mjs`: real Home/card component tests using React test renderer, with unrelated API/weekly-trail dependencies stubbed.
- `frontend/tests/notificationRequests.test.mjs`: fixed existing in-memory API loader's missing admin-config import replacement so the full frontend suite can run.
- `frontend/package.json`, `frontend/package-lock.json`: React 18 test-renderer development dependency.
- `PROMOTIONS_PASS3_IMPLEMENTATION.md`: implementation and verification report.

## Verification results

| Command | Result |
| --- | --- |
| `cd api; npm test -- --runInBand` | 25 suites, 213 tests passed |
| `cd frontend; node --test tests` | 29 tests passed, including six promotion component scenarios |
| `cd frontend; npm run lint` | Passed |
| `cd frontend; npm run build` | Passed; existing Browserslist, PostCSS and large-chunk warnings |
| `cd api; npm run lint` | Blocked: repository has no backend ESLint configuration |
| Focused ESLint check using existing ESLint Node API, eslint:recommended, node/es2022, on four changed backend production files | Passed |
| `node --test app/tests` | 16 passed; two existing onboarding tests blocked by missing installed `@babel/plugin-transform-modules-commonjs` |
| `git diff --check` | Passed |

## Manual verification matrix and limitations

No live Admin saves, production user accounts, graphical browser session, or physical installed-device session were exercised. These remain manual deployment checks; automated equivalents below are not claims of live manual verification.

| Requested check | Automated evidence / remaining manual work |
| --- | --- |
| Disabled / future / expired / malformed / unsupported | Resolver tests pass; live Admin-to-Home check pending |
| Active all-user promotion | Resolver and actual Home rendering tests pass; live save pending |
| Free versus premium | Both audience directions, expired premium and client-flag bypass tested; live account checks pending |
| Start/end boundary | Exact inclusive start and exclusive end tested |
| Dismiss and reload | Storage-backed component remount tested; browser/device restart pending |
| Changed promotion appears after old dismissal | Identity change and component redisplay tested |
| Desktop CTA | React Router click and destination tested; graphical click check pending |
| Mobile/WebView CTA | Same click tested with simulated native bridge; installed-device check pending |
| No promotion / failed API | Home normal rendering and failed-revalidation removal tested |
| Admin preview consistency | Shared production component verified by source; visual comparison pending |
| Light/dark and responsive layout | Responsive classes implemented; graphical/device inspection pending |

No requested implementation behavior is deferred. Remaining verification limits are the live/manual checks and existing backend lint/native test setup issues described above.
