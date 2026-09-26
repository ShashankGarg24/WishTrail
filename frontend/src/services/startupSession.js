// Resolve local session state before the router commits. Only an absent/expired
// native access token needs a refresh; profile and dashboard data stay separate.
export async function restoreStartupToken({ token, refreshToken, refresh, now = Date.now() }) {
  if (!refreshToken) return token;
  let expired = !token;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expired = typeof payload.exp === 'number' && payload.exp * 1000 <= now;
    } catch { expired = true; }
  }
  if (!expired) return token;
  try {
    const response = await refresh(refreshToken);
    return response?.data?.data?.token || null;
  } catch (error) {
    // A transport failure must not erase a returning user's local session.
    // Server rejection does invalidate it; an offline home can show its shell.
    const status = error?.response?.status;
    return status === 401 || status === 403 ? null : token;
  }
}
