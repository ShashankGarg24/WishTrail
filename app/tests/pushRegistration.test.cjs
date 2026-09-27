const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../pushRegistration.js'), 'utf8').replace('export ', '');
const start = vm.runInNewContext(source + '\nstartPushRegistration;', { AbortController, setTimeout, clearTimeout });
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(register) {
  const timers = new Map();
  let id = 0, successes = 0, failures = 0;
  const stop = start({ register, onSuccess: () => successes++, onFailure: () => failures++,
    schedule: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, cancel: key => timers.delete(key) });
  return { stop, timers, get successes() { return successes; }, get failures() { return failures; },
    fire(delay) { const [key, timer] = [...timers].find(([, value]) => value.delay === delay); timers.delete(key); timer.fn(); } };
}
test('transient failure retries and stops after registration succeeds', async () => {
  let attempts = 0;
  const f = fixture(async () => { if (++attempts === 1) throw new Error('offline'); });
  await tick();
  assert.equal(f.failures, 1);
  f.fire(5000);
  await tick();
  assert.equal(f.successes, 1);
  assert.equal(f.timers.size, 0);
});
test('stalled registration aborts at its deadline and retries', async () => {
  const f = fixture(signal => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')))));
  f.fire(10000);
  await tick();
  assert.equal(f.failures, 1);
  assert.ok([...f.timers.values()].some(timer => timer.delay === 5000));
  f.stop();
  assert.equal(f.timers.size, 0);
});
test('account change cancels in-flight registration without retries or stale success', async () => {
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.stop(); resolve(); await tick();
  assert.equal(f.successes, 0);
  assert.equal(f.timers.size, 0);
});
test('expired credentials wait for an auth update instead of retrying', async () => {
  const f = fixture(async () => { throw Object.assign(new Error('expired'), { status: 401 }); });
  await tick();
  assert.equal(f.failures, 1);
  assert.equal(f.timers.size, 0);
});
