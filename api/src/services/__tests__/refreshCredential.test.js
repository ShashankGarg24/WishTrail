const { selectRefreshCredential } = require('../refreshCredential');

test('app refresh uses its secure header even when WebView has a stale cookie', () => {
  expect(selectRefreshCredential({
    deviceType: 'app', cookieToken: 'stale-web', headerToken: 'secure-app', bodyToken: 'fallback'
  })).toBe('secure-app');
});

test('web refresh keeps the HTTP-only cookie authoritative', () => {
  expect(selectRefreshCredential({
    deviceType: 'web', cookieToken: 'secure-web', headerToken: 'header', bodyToken: 'fallback'
  })).toBe('secure-web');
});

test('app accepts the body fallback but never a cookie-only credential', () => {
  expect(selectRefreshCredential({ deviceType: 'app', cookieToken: 'web', bodyToken: 'app-body' })).toBe('app-body');
  expect(selectRefreshCredential({ deviceType: 'app', cookieToken: 'web' })).toBe('');
});
