import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Animated } from 'react-native';
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

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const slides = [
    { title: 'Welcome to WishTrail', body: 'Turn dreams into achievable goals with community support.', emoji: '✨' },
    { title: 'Goals & Wishes', body: 'Create yearly goals with priorities, durations, due dates and points.', emoji: '🎯' },
    { title: 'Build Powerful Habits', body: 'Track daily habits, view analytics and grow consistent streaks.', emoji: '📈' },
    { title: 'Journal & Reflection', body: 'Capture prompts and emotions; earn positive points for wellness.', emoji: '📓' },
    { title: 'Social Feed & Notifications', body: 'Get likes, comments, follows and real-time updates from friends.', emoji: '💬' },
    { title: 'Leaderboard & Inspiration', body: 'Compete on points, discover trending goals, and get motivated.', emoji: '🏆' }
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

  // Custom pull-to-refresh overlay state
  const [ptrVisible, setPtrVisible] = useState(false);
  const [ptrProgress, setPtrProgress] = useState(0);
  const [ptrLoading, setPtrLoading] = useState(false);

  // Animated pager for onboarding
  const scrollX = useRef(new Animated.Value(0)).current;

  // Inject web-level pull-to-refresh gesture to control overlay and reload (disabled on /discover)
  const injectPullToRefreshJS = useCallback(() => {
    try {
      const js = `
        (function(){
          try {
            if (window.__wtPullAttached) return; window.__wtPullAttached = true;
            var startY = 0, pulling = false, progress = 0, threshold = 100, enabled = false;
            function path() { try { return (window.location && window.location.pathname) || '/'; } catch(_) { return '/'; } }
            window.addEventListener('touchstart', function(e){
              try {
                enabled = !String(path()||'').startsWith('/discover');
                if (!enabled) return;
                startY = (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                pulling = (window.scrollY <= 0);
                progress = 0;
                if (pulling) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_VISIBLE', visible: true })); }
              } catch(_){}
            }, { passive: true });
            window.addEventListener('touchmove', function(e){
              try {
                if (!enabled || !pulling) return;
                var y = (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                var dy = y - startY;
                if (dy <= 0) { progress = 0; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_PROGRESS', progress: 0 })); return; }
                progress = Math.min(dy/threshold, 1);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_PROGRESS', progress: progress }));
              } catch(_){}
            }, { passive: true });
            window.addEventListener('touchend', function(){
              try {
                if (!enabled) return;
                if (pulling && progress >= 1) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_TRIGGER' }));
                } else {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_HIDE' }));
                }
                pulling = false; progress = 0;
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

  const finishOnboarding = useCallback(async () => {
    await completeOnboarding();
    try { webRef.current?.injectJavaScript("try{ window.location.replace('/'); }catch(e){} true;"); } catch {}
  }, [completeOnboarding]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    try { webRef.current?.reload(); } catch {}
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
        if (!authToken) injectAuthProbe();
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

  // FCM init + handlers (unchanged)
  const [fcmToken, setFcmToken] = useState(null);
  const didRegisterRef = useRef(false);
  useEffect(() => {
    const disableFcm = !!(Constants?.expoConfig?.extra?.DISABLE_FCM || Constants?.manifest?.extra?.DISABLE_FCM);
    if (disableFcm) { try { console.log('FCM disabled via extra.DISABLE_FCM'); } catch {} ; return; }
    (async () => {
      try {
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) { try { console.log('FCM: messaging module not available; skipping'); } catch {} ; return; }

        let authStatus = null;
        try { authStatus = await messaging().requestPermission(); } catch (_) {}

        const enabled = (typeof authStatus === 'number') ? (authStatus >= 1) : !!authStatus;
        if (!enabled) return;
        const token = await messaging().getToken();
        setFcmToken(token);
        try { console.log('FCM token:', token ? (token.slice(0, 12) + '...') : 'null'); } catch {}

        messaging().onMessage(async (remoteMessage) => {
          try {
            const data = remoteMessage?.data || {};
            const payload = { title: remoteMessage?.notification?.title || '', body: remoteMessage?.notification?.body || '', url: data?.url || '', type: data?.type || '', id: data?.id || '' };
            const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
            webRef.current?.injectJavaScript(js);
          } catch {}
        });

        messaging().onNotificationOpenedApp((remoteMessage) => {
          try {
            const url = remoteMessage?.data?.url || '';
            if (url) {
              if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
            }
          } catch {}
        });

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

  // Register device token (unchanged)
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

  // Inject auth + PTR gesture
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
          setAuthToken(null);
          setUserId(null);
        }
      } else if (data?.type === 'WT_USER') {
        const uid = (data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      } else if (data?.type === 'WT_PTR_VISIBLE') {
        setPtrLoading(false);
        setPtrVisible(!!data.visible);
        setPtrProgress(0);
      } else if (data?.type === 'WT_PTR_PROGRESS') {
        const p = Math.max(0, Math.min(Number(data.progress) || 0, 1));
        setPtrVisible(true);
        setPtrProgress(p);
      } else if (data?.type === 'WT_PTR_TRIGGER') {
        setPtrLoading(true);
        setPtrVisible(true);
        setPtrProgress(1);
        try { webRef.current?.reload(); } catch {}
      } else if (data?.type === 'WT_PTR_HIDE') {
        setPtrVisible(false);
        setPtrProgress(0);
        setPtrLoading(false);
      }
    } catch {}
  }, []);

  // Full-screen onboarding carousel (animated)
  const renderOnboarding = () => {
    if (!showOnboarding) return null;
    const { width, height } = Dimensions.get('window');
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
            <TouchableOpacity onPress={finishOnboarding}>
              <Text style={{ color: '#cbd5e1', fontSize: 14 }}>Skip</Text>
            </TouchableOpacity>
          </View>
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            onMomentumScrollEnd={(e) => {
              try {
                const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
                if (i !== onboardingIndex) setOnboardingIndex(i);
              } catch {}
            }}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {slides.map((s, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const emojiScale = scrollX.interpolate({ inputRange, outputRange: [0.85, 1.15, 0.85], extrapolate: 'clamp' });
              const titleTranslate = scrollX.interpolate({ inputRange, outputRange: [20, 0, -20], extrapolate: 'clamp' });
              return (
                <View key={i} style={{ width, height, paddingHorizontal: 24, paddingTop: 48, alignItems: 'center' }}>
                  <Animated.View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, transform: [{ scale: emojiScale }] }}>
                    <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
                  </Animated.View>
                  <Animated.Text style={{ fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 12, transform: [{ translateY: titleTranslate }] }}>{s.title}</Animated.Text>
                  <Text style={{ fontSize: 16, color: '#cbd5e1', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 }}>{s.body}</Text>
                </View>
              );
            })}
          </Animated.ScrollView>
          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {slides.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotScale = scrollX.interpolate({ inputRange, outputRange: [1, 1.4, 1], extrapolate: 'clamp' });
                return (
                  <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: i === onboardingIndex ? '#6366F1' : '#334155', transform: [{ scale: dotScale }] }} />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              {onboardingIndex === 0 ? (
                <View style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: 'transparent' }} />
              ) : (
                <TouchableOpacity onPress={() => onboardingIndex > 0 && setOnboardingIndex(onboardingIndex - 1)} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#111827' }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 15 }}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { if (onboardingIndex < slides.length - 1) setOnboardingIndex(onboardingIndex + 1); else finishOnboarding(); }} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#2563EB' }}>
                <Text style={{ color: 'white', fontSize: 15 }}>{onboardingIndex < slides.length - 1 ? 'Continue' : 'Finish'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // PTR overlay (GitHub-like)
  const renderPtrOverlay = () => {
    const opacity = (ptrVisible || ptrLoading) ? 1 : 0;
    const rotateDeg = `${Math.min(ptrProgress, 1) * 180}deg`;
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', opacity }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          {ptrLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 18, transform: [{ rotate: rotateDeg }] }}>↓</Text>
          )}
        </View>
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
        onLoadStart={() => { setLoading(true); setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); }}
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="always"
        scrollEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => <View style={{ flex: 1, backgroundColor: '#fff' }} />}
        refreshControl={undefined}
      />
      {renderPtrOverlay()}
      {renderOnboarding()}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
