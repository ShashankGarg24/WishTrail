// Expo config plugin to add static Android App Shortcuts
// Usage (in app.json or app.config.js):
// {
//   "plugins": [
//     "./plugins/withAndroidShortcuts"
//   ]
// }

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureArray(obj, key) {
  if (!obj[key]) obj[key] = [];
  return obj[key];
}

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="dashboard"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_dashboard_short"
    android:shortcutLongLabel="@string/shortcut_dashboard_long">
    <intent android:action="android.intent.action.VIEW" android:data="wishtrail://dashboard" />
  </shortcut>
  <shortcut
    android:shortcutId="feed"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_feed_short"
    android:shortcutLongLabel="@string/shortcut_feed_long">
    <intent android:action="android.intent.action.VIEW" android:data="wishtrail://feed" />
  </shortcut>
  <shortcut
    android:shortcutId="communities"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_communities_short"
    android:shortcutLongLabel="@string/shortcut_communities_long">
    <intent android:action="android.intent.action.VIEW" android:data="wishtrail://communities" />
  </shortcut>
  <shortcut
    android:shortcutId="feedback"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_feedback_short"
    android:shortcutLongLabel="@string/shortcut_feedback_long">
    <intent android:action="android.intent.action.VIEW" android:data="wishtrail://feedback" />
  </shortcut>
</shortcuts>`;

const LABELS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="shortcut_dashboard_short">Dashboard</string>
  <string name="shortcut_dashboard_long">Open Dashboard</string>
  <string name="shortcut_feed_short">Feed</string>
  <string name="shortcut_feed_long">Open Feed</string>
  <string name="shortcut_communities_short">Communities</string>
  <string name="shortcut_communities_long">Open Communities</string>
  <string name="shortcut_feedback_short">Feedback</string>
  <string name="shortcut_feedback_long">Leave Feedback</string>
</resources>`;

const withAndroidShortcuts = (config) => {
  // 1) Write res/xml/shortcuts.xml during prebuild
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      try { fs.mkdirSync(xmlDir, { recursive: true }); } catch {}
      const file = path.join(xmlDir, 'shortcuts.xml');
      fs.writeFileSync(file, SHORTCUTS_XML, 'utf8');
      const valuesDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values');
      try { fs.mkdirSync(valuesDir, { recursive: true }); } catch {}
      const labelsFile = path.join(valuesDir, 'shortcuts_labels.xml');
      fs.writeFileSync(labelsFile, LABELS_XML, 'utf8');
      return cfg;
    },
  ]);

  // 2) Attach meta-data to the LAUNCHER activity
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application && manifest.application[0];
    if (!app) return cfg;
    const activities = ensureArray(app, 'activity');
    const mainActivity = activities.find((act) => {
      const filters = (act['intent-filter'] || []);
      return filters.some((f) => {
        const actions = (f.action || []).map(a => a['$'] && a['$']['android:name']);
        const cats = (f.category || []).map(c => c['$'] && c['$']['android:name']);
        return actions.includes('android.intent.action.MAIN') && cats.includes('android.intent.category.LAUNCHER');
      });
    });
    if (!mainActivity) return cfg;
    const meta = ensureArray(mainActivity, 'meta-data');
    const exists = meta.some((m) => m['$'] && m['$']['android:name'] === 'android.app.shortcuts');
    if (!exists) {
      meta.push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      });
    }
    return cfg;
  });

  return config;
};

module.exports = withAndroidShortcuts;


