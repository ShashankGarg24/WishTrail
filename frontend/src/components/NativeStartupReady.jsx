import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useApiStore from '../store/apiStore';

// Lives inside the route Suspense boundary: lazy route code must commit first.
// Dashboard API calls are deliberately not part of this readiness contract.
export default function NativeStartupReady({ allowAnyRoute = false }) {
  const { pathname } = useLocation();
  const authenticated = useApiStore(state => state.isAuthenticated);
  useEffect(() => {
    if (!allowAnyRoute && ((pathname === '/auth' && authenticated) || (pathname === '/dashboard' && !authenticated))) return;
    const frame = requestAnimationFrame(() => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'WT_STARTUP_READY' }));
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, authenticated, allowAnyRoute]);
  return null;
}
