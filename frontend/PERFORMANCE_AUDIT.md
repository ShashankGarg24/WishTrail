# Lighthouse performance work

The supplied authenticated `/home` reports recorded:

| Metric | Mobile | Desktop |
| --- | --- | --- |
| Performance | 32 | 56 |
| First contentful paint | 6.6 s | 2.1 s |
| Largest contentful paint | 21.9 s | 6.1 s |
| Total blocking time | 1,330 ms | 170 ms |

Mobile LCP was the greeting; desktop LCP was its background photograph. The dashboard previously withheld both until five API requests completed.

## Implemented

- Render the greeting during dashboard loading, with placeholders instead of premature empty data.
- Preload the desktop greeting photograph at application startup, use an explicit high-priority image, and avoid downloading it on mobile.
- Remove automatic downloads of unopened dashboard dialogs.
- Load Google Identity only with the sign-in button.
- Load Firebase and Datadog SDKs dynamically; disabled Datadog no longer contributes its SDKs to initial JavaScript.
- Load html2canvas when exporting a goal image.
- Queue Google Analytics events immediately but fetch its SDK after the window load event.
- Make the Google Fonts stylesheet nonblocking (fallback text can appear before Manrope).
- Serve a 128px logo for small UI placements, preserving the original artwork.

## Local verification

The production entry bundle decreased from 720.08 KB / 222.29 KB gzip to 453.69 KB / 143.45 KB gzip. This is the entry chunk, not total JavaScript downloaded during a session; optional SDKs and routes still load when needed. Environment flags can affect production output.

The small logo decreased from 284,045 bytes to 4,752 bytes. The build succeeds. The existing 37 tests pass, and an added rendering regression test verifies loading-to-ready behavior. Project lint identifies unrelated irregular whitespace in the already-modified `src/pages/ProfilePage.jsx`.

## Deployment verification

No new Lighthouse score is claimed. After deploying, repeat mobile and desktop audits with the same authenticated account, route, and throttling settings. Use a fresh browser profile, sign in, and run three times per device; compare medians. The supplied report warned about existing IndexedDB data.

Check Google login, foreground push/logout, image export, and telemetry with production environment flags. Deferred analytics may miss visits that end before window load; font loading can cause a small text reflow.

Dashboard requests still load up to 1,000 goals. Further improvements should measure API latency and introduce a dedicated overview response or pagination without breaking goal filtering. The supplied contrast and canonical SEO failures remain separate follow-up work.
