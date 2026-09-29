// Resolve native session state before the router commits. A cold launch validates
// through the refresh credential before authenticated screens request their data.
export async function restoreStartupToken({
  token,
  refreshToken,
  refresh,
  now = Date.now(),
  retryDelays = [300, 900],
  wait = delay => new Promise(resolve => setTimeout(resolve, delay))
}) {
  if (!refreshToken) {
    if (!token) return null;
    try {
      const encoded = token.split('.')[1];
      if (!encoded) return null;
      const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded));
      return typeof payload.exp === 'number' && payload.exp * 1000 > now ? token : null;
    } catch {
      return null;
    }
  }
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      const response = await refresh(refreshToken);
      return response?.data?.data?.token || null;
    } catch (error) {
      // A server rejection is final. Transport and server availability failures
      // often happen while Android is restoring its network after cold start.
      const status = error?.response?.status;
      if (status === 401 || status === 403) return null;
      if (attempt === retryDelays.length) return token;
      await wait(retryDelays[attempt]);
    }
  }
  return token;
}
