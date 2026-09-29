function selectRefreshCredential({ deviceType, cookieToken, headerToken, bodyToken }) {
  const cookie = String(cookieToken || '').trim();
  const header = String(headerToken || '').trim();
  const body = String(bodyToken || '').trim();
  // Native secure storage is authoritative for app sessions. A WebView may
  // retain an unrelated or stale browser cookie from an earlier web session.
  return deviceType === 'app' ? header || body : cookie || header || body;
}

module.exports = { selectRefreshCredential };
