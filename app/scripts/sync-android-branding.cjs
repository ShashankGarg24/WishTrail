const fs = require('node:fs/promises');
const path = require('node:path');
const { setIconAsync } = require('@expo/prebuild-config/build/plugins/icons/withAndroidIcons');
const { setSplashImageDrawablesForThemeAsync } = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withAndroidSplashImages');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const { expo: config } = require('../app.json');
  const adaptive = config.android.adaptiveIcon;
  await setIconAsync(projectRoot, {
    icon: path.resolve(projectRoot, adaptive.foregroundImage),
    backgroundColor: adaptive.backgroundColor,
    isAdaptive: true,
  });

  // The 12dp native inset keeps the logo visible while its blue tile extends
  // beyond the launcher's mask. A larger inset exposes a border around the tile.
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const file = path.join(projectRoot, 'android/app/src/main/res/mipmap-anydpi-v26', name);
    const xml = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, xml.replace('@mipmap/ic_launcher_foreground', '@drawable/ic_launcher_foreground_inset'));
  }

  const colorsFile = path.join(projectRoot, 'android/app/src/main/res/values/colors.xml');
  const colors = await fs.readFile(colorsFile, 'utf8');
  await fs.writeFile(colorsFile, colors.replace(
    /(<color name="iconBackground">)[^<]*(<\/color>)/,
    (_, start, end) => start + adaptive.backgroundColor + end,
  ));

  const splash = config.splash;
  const source = path.resolve(projectRoot, splash.image);
  await setSplashImageDrawablesForThemeAsync({
    backgroundColor: splash.backgroundColor,
    ...Object.fromEntries(['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].map(dpi => [dpi, source])),
  }, 'light', projectRoot, 200);
  console.log('Android launcher and splash images updated from app.json.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
