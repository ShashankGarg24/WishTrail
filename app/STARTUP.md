# Startup experience

`StartupSplash` is mounted once above the existing native onboarding/WebView. It
loads bundled Manrope Regular/SemiBold and clips the transparent padding of the
original `assets/splash.png`; no replacement logo is generated. All motion uses
React Native Animated's native driver, including the opposing-transform text
clip. The logo remains vertically centered; the tagline sits 12dp below it.

Timeline: entrance 0–350ms, wordmark 350–850ms, tagline 800–1100ms, then a 180ms
fade as soon as the mounted destination is ready. Auth/session restoration and
onboarding storage reads run concurrently. Background/foreground transitions do
not recreate the splash. Onboarding completion keeps the existing installation
key and is saved before leaving onboarding.

Android's native launch screen uses the same #F8FAFC background. It displays the existing W logo immediately while JavaScript and fonts load,
then crossfades over 350ms into the React Native logo entrance. `preventAutoHideAsync`
is called at module scope; native hiding occurs after font, image and text layout
readiness. `MainActivity` registers Expo's SplashScreenManager. The config plugin
and `android:sync-branding` preserve this setup when regenerating resources.

The web router sends `WT_STARTUP_READY` after auth bootstrap and lazy route commit.
Dashboard data is not part of this signal; the existing dashboard renders a
skeleton while its requests complete. Native refresh credentials are supplied via
the WebView injected object before bootstrap. Missing/expired access tokens use
the existing auth API; valid tokens do not wait for profile or dashboard calls.

## Release and verification

Deploy the frontend readiness bridge before distributing the rebuilt Android
app: the WebView uses the hosted WEB_URL, not a bundled copy of the frontend.
Rebuild the native app for the new expo-splash-screen dependency and Android
resources; a Metro reload alone cannot update them.

Automated checks:

- From app: `node --test tests/onboardingState.test.cjs`
- From frontend: `node --test tests/startupSession.test.mjs` and `npm run build`
- From app: `npx expo export --platform android`
- From app/android: `./gradlew.bat :app:assembleDebug`

On a release build, verify fresh install, completed onboarding with and without a
session, expired session, slow dashboard requests, offline launch, resume, and
small/large Android screens. Confirm there is no native/RN flash, the destination
is visible underneath the fade, and returning users do not repeat onboarding.
Expo Go/dev-client launch screens do not exactly reproduce release behavior:
https://docs.expo.dev/versions/latest/sdk/splash-screen/
