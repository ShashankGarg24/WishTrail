const test = require('node:test');
const assert = require('node:assert/strict');
const { shareGeneratedImage } = require('../goalImageSharing');
const payload = { requestId: 'share-123', base64: 'iVBORw0KGgoAAA==' };
function mocks(fail = false) {
  const calls = [];
  return { calls,
    fs: { cacheDirectory: 'file:///cache/', EncodingType: { Base64: 'base64' }, writeAsStringAsync: async (...args) => calls.push(['write', ...args]), deleteAsync: async (...args) => calls.push(['delete', ...args]) },
    sharing: { isAvailableAsync: async () => true, shareAsync: async (...args) => { calls.push(['share', ...args]); if (fail) throw new Error('cancelled'); } }
  };
}
test('native share writes only a temporary PNG and cleans up after success', async () => {
  const { calls, fs, sharing } = mocks();
  await shareGeneratedImage(payload, fs, sharing);
  assert.deepEqual(calls.map(call => call[0]), ['write', 'share', 'delete']);
  assert.equal(calls[1][1], 'file:///cache/wishtrail-share-123.png');
  assert.equal(calls[1][2].mimeType, 'image/png');
});
test('native errors and cancellation still clean up', async () => {
  const { calls, fs, sharing } = mocks(true);
  await assert.rejects(shareGeneratedImage(payload, fs, sharing));
  assert.equal(calls.at(-1)[0], 'delete');
});
test('rejects paths, non-PNG content and excessive payloads before writing', async () => {
  for (const bad of [{ ...payload, requestId: '../escape' }, { ...payload, base64: 'not-an-image' }, { ...payload, base64: 'iVBORw0KGgo' + 'A'.repeat(12 * 1024 * 1024) }]) {
    const { calls, fs, sharing } = mocks();
    await assert.rejects(shareGeneratedImage(bad, fs, sharing));
    assert.equal(calls.length, 0);
  }
});
