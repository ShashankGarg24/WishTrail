import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';
// Push notifications removed (Expo). FCM to be integrated later.

// RNFB: set a background handler early to suppress warnings and ensure background messages are handled gracefully.
try {
  const mod = require('@react-native-firebase/messaging');
  const bgMessaging = mod && (mod.default || mod);
  if (bgMessaging && typeof bgMessaging === 'function' && Platform.OS === 'android') {
    try { bgMessaging().setBackgroundMessageHandler(async () => {}); } catch (_) {}
  }
} catch (_) {}

const AsyncStorage = (() => { try { return require('@react-native-async-storage/async-storage').default; } catch { return null; } })();

const WEB_URL = (Constants.expoConfig?.extra?.WEB_URL || Constants.manifest?.extra?.WEB_URL || 'http://localhost:5173');
// Backend API base (include /api/v1). Falls back to WEB_URL + /api/v1 when not provided
const API_BASE = (
  Constants.expoConfig?.extra?.API_URL ||
  Constants.manifest?.extra?.API_URL ||
  `${WEB_URL.replace(/\/$/, '')}/api/v1`
);

function App() {
  const webRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  // Expo push removed
  const authProbeTries = useRef(0);
  const authProbeTimer = useRef(null);
  // In-app toast removed (was for Expo foreground notifications)

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const slides = [
    { title: 'Welcome to WishTrail', body: 'Turn dreams into achievable goals with a supportive community.' },
    { title: 'Track Habits & Journal', body: 'Build daily habits and capture your reflections to stay consistent.' },
    { title: 'Get Motivated', body: 'Be inspired by friends, likes, comments, and leaderboards.' }
  ];

  // Deep link forwarding state
  const [webReady, setWebReady] = useState(false);
  const pendingDeepLinkRef = useRef('');
  const forwardDeepLinkToWeb = useCallback((url) => {
    try {
      if (!url) return;
      const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: { url: ${JSON.stringify(url)} } })); true;`;
      webRef.current?.injectJavaScript(js);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!AsyncStorage) { setShowOnboarding(true); return; }
        const seen = await AsyncStorage.getItem('wt_onboarding_seen');
        if (!seen) setShowOnboarding(true);
      } catch { setShowOnboarding(true); }
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    try { if (AsyncStorage) await AsyncStorage.setItem('wt_onboarding_seen', '1'); } catch {}
    setShowOnboarding(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webRef.current?.reload();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const originWhitelist = useMemo(() => ['*'], []);

  const onShouldStartLoadWithRequest = (event) => {
    try {
      const isHttp = /^https?:\/\//i.test(event.url);
      const isSameOrigin = event.url.startsWith(WEB_URL);
      if (isHttp && !isSameOrigin) {
        Linking.openURL(event.url);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const prev = appState.current;
      appState.current = state;
      if (prev.match(/inactive|background/) && state === 'active') {
        webRef.current?.injectJavaScript(`window.dispatchEvent(new Event('focus')); true;`);
        // Try to re-capture auth after returning to foreground
        if (!authToken) injectAuthProbe();
        // Ping backend lastActiveAt
        try {
          const API = (Constants.expoConfig?.extra?.API_URL || Constants?.manifest?.extra?.API_URL || '').replace(/\/$/, '');
          if (API && authToken) {
            fetch(`${API}/notifications/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` } }).catch(()=>{});
          }
        } catch {}
      }
    });
    return () => sub.remove();
  }, []);

  // FCM: request permission on first run (Android/iOS), store token, and forward foreground/background messages
  const [fcmToken, setFcmToken] = useState(null);
  const didRegisterRef = useRef(false);
  useEffect(() => {
    // Allow disabling FCM at build-time if needed
    const disableFcm = !!(Constants?.expoConfig?.extra?.DISABLE_FCM || Constants?.manifest?.extra?.DISABLE_FCM);
    if (disableFcm) { try { console.log('FCM disabled via extra.DISABLE_FCM'); } catch {} ; return; }
    (async () => {
      try {
        // Require RNFB messaging and AsyncStorage synchronously to avoid Metro dynamic import issues
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) { try { console.log('FCM: messaging module not available; skipping'); } catch {} ; return; }

        // Request permission on first run (iOS/Android 13+)
        let authStatus = null;
        try { authStatus = await messaging().requestPermission(); } catch (_) {}

        const enabled = (typeof authStatus === 'number') ? (authStatus >= 1) : !!authStatus;
        if (!enabled) return;
        const token = await messaging().getToken();
        setFcmToken(token);
        try { console.log('FCM token:', token ? (token.slice(0, 12) + '...') : 'null'); } catch {}

        // Foreground message bridge -> web
        messaging().onMessage(async (remoteMessage) => {
          try {
            const data = remoteMessage?.data || {};
            const payload = { title: remoteMessage?.notification?.title || '', body: remoteMessage?.notification?.body || '', url: data?.url || '', type: data?.type || '', id: data?.id || '' };
            const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
            webRef.current?.injectJavaScript(js);
          } catch {}
        });

        // App opened from background by tapping notification
        messaging().onNotificationOpenedApp((remoteMessage) => {
          try {
            const url = remoteMessage?.data?.url || '';
            if (url) {
              if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
            }
          } catch {}
        });

        // App opened from quit state by tapping notification
        try {
          const initial = await messaging().getInitialNotification();
          const url = initial?.data?.url || '';
          if (url) {
            if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
          }
        } catch {}
      } catch (e) {
        try { console.log('FCM init error', e?.message || e); } catch {}
      }
    })();
  }, [webReady, forwardDeepLinkToWeb]);

  // Register device token when token/auth/user is available
  useEffect(() => {
    (async () => {
      try {
        if (didRegisterRef.current) return;
        const API = (Constants.expoConfig?.extra?.API_URL || Constants.manifest?.extra?.API_URL || '').replace(/\/$/, '');
        if (!API || !fcmToken || !(authToken || userId)) return;
        await fetch(`${API}/notifications/devices/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ token: fcmToken, platform: Platform.OS, provider: 'fcm', userId: userId || undefined })
        });
        didRegisterRef.current = true;
      } catch (_) {}
    })();
  }, [authToken, userId, fcmToken]);

  // Inject a script into the web app to post the auth token to native
  const injectAuthProbe = useCallback(() => {
    try {
      const script = `
        (function(){
          try {
            var t = localStorage.getItem('token') || '';
            var persisted = localStorage.getItem('wishtrail-api-store') || '';
            var uid = '';
            try {
              var obj = JSON.parse(persisted);
              uid = (obj && obj.state && (obj.state.user && (obj.state.user._id || obj.state.user.id))) || '';
            } catch(e) {}
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_AUTH', token: t }));
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_USER', userId: uid }));
          } catch(e) {}
        })(); true;
      `;
      webRef.current?.injectJavaScript(script);
      // Poll a few times in case user logs in shortly after load
      if (!authToken && authProbeTries.current < 10) {
        clearTimeout(authProbeTimer.current);
        authProbeTimer.current = setTimeout(() => {
          authProbeTries.current += 1;
          injectAuthProbe();
        }, 1500);
      } else {
        clearTimeout(authProbeTimer.current);
      }
    } catch {}
  }, [authToken]);

  // Capture auth token from the web app (after load)
  useEffect(() => {
    const t = setTimeout(() => injectAuthProbe(), 1200);
    return () => clearTimeout(t);
  }, [injectAuthProbe]);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data || '{}');
      if (data?.type === 'WT_AUTH') {
        const t = (data.token || '').trim();
        if (t && t.length > 0) {
          setAuthToken(t);
        } else {
          // token gone = user logged out
          // push removed
          setAuthToken(null);
          setUserId(null);
        }
      } else if (data?.type === 'WT_USER') {
        const uid = (data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      }
    } catch {}
  }, []);

  // Simple onboarding overlay UI
  const renderOnboarding = () => {
    if (!showOnboarding) return null;
    const { width } = Dimensions.get('window');
    const s = slides[onboardingIndex];
    return (
      <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: Math.min(width - 48, 340), backgroundColor: 'white', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>{s.title}</Text>
          <Text style={{ fontSize: 15, color: '#374151', marginBottom: 20 }}>{s.body}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if (onboardingIndex > 0) setOnboardingIndex(onboardingIndex - 1); }} disabled={onboardingIndex === 0}>
              <Text style={{ color: onboardingIndex === 0 ? '#9CA3AF' : '#111827', fontSize: 15 }}>Back</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {slides.map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === onboardingIndex ? '#6366F1' : '#E5E7EB', marginHorizontal: 3 }} />
              ))}
            </View>
            <TouchableOpacity onPress={() => { if (onboardingIndex < slides.length - 1) setOnboardingIndex(onboardingIndex + 1); else completeOnboarding(); }}>
              <Text style={{ color: '#2563EB', fontSize: 15 }}>{onboardingIndex < slides.length - 1 ? 'Continue' : 'Finish'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={completeOnboarding} style={{ marginTop: 12, alignSelf: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        originWhitelist={originWhitelist}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={Platform.OS === 'android'}
        overScrollMode="always"
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => <View style={{ flex: 1, backgroundColor: '#fff' }} />}
        refreshControl={Platform.OS === 'ios' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      />
      {renderOnboarding()}
      {/* Expo in-app toast removed */}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
