import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Animated, PermissionsAndroid } from 'react-native';
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
  const [initialUri, setInitialUri] = useState(WEB_URL);
  const [initialResolved, setInitialResolved] = useState(false);
  // Expo push removed
  const authProbeTries = useRef(0);
  const authProbeTimer = useRef(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const slides = [
    { title: 'Welcome to WishTrail', body: 'Turn dreams into achievable goals with community support.', emoji: '✨' },
    { title: 'Goals & Habits', body: 'Create goals and build daily habits with insightful analytics.', emoji: '📈' },
    { title: 'Journal & Wellness', body: 'Reflect with prompts, moods and positive points for growth.', emoji: '📓' },
    { title: 'Social & Leaderboards', body: 'Get likes, comments, and compete on leaderboards for motivation.', emoji: '🏆' }
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
  const [isPTRPage, setIsPTRPage] = useState(false);
  const ptrAnim = useRef(new Animated.Value(0)).current;

  // Animated pager for onboarding
  const scrollX = useRef(new Animated.Value(0)).current;
  const emojiPulse = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);

  // Animated background blobs for onboarding
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;

  // Inject web-level pull-to-refresh gesture to control overlay and reload (enabled only on /feed and /notifications)
  const injectPullToRefreshJS = useCallback(() => {
    try {
      const js = `
        (function(){
          try {
            function postPath(){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PATH', path: (location && location.pathname) || '/' })); }catch(e){} }
            postPath();
            (function(){
              var _push=history.pushState; history.pushState=function(){ var r=_push.apply(this, arguments); try{ postPath(); }catch(_e){}; return r; };
              var _replace=history.replaceState; history.replaceState=function(){ var r=_replace.apply(this, arguments); try{ postPath(); }catch(_e){}; return r; };
              window.addEventListener('popstate', postPath);
            })();
            if (window.__wtPullAttached) return; window.__wtPullAttached = true;
            var startY = 0, pulling = false, progress = 0, threshold = 140;
            function path() { try { return (window.location && window.location.pathname) || '/'; } catch(_) { return '/'; } }
            function eligible(){ try { var p = String(path()||''); return p.startsWith('/feed') || p.startsWith('/notifications'); } catch(_) { return false; } }
            window.addEventListener('touchstart', function(e){
              try {
                if (!eligible()) return;
                var t = e.target;
                var tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
                var interactive = ['button','a','input','select','textarea','label'].includes(tag) || (t && t.closest && t.closest('button,a,[role="button"],[data-action]'));
                if (interactive) { pulling = false; return; }
                startY = (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                pulling = (window.scrollY <= 0);
                progress = 0;
                if (pulling) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_VISIBLE', visible: true })); }
              } catch(_){ }
            }, { passive: true });
            window.addEventListener('touchmove', function(e){
              try {
                if (!eligible() || !pulling) return;
                var y = (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                var dy = y - startY;
                if (dy <= 0) { progress = 0; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_PROGRESS', progress: 0 })); return; }
                progress = Math.min(dy/threshold, 1);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_PROGRESS', progress: progress }));
              } catch(_){ }
            }, { passive: true });
            window.addEventListener('touchend', function(){
              try {
                if (!eligible()) return;
                if (pulling && progress >= 1) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_TRIGGER' }));
                } else {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_PTR_HIDE' }));
                }
                pulling = false; progress = 0;
              } catch(_){ }
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
    try { await askPushPermissionOnce(); } catch {}
    try {
      const pathAfter = authToken ? '/dashboard' : '/';
      webRef.current?.injectJavaScript(`try{ window.location.replace(${JSON.stringify(pathAfter)}); }catch(e){} true;`);
    } catch {}
  }, [completeOnboarding]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    try { webRef.current?.reload(); } catch {}
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const originWhitelist = useMemo(() => ['*'], []);

  const onShouldStartLoadWithRequest = (event) => {
    try {
      const url = String(event.url || '');
      const isHttp = /^https?:\/\//i.test(url);
      const isSameOrigin = url.startsWith(WEB_URL);
      // Allow internal HTTP navigation
      if (isHttp && isSameOrigin) return true;
      // For external HTTP links, open system browser
      if (isHttp && !isSameOrigin) { Linking.openURL(url).catch(()=>{}); return false; }
      // Block unknown/custom schemes inside WebView; try to open externally
      Linking.canOpenURL(url).then((can) => { if (can) Linking.openURL(url); }).catch(()=>{});
      return false;
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

  // Start/stop richer onboarding animations on slide change and overlay visibility
  useEffect(() => {
    if (!showOnboarding) return;
    try {
      // Background blobs gentle float
      Animated.loop(Animated.sequence([
        Animated.timing(blob1, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(blob1, { toValue: 0, duration: 3000, useNativeDriver: true })
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(blob2, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(blob2, { toValue: 0, duration: 3500, useNativeDriver: true })
      ])).start();
    } catch {}
  }, [showOnboarding, blob1, blob2]);

  useEffect(() => {
    // Restart pulse and intro anims when slide index changes
    try {
      if (pulseLoopRef.current && pulseLoopRef.current.stop) pulseLoopRef.current.stop();
    } catch {}
    try { emojiPulse.setValue(0); bodyAnim.setValue(0); ctaAnim.setValue(0); } catch {}
    const up = Animated.timing(emojiPulse, { toValue: 1, duration: 800, useNativeDriver: true });
    const down = Animated.timing(emojiPulse, { toValue: 0, duration: 800, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([up, down]));
    pulseLoopRef.current = loop; try { loop.start(); } catch {}
    try { Animated.timing(bodyAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start(); } catch {}
    try { Animated.spring(ctaAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start(); } catch {}
  }, [onboardingIndex, emojiPulse, bodyAnim, ctaAnim]);

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
          try { AsyncStorage && AsyncStorage.setItem('wt_native_authed', '1'); } catch {}
        } else {
          setAuthToken(null);
          setUserId(null);
          try { AsyncStorage && AsyncStorage.removeItem('wt_native_authed'); } catch {}
        }
      } else if (data?.type === 'WT_USER') {
        const uid = (data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      } else if (data?.type === 'WT_PATH') {
        try {
          const p = String(data.path || '/');
          setIsPTRPage(p.startsWith('/feed') || p.startsWith('/notifications'));
          if (!(p.startsWith('/feed') || p.startsWith('/notifications'))) { setPtrVisible(false); setPtrProgress(0); setPtrLoading(false); }
        } catch {}
      } else if (data?.type === 'WT_PTR_VISIBLE') {
        if (!isPTRPage) return;
        setPtrLoading(false);
        setPtrVisible(!!data.visible);
        setPtrProgress(0);
        Animated.timing(ptrAnim, { toValue: !!data.visible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
      } else if (data?.type === 'WT_PTR_PROGRESS') {
        if (!isPTRPage) return;
        const p = Math.max(0, Math.min(Number(data.progress) || 0, 1));
        setPtrVisible(true);
        setPtrProgress(p);
        Animated.timing(ptrAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      } else if (data?.type === 'WT_PTR_TRIGGER') {
        if (!isPTRPage) return;
        setPtrLoading(true);
        setPtrVisible(true);
        setPtrProgress(1);
        Animated.timing(ptrAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        try { webRef.current?.reload(); } catch {}
      } else if (data?.type === 'WT_PTR_HIDE') {
        setPtrVisible(false);
        setPtrProgress(0);
        setPtrLoading(false);
        Animated.timing(ptrAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    } catch {}
  }, [isPTRPage, ptrAnim]);

  // Resolve initial URL: dashboard if authed, home otherwise; override with notification deeplink
  useEffect(() => {
    (async () => {
      let target = WEB_URL;
      try {
        const authed = AsyncStorage ? await AsyncStorage.getItem('wt_native_authed') : null;
        if (authed === '1') {
          target = `${WEB_URL.replace(/\/$/, '')}/dashboard`;
        }
      } catch {}
      try {
        let messaging;
        try { const mod = require('@react-native-firebase/messaging'); messaging = mod?.default || mod; } catch { messaging = null; }
        if (messaging) {
          const initial = await messaging().getInitialNotification();
          const url = initial?.data?.url || '';
          if (url) {
            target = `${WEB_URL.replace(/\/$/, '')}?url=${encodeURIComponent(url)}`;
          }
        }
      } catch {}
      setInitialUri(target);
      setInitialResolved(true);
    })();
  }, []);

  // Ask for push notification permission once on first launch (after onboarding or immediately if onboarding was already seen)
  const askPushPermissionOnce = useCallback(async () => {
    try {
      if (!AsyncStorage) return;
      const KEY = 'wt_push_perm_asked';
      const asked = await AsyncStorage.getItem(KEY);
      if (asked) return;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try { await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS); } catch {}
      } else if (Platform.OS === 'ios') {
        try {
          let messaging; try { const mod = require('@react-native-firebase/messaging'); messaging = mod?.default || mod; } catch {}
          if (messaging) { try { await messaging().requestPermission(); } catch {} }
        } catch {}
      }
      try { await AsyncStorage.setItem(KEY, '1'); } catch {}
    } catch {}
  }, []);

  useEffect(() => {
    if (!showOnboarding) {
      askPushPermissionOnce().catch(() => {});
    }
  }, [showOnboarding, askPushPermissionOnce]);

  // Full-screen onboarding carousel (animated)
  const renderOnboarding = () => {
    if (!showOnboarding) return null;
    const { width, height } = Dimensions.get('window');
    const b1x = blob1.interpolate({ inputRange: [0, 1], outputRange: [-40, 20] });
    const b1y = blob1.interpolate({ inputRange: [0, 1], outputRange: [-30, 10] });
    const b2x = blob2.interpolate({ inputRange: [0, 1], outputRange: [30, -20] });
    const b2y = blob2.interpolate({ inputRange: [0, 1], outputRange: [20, -15] });
    const pulseScale = emojiPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    const pulseRotate = emojiPulse.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
    const bodyOpacity = bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const bodyTranslate = bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
    const ctaScale = ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Animated background blobs */}
          <Animated.View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.2)', top: 80, left: 30, transform: [{ translateX: b1x }, { translateY: b1y }] }} />
          <Animated.View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(59,130,246,0.18)', bottom: 40, right: 20, transform: [{ translateX: b2x }, { translateY: b2y }] }} />

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
              const emojiParallax = scrollX.interpolate({ inputRange, outputRange: [20, 0, -20], extrapolate: 'clamp' });
              const titleTranslate = scrollX.interpolate({ inputRange, outputRange: [20, 0, -20], extrapolate: 'clamp' });
              const isActive = i === onboardingIndex;
              return (
                <View key={i} style={{ width, height, paddingHorizontal: 24, paddingTop: 48, alignItems: 'center' }}>
                  <Animated.View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, transform: [ { translateY: emojiParallax }, ...(isActive ? [{ scale: pulseScale }, { rotate: pulseRotate }] : []) ] }}>
                    <Text style={{ fontSize: 56 }}>{s.emoji}</Text>
                  </Animated.View>
                  <Animated.Text style={{ fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 12, transform: [{ translateY: titleTranslate }] }}>{s.title}</Animated.Text>
                  <Animated.Text style={{ fontSize: 16, color: '#cbd5e1', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12, opacity: isActive ? bodyOpacity : 0.6, transform: isActive ? [{ translateY: bodyTranslate }] : [] }}>{s.body}</Animated.Text>
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
                <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                  <TouchableOpacity onPress={() => onboardingIndex > 0 && setOnboardingIndex(onboardingIndex - 1)} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#111827' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 15 }}>Back</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
              <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                <TouchableOpacity onPress={() => { if (onboardingIndex < slides.length - 1) setOnboardingIndex(onboardingIndex + 1); else finishOnboarding(); }} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#2563EB' }}>
                  <Text style={{ color: 'white', fontSize: 15 }}>{onboardingIndex < slides.length - 1 ? 'Continue' : 'Finish'}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // PTR overlay (GitHub-like) — only on Feed and Notifications
  const renderPtrOverlay = () => {
    if (!isPTRPage) return null;
    const translateY = ptrAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 52] });
    const opacity = ptrAnim;
    return (
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center', transform: [{ translateY }], opacity }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fff" size="small" animating={ptrVisible || ptrLoading} />
        </View>
      </Animated.View>
    );
  };

  if (!initialResolved) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
      <WebView
        ref={webRef}
        userAgent="WishTrailApp"
        originWhitelist={originWhitelist}
        onLoadStart={() => { setLoading(true); setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); Animated.timing(ptrAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }}
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); setTimeout(() => { setPtrLoading(false); setPtrVisible(false); Animated.timing(ptrAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(); }, 250); }}
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
