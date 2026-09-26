const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { transformFileSync } = require('@babel/core');

function setup() {
  const entries = new Map();
  let installed = new Date('2026-01-01T00:00:00Z');
  const storage = { getItem: async key => entries.get(key) ?? null, setItem: async (key, value) => entries.set(key, value) };
  const module = { exports: {} };
  const code = transformFileSync(require.resolve('../onboardingState.js'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { exports: module.exports, require: name => {
    if (name === '@react-native-async-storage/async-storage') return storage;
    if (name === 'expo-application') return { getInstallationTimeAsync: async () => installed };
    throw Error(name);
  } });
  return { ...module.exports, entries, reinstall: () => { installed = new Date('2026-02-01T00:00:00Z'); } };
}

test('fresh install shows onboarding; completion survives reopening and updates', async () => {
  const app = setup();
  const fresh = await app.getOnboardingState();
  assert.equal(fresh.completed, false);
  await app.completeOnboarding(fresh.key);
  assert.equal((await app.getOnboardingState()).completed, true);
  assert.equal((await app.getOnboardingState()).key, fresh.key);
});

test('reinstall shows onboarding even with restored data from the old install', async () => {
  const app = setup();
  const old = await app.getOnboardingState();
  await app.completeOnboarding(old.key);
  app.reinstall();
  const fresh = await app.getOnboardingState();
  assert.notEqual(fresh.key, old.key);
  assert.equal(fresh.completed, false);
});
