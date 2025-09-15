import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
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
    { title: 'Welcome to WishTrail', body: 'Turn dreams into achievable goals with community support.', emoji: '✨' },
    { title: 'Build Powerful Habits', body: 'Track daily habits and reflect in your journal.', emoji: '📈' },
    { title: 'Stay Motivated', body: 'Celebrate wins, get likes and comments from friends.', emoji: '🔥' }
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

  // iOS pull-to-refresh via onScroll + bounces and JS gesture fallback
  const iosPullLockRef = useRef(false);
  const iosLastPullMsRef = useRef(0);
  const onWebViewScroll = useCallback((e) => {
    if (Platform.OS !== 'ios') return;
    try {
      const y = e?.nativeEvent?.contentOffset?.y ?? 0;
      const now = Date.now();
      if (y < -72 && !iosPullLockRef.current && now - iosLastPullMsRef.current > 2000) {
        iosPullLockRef.current = true;
        iosLastPullMsRef.current = now;
        try { webRef.current?.reload(); } catch {}
        setTimeout(() => { iosPullLockRef.current = false; }, 1500);
      }
    } catch {}
  }, []);

  // Inject web-level pull-to-refresh gesture to ensure reliability
  const injectPullToRefreshJS = useCallback(() => {
    try {
      const js = `
        (function(){
          try {
            if (window.__wtPullAttached) return; window.__wtPullAttached = true;
            var startY = 0, pulling = false, fired = false;
            window.addEventListener('touchstart', function(e){
              try { startY = (e.touches && e.touches[0] ? e.touches[0].clientY : 0); pulling = (window.scrollY <= 0); fired = false; } catch(_){}
            }, { passive: true });
            window.addEventListener('touchmove', function(e){
              try {
                if (!pulling) return;
                var y = (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                if (!fired && (y - startY) > 90) {
                  fired = true;
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PULL' }));
                }
              } catch(_){}
            }, { passive: true });
          } catch(e){}
        })(); true;
      `;
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

  // Inject a script into the web app to post the auth token to native + attach pull gesture
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
      injectPullToRefreshJS();
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
  }, [authToken, injectPullToRefreshJS]);

  // Capture auth token and pull-to-refresh from the web app (after load)
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
      } else if (data?.type === 'WT_PULL') {
        try { webRef.current?.reload(); } catch {}
      }
    } catch {}
  }, []);

  // Full-screen onboarding carousel
  const renderOnboarding = () => {
    if (!showOnboarding) return null;
    const { width, height } = Dimensions.get('window');
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
            <TouchableOpacity onPress={completeOnboarding}>
              <Text style={{ color: '#cbd5e1', fontSize: 14 }}>Skip</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              try {
                const x = e.nativeEvent.contentOffset.x;
                const i = Math.round(x / Math.max(width, 1));
                if (i !== onboardingIndex) setOnboardingIndex(i);
              } catch {}
            }}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {slides.map((s, i) => (
              <View key={i} style={{ width, height, paddingHorizontal: 24, paddingTop: 48, alignItems: 'center' }}>
                <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
                </View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 12 }}>{s.title}</Text>
                <Text style={{ fontSize: 16, color: '#cbd5e1', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 }}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {slides.map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: i === onboardingIndex ? '#6366F1' : '#334155' }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity onPress={() => onboardingIndex > 0 && setOnboardingIndex(onboardingIndex - 1)} disabled={onboardingIndex === 0} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: onboardingIndex === 0 ? '#1f2937' : '#111827' }}>
                <Text style={{ color: '#cbd5e1', fontSize: 15 }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if (onboardingIndex < slides.length - 1) setOnboardingIndex(onboardingIndex + 1); else completeOnboarding(); }} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#2563EB' }}>
                <Text style={{ color: 'white', fontSize: 15 }}>{onboardingIndex < slides.length - 1 ? 'Continue' : 'Finish'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        originWhitelist={originWhitelist}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={Platform.OS === 'android'}
        bounces={Platform.OS === 'ios'}
        onScroll={onWebViewScroll}
        overScrollMode="always"
        scrollEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => <View style={{ flex: 1, backgroundColor: '#fff' }} />}
        refreshControl={Platform.OS === 'ios' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      />
      {renderOnboarding()}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
