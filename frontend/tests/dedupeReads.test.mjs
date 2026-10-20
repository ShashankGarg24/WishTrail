import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { dedupeReads } from '../src/services/dedupeReads.js';

function setup() {
  const calls = [];
  let session = 'alice';
  const api = axios.create({
    adapter: config => new Promise((resolve, reject) => calls.push({
      config,
      resolve: data => resolve({ data, config, status: 200, headers: {} }),
      reject
    }))
  });
  dedupeReads(api, () => session);
  return { api, calls, setSession: value => { session = value; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('overlapping reads share one request; settled responses are fetched again', async () => {
  const { api, calls } = setup();
  const first = api.get('/goals', { params: { page: 1 } });
  const second = api.get('/goals', { params: { page: 1 } });
  await tick();
  assert.equal(calls.length, 1);
  calls[0].resolve({ goals: [] });
  assert.deepEqual((await first).data, (await second).data);
  const next = api.get('/goals', { params: { page: 1 } });
  await tick();
  assert.equal(calls.length, 2);
  calls[1].resolve({});
  await next;
});

test('different parameters, accounts and cancellation options stay independent', async () => {
  const { api, calls, setSession } = setup();
  const requests = [api.get('/goals', { params: { page: 1 } }), api.get('/goals', { params: { page: 2 } })];
  setSession('bob');
  requests.push(api.get('/goals', { params: { page: 1 } }));
  requests.push(api.get('/goals', { signal: new AbortController().signal }));
  requests.push(api.get('/goals', { signal: new AbortController().signal }));
  await tick();
  assert.equal(calls.length, 5);
  calls.forEach(call => call.resolve({}));
  await Promise.all(requests);
});

test('failed reads can be retried', async () => {
  const { api, calls } = setup();
  const request = api.get('/goals');
  const failure = assert.rejects(request, /offline/);
  await tick();
  calls[0].reject(new Error('offline'));
  await failure;
  const retry = api.get('/goals');
  await tick();
  assert.equal(calls.length, 2);
  calls[1].resolve({});
  await retry;
});

test('reads after a write never reuse a pre-write response', async () => {
  const { api, calls } = setup();
  const before = api.get('/goals');
  await tick();
  const write = api.post('/goals', { title: 'New goal' });
  await tick();
  const during = api.get('/goals');
  await tick();
  calls[1].resolve({});
  await write;
  const after = api.get('/goals');
  await tick();
  assert.equal(calls.length, 4);
  calls[0].resolve({ old: true });
  await before;
  // An older request settling must not evict the latest pending read.
  const duplicate = api.get('/goals');
  await tick();
  assert.equal(calls.length, 4);
  calls[2].resolve({});
  calls[3].resolve({ fresh: true });
  await during;
  assert.deepEqual((await after).data, { fresh: true });
  assert.deepEqual((await duplicate).data, { fresh: true });
});
