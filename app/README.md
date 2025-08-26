# WishTrail App (WebView Shell)

This is a minimal Expo React Native shell that wraps the WishTrail web app in a native WebView.

## Quick start

1) Install dependencies

```bash
cd app
npm install
```

2) Set the web URL (optional)

By default, the app loads `http://localhost:5173`.

To point to a deployed URL, edit `app.json` and set:

```json
{
  "expo": {
    "extra": {
      "WEB_URL": "https://your-deployed-site.example"
    }
  }
}
```

3) Run

```bash
npx expo start
# press i for iOS simulator or a for Android emulator (or scan QR with Expo Go)
```

## Notes
- External links open in the device browser.
- Android hardware back navigates inside the WebView history before closing the app.
- Pull‑to‑refresh is enabled on Android. A loading spinner is shown while pages load.
- For development, ensure your phone and dev machine are on the same network if pointing to localhost.
