import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Animated, PermissionsAndroid, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import IndeterminateProgressBar from './components/IndeterminateProgressBar';
// Push notifications removed (Expo). FCM to be integrated later.

WebBrowser.maybeCompleteAuthSession();

// RNFB: set a background handler early to suppress warnings and ensure background messages are handled gracefully.
try {
  const mod = require('@react-native-firebase/messaging');
  const bgMessaging = mod && (mod.default || mod);
  if (bgMessaging && typeof bgMessaging === 'function' && Platform.OS === 'android') {
    try { bgMessaging().setBackgroundMessageHandler(async () => { }); } catch (_) { }
  }
} catch (_) { }

const AsyncStorage = (() => { try { return require('@react-native-async-storage/async-storage').default; } catch { return null; } })();
let SecureStore = null; try { SecureStore = require('expo-secure-store'); } catch (_) { SecureStore = null; }

const WEB_URL = (Constants.expoConfig?.extra?.WEB_URL || Constants.manifest?.extra?.WEB_URL || 'http://localhost:5173');
// Backend API base (include /api/v1). Falls back to WEB_URL + /api/v1 when not provided
const API_BASE = (
  Constants.expoConfig?.extra?.API_URL ||
  Constants.manifest?.extra?.API_URL ||
  Constants.manifest2?.extra?.expoClient?.extra?.API_URL ||
  `${WEB_URL.replace(/\/$/, '')}/api/v1`
);
const APP_EXTRA =
  Constants.expoConfig?.extra ||
  Constants.manifest?.extra ||
  Constants.manifest2?.extra?.expoClient?.extra ||
  {};

const GOOGLE_WEB_CLIENT_ID = (APP_EXTRA.GOOGLE_WEB_CLIENT_ID || '').trim();
const GOOGLE_ANDROID_CLIENT_ID = (APP_EXTRA.GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || '').trim();
const GOOGLE_IOS_CLIENT_ID = (APP_EXTRA.GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || '').trim();

function App() {
  const webRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [isNativeGoogleLoading, setIsNativeGoogleLoading] = useState(false);
  const [initialUri, setInitialUri] = useState(WEB_URL);
  const [initialResolved, setInitialResolved] = useState(false);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false);
  // Expo push removed
  const authProbeTries = useRef(0);
  const authProbeTimer = useRef(null);
  const splashFallbackTimer = useRef(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const onboardingScrollRef = useRef(null);
  const appLogo = useMemo(() => require('./assets/icon.png'), []);
  const slides = [
    {
      title: 'Define Your Path',
      body: 'Turn your biggest dreams into actionable goals with our professional planning tools.'
    },
    {
      title: 'Grow Together',
      body: 'Find inspiration in the community feed and celebrate milestones with a supportive circle.'
    },
    {
      title: 'Build Better Habits',
      body: 'Stay consistent with daily logs and interactive heatmaps that keep you on track.'
    }
  ];

  // Deep link forwarding state
  const [webReady, setWebReady] = useState(false);
  const pendingDeepLinkRef = useRef('');
  const forwardDeepLinkToWeb = useCallback((url) => {
    try {
      if (!url) return;
      const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: { url: ${JSON.stringify(url)} } })); true;`;
      webRef.current?.injectJavaScript(js);
    } catch { }
  }, []);

  // Custom pull-to-refresh overlay state
  const [ptrVisible, setPtrVisible] = useState(false);
  const [ptrProgress, setPtrProgress] = useState(0);
  const [ptrLoading, setPtrLoading] = useState(false);
  const [isPTRPage, setIsPTRPage] = useState(false);
  const ptrAnim = useRef(new Animated.Value(0)).current;
  const lastProgressUpdate = useRef(0);
  const ptrAnimRef = useRef(null);

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
    } catch { }
  }, []);

  // Ask for push notification permission once on first launch
  const askPushPermissionOnce = useCallback(async () => {
    try {
      if (!AsyncStorage) return;
      // Always request on app startup (don't check if already asked)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try { await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS); } catch { }
      } else if (Platform.OS === 'ios') {
        try {
          let messaging; try { const mod = require('@react-native-firebase/messaging'); messaging = mod?.default || mod; } catch { }
          if (messaging) { try { await messaging().requestPermission(); } catch { } }
        } catch { }
      }
      try { await AsyncStorage.setItem('wt_push_perm_asked', '1'); } catch { }
    } catch { }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!AsyncStorage) { setShowOnboarding(true); return; }
        const seen = await AsyncStorage.getItem('wt_onboarding_seen');
        if (!seen) setShowOnboarding(true);
        else {
          // If onboarding was already completed, request permissions now
          askPushPermissionOnce().catch(() => { });
        }
      } catch { setShowOnboarding(true); }
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    try { if (AsyncStorage) await AsyncStorage.setItem('wt_onboarding_seen', '1'); } catch { }
    setShowOnboarding(false);
  }, []);

  const finishOnboarding = useCallback(async () => {
    await completeOnboarding();
    try { await askPushPermissionOnce(); } catch { }
    try {
      const pathAfter = authToken ? '/dashboard' : '/';
      webRef.current?.injectJavaScript(`try{ window.location.replace(${JSON.stringify(pathAfter)}); }catch(e){} true;`);
    } catch { }
  }, [completeOnboarding]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    try { webRef.current?.reload(); } catch { }
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
      if (isHttp && !isSameOrigin) { Linking.openURL(url).catch(() => { }); return false; }
      // Block unknown/custom schemes inside WebView; try to open externally
      Linking.canOpenURL(url).then((can) => { if (can) Linking.openURL(url); }).catch(() => { });
      return false;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    if (showOnboarding) {
      setOnboardingIndex(0);
    }
  }, [showOnboarding]);

  // FCM init + handlers (unchanged)
  const [fcmToken, setFcmToken] = useState(null);
  const didRegisterRef = useRef(false);

  const [googleRequest, googleResponse, promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined
  });
  useEffect(() => {
    const disableFcm = !!(Constants?.expoConfig?.extra?.DISABLE_FCM || Constants?.manifest?.extra?.DISABLE_FCM);
    if (disableFcm) { try { console.log('FCM disabled via extra.DISABLE_FCM'); } catch { }; return; }
    (async () => {
      try {
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) { try { console.log('FCM: messaging module not available; skipping'); } catch { }; return; }

        let authStatus = null;
        try { authStatus = await messaging().requestPermission(); } catch (_) { }

        const enabled = (typeof authStatus === 'number') ? (authStatus >= 1) : !!authStatus;
        if (!enabled) return;
        const token = await messaging().getToken();
        setFcmToken(token);
        try { console.log('FCM token:', token ? (token.slice(0, 12) + '...') : 'null'); } catch { }

        messaging().onMessage(async (remoteMessage) => {
          try {
            const data = remoteMessage?.data || {};
            const payload = { title: remoteMessage?.notification?.title || '', body: remoteMessage?.notification?.body || '', url: data?.url || '', type: data?.type || '', id: data?.id || '' };
            const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
            webRef.current?.injectJavaScript(js);
          } catch { }
        });

        messaging().onNotificationOpenedApp((remoteMessage) => {
          try {
            const url = remoteMessage?.data?.url || '';
            if (url) {
              if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
            }
          } catch { }
        });

        try {
          const initial = await messaging().getInitialNotification();
          const url = initial?.data?.url || '';
          if (url) {
            if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
          }
        } catch { }
      } catch (e) {
        try { console.log('FCM init error', e?.message || e); } catch { }
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
      } catch (_) { }
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
    } catch { }
  }, [authToken, injectPullToRefreshJS]);

  useEffect(() => {
    const t = setTimeout(() => injectAuthProbe(), 1200);
    return () => clearTimeout(t);
  }, [injectAuthProbe]);

  // Inject refresh token helper
  const injectRefreshToken = useCallback(async () => {
    try {
      if (SecureStore && SecureStore.getItemAsync) {
        const rt = await SecureStore.getItemAsync('wt_refresh_token');
        if (rt && rt.length > 0) {
          try { webRef.current?.injectJavaScript(`window.__WT_REFRESH_TOKEN = ${JSON.stringify(rt)}; true;`); } catch { }
        }
      }
    } catch { }
  }, []);

  // On app start, inject any stored refresh token
  useEffect(() => {
    injectRefreshToken();
  }, [injectRefreshToken]);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data || '{}');
      if (data?.type === 'WT_AUTH') {
        const t = (data.token || '').trim();
        if (t && t.length > 0) {
          setAuthToken(t);
          try { AsyncStorage && AsyncStorage.setItem('wt_native_authed', '1'); } catch { }
        } else {
          setAuthToken(null);
          setUserId(null);
          try { AsyncStorage && AsyncStorage.removeItem('wt_native_authed'); } catch { }
        }
      } else if (data?.type === 'WT_USER') {
        const uid = (data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      } else if (data?.type === 'WT_REFRESH') {
        const rt = (data.refreshToken || '').trim();
        if (rt && rt.length > 0) {
          try { SecureStore && SecureStore.setItemAsync && SecureStore.setItemAsync('wt_refresh_token', rt); } catch { }
          try { webRef.current?.injectJavaScript(`window.__WT_REFRESH_TOKEN = ${JSON.stringify(rt)}; true;`); } catch { }
        }
      } else if (data?.type === 'WT_NATIVE_GOOGLE_LOGIN') {
        const hasConfig = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
        if (!hasConfig) {
          Alert.alert('Google Sign-In', 'Google OAuth client IDs are not configured in app settings.');
          return;
        }
        promptGoogleSignIn().catch(() => {
          Alert.alert('Google Sign-In', 'Unable to open Google sign-in. Please try again.');
        });
      } else if (data?.type === 'WT_PATH') {
        try {
          const p = String(data.path || '/');
          setCurrentPath(p);
          if (!p.startsWith('/dashboard')) {
            setHasLoadedDashboard(true);
          }
          const isPTR = p.startsWith('/feed') || p.startsWith('/notifications');
          setIsPTRPage(isPTR);
          // Immediately reset PTR state when navigating away from PTR pages
          if (!isPTR) {
            // Stop any ongoing animation
            if (ptrAnimRef.current) {
              try { ptrAnimRef.current.stop(); } catch { }
            }
            setPtrVisible(false);
            setPtrProgress(0);
            setPtrLoading(false);
            ptrAnim.setValue(0);
          }
        } catch { }
      } else if (data?.type === 'WT_PTR_VISIBLE') {
        // Stop previous animation before starting new one
        if (ptrAnimRef.current) {
          try { ptrAnimRef.current.stop(); } catch { }
        }
        setPtrLoading(false);
        setPtrVisible(!!data.visible);
        setPtrProgress(0);
        ptrAnimRef.current = Animated.timing(ptrAnim, { toValue: !!data.visible ? 1 : 0, duration: 180, useNativeDriver: true });
        ptrAnimRef.current.start();
      } else if (data?.type === 'WT_PTR_PROGRESS') {
        // Debounce rapid progress updates (max 60fps)
        const now = Date.now();
        if (now - lastProgressUpdate.current < 16) return;
        lastProgressUpdate.current = now;

        const p = Math.max(0, Math.min(Number(data.progress) || 0, 1));
        setPtrVisible(true);
        setPtrProgress(p);

        // Stop previous animation
        if (ptrAnimRef.current) {
          try { ptrAnimRef.current.stop(); } catch { }
        }
        ptrAnimRef.current = Animated.timing(ptrAnim, { toValue: 1, duration: 100, useNativeDriver: true });
        ptrAnimRef.current.start();
      } else if (data?.type === 'WT_PTR_TRIGGER') {
        // Stop previous animation
        if (ptrAnimRef.current) {
          try { ptrAnimRef.current.stop(); } catch { }
        }
        setPtrLoading(true);
        setPtrVisible(true);
        setPtrProgress(1);
        ptrAnimRef.current = Animated.timing(ptrAnim, { toValue: 1, duration: 100, useNativeDriver: true });
        ptrAnimRef.current.start();
        try { webRef.current?.reload(); } catch { }
      } else if (data?.type === 'WT_PTR_HIDE') {
        // Stop previous animation
        if (ptrAnimRef.current) {
          try { ptrAnimRef.current.stop(); } catch { }
        }
        // Delay state reset slightly to allow animation to complete
        ptrAnimRef.current = Animated.timing(ptrAnim, { toValue: 0, duration: 220, useNativeDriver: true });
        ptrAnimRef.current.start(() => {
          setPtrVisible(false);
          setPtrProgress(0);
          setPtrLoading(false);
        });
      } else if (data?.type === 'WT_DASHBOARD_READY') {
        setHasLoadedDashboard(true);
      }
    } catch { }
  }, [ptrAnim, promptGoogleSignIn]);

  const completeNativeGoogleLogin = useCallback(async (idToken) => {
    if (!idToken) return;
    setIsNativeGoogleLoading(true);
    try {
      const timezone = (() => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
      })();
      const locale = (() => {
        try { return Intl.DateTimeFormat().resolvedOptions().locale || ''; } catch { return ''; }
      })();

      const response = await fetch(`${API_BASE.replace(/\/$/, '')}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'app'
        },
        body: JSON.stringify({ token: idToken, timezone, locale })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Google sign-in failed');
      }

      const token = payload?.data?.token || '';
      const refreshToken = payload?.data?.refreshToken || '';

      if (!token) {
        throw new Error('No token returned from Google login');
      }

      setAuthToken(token);
      try { AsyncStorage && AsyncStorage.setItem('wt_native_authed', '1'); } catch { }

      if (refreshToken) {
        try { SecureStore && SecureStore.setItemAsync && SecureStore.setItemAsync('wt_refresh_token', refreshToken); } catch { }
      }

      const bridgeScript = `
        (function(){
          try {
            localStorage.setItem('token', ${JSON.stringify(token)});
            if (window.__updateAuthToken) window.__updateAuthToken(${JSON.stringify(token)});
            ${refreshToken ? `window.__WT_REFRESH_TOKEN = ${JSON.stringify(refreshToken)};` : ''}
            window.location.assign('/dashboard');
          } catch(e) {}
        })(); true;
      `;
      try { webRef.current?.injectJavaScript(bridgeScript); } catch { }
    } catch (error) {
      Alert.alert('Google Sign-In', error?.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setIsNativeGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success') {
      const idToken = googleResponse?.params?.id_token;
      if (idToken) {
        completeNativeGoogleLogin(idToken);
      } else {
        Alert.alert('Google Sign-In', 'Google did not return an ID token.');
      }
    }
  }, [googleResponse, completeNativeGoogleLogin]);

  const handleNativeGoogleSignIn = useCallback(async () => {
    const hasConfig = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
    if (!hasConfig) {
      Alert.alert('Google Sign-In', 'Google OAuth client IDs are not configured in app settings.');
      return;
    }
    try {
      await promptGoogleSignIn();
    } catch (error) {
      Alert.alert('Google Sign-In', 'Unable to open Google sign-in. Please try again.');
    }
  }, [promptGoogleSignIn]);

  // App Shortcuts / Quick Actions (mobile only)
  useEffect(() => {
    try {
      if (!(Platform.OS === 'ios' || Platform.OS === 'android')) return;
      const safeRequire = (name) => { try { return eval('require')(name); } catch (_) { return null; } };
      let expoQA = null;
      let rnQA = null;
      if (Platform.OS === 'ios') {
        expoQA = safeRequire('expo-quick-actions') || safeRequire('react-native-quick-actions');
      } else if (Platform.OS === 'android') {
        rnQA = safeRequire('react-native-quick-actions');
      }
      const items = (Platform.OS === 'ios')
        ? [
          { id: 'dashboard', title: 'Dashboard', subtitle: '', icon: 'bookmark' },
          { id: 'feed', title: 'Feed', subtitle: '', icon: 'bookmark' },
          { id: 'communities', title: 'Communities', subtitle: '', icon: 'bookmark' },
          { id: 'feedback', title: 'Feedback', subtitle: 'Why uninstalling? Tell us', icon: 'compose' }
        ]
        : [
          { id: 'dashboard', title: 'Dashboard', subtitle: '' },
          { id: 'feed', title: 'Feed', subtitle: '' },
          { id: 'communities', title: 'Communities', subtitle: '' },
          { id: 'feedback', title: 'Feedback', subtitle: 'Why uninstalling? Tell us' }
        ];

      const handle = (action) => {
        try {
          const key = String(action?.id || action?.type || '').toLowerCase();
          const routeFor = (k) => (k === 'dashboard' ? '/dashboard' : (k === 'feed' ? '/feed' : (k === 'communities' ? '/communities' : '/')));
          if (key === 'feedback') {
            // Open feedback modal in web
            try { webRef.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('wt_open_feedback')); true;`); } catch { }
            return;
          }
          const url = `${WEB_URL.replace(/\/$/, '')}${routeFor(key)}`;
          if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
        } catch { }
      };

      if (Platform.OS === 'ios' && expoQA && typeof expoQA.setItems === 'function') {
        expoQA.setItems(items).catch(() => { });
        (async () => {
          try {
            const initial = await expoQA.getInitialActionAsync();
            if (initial) handle(initial);
          } catch { }
        })();
        try { const sub = expoQA.addQuickActionListener(handle); return () => { try { sub && sub.remove && sub.remove(); } catch { } }; } catch { return undefined; }
      }

      if (Platform.OS === 'android' && rnQA && typeof rnQA.default?.setShortcutItems === 'function') {
        try { rnQA.default.setShortcutItems(items.map(i => ({ type: i.id, title: i.title, subtitle: i.subtitle, icon: i.icon, userInfo: { id: i.id } }))); } catch { }
        try {
          rnQA.default.popInitialAction().then((initial) => { if (initial) handle({ id: initial?.type || initial?.userInfo?.id }); }).catch(() => { });
        } catch { }
        try {
          const { DeviceEventEmitter } = require('react-native');
          const sub = DeviceEventEmitter.addListener('quickActionShortcut', (data) => handle({ id: data?.type || data?.userInfo?.id }));
          return () => { try { sub && sub.remove && sub.remove(); } catch { } };
        } catch { return undefined; }
      }
    } catch { }
  }, [WEB_URL, webReady, forwardDeepLinkToWeb]);

  // Resolve initial URL: dashboard if authed, home otherwise; override with notification deeplink
  useEffect(() => {
    (async () => {
      const target = `${WEB_URL.replace(/\/$/, '')}/dashboard`;
      setInitialUri(target);
      setInitialResolved(true);
    })();
  }, []);

  useEffect(() => {
    if (!initialResolved || hasLoadedDashboard) return;
    splashFallbackTimer.current = setTimeout(() => {
      setHasLoadedDashboard(true);
    }, 8000);
    return () => {
      if (splashFallbackTimer.current) {
        clearTimeout(splashFallbackTimer.current);
        splashFallbackTimer.current = null;
      }
    };
  }, [initialResolved, hasLoadedDashboard]);

  useEffect(() => {
    if (!showOnboarding) {
      askPushPermissionOnce().catch(() => { });
    }
  }, [showOnboarding, askPushPermissionOnce]);

  // Full-screen onboarding carousel (design-aligned)
  const renderOnboarding = () => {
    if (!showOnboarding) return null;
    const { width, height } = Dimensions.get('window');
    const titleColor = '#073863';
    const bodyColor = '#1a5a8d';
    const titleSize = width < 380 ? 34 : 40;
    const bodySize = width < 380 ? 16 : 18;

    const moveTo = (nextIndex) => {
      const i = Math.max(0, Math.min(nextIndex, slides.length - 1));
      setOnboardingIndex(i);
      try { onboardingScrollRef.current?.scrollTo({ x: i * width, animated: true }); } catch { }
    };

    const renderSlideArt = (idx) => {
      if (idx === 0) {
        return (
          <View style={{ width: '100%', alignItems: 'center', marginBottom: 26 }}>
            <View style={{ width: '92%', borderRadius: 28, padding: 14, backgroundColor: '#f5f7fb', shadowColor: '#0c3e66', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 2 }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#d9e8f9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Image source={appLogo} style={{ width: 38, height: 38 }} resizeMode="contain" />
              </View>
              <View style={{ height: 14, width: '62%', borderRadius: 7, backgroundColor: '#dbe8f6', marginBottom: 12 }} />
              <View style={{ height: 16, width: '96%', borderRadius: 8, backgroundColor: '#dde8f5', marginBottom: 8 }} />
              <View style={{ height: 16, width: '76%', borderRadius: 8, backgroundColor: '#dde8f5' }} />
            </View>
            <View style={{ width: '74%', marginTop: -20, borderRadius: 24, padding: 16, backgroundColor: '#0462a6' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#91c5ef', marginBottom: 12 }} />
              <View style={{ height: 20, borderRadius: 10, backgroundColor: '#e8f0fa', marginBottom: 12 }} />
              <View style={{ height: 18, width: '72%', borderRadius: 9, backgroundColor: '#7fb0d8', marginBottom: 14 }} />
              <View style={{ height: 12, borderRadius: 6, backgroundColor: '#7baed8' }}>
                <View style={{ height: 12, width: '68%', borderRadius: 6, backgroundColor: '#f2f7ff' }} />
              </View>
            </View>
          </View>
        );
      }

      if (idx === 1) {
        return (
          <View style={{ width: '100%', marginBottom: 26 }}>
            <View style={{ flexDirection: 'row', marginBottom: 22 }}>
              {[0, 1, 2].map((dot) => (
                <View key={dot} style={{ width: 58, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: dot === 2 ? '#0462a6' : '#b7d4f0' }} />
              ))}
            </View>
            <View style={{ borderRadius: 22, backgroundColor: '#ffffff', padding: 14, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Image source={appLogo} style={{ width: 42, height: 42, borderRadius: 10, marginRight: 10 }} resizeMode="contain" />
                <View>
                  <Text style={{ color: '#073863', fontWeight: '700', fontSize: 18 }}>Elena S.</Text>
                  <Text style={{ color: '#2f6ea1', fontSize: 14 }}>2m ago • Meditation Trail</Text>
                </View>
              </View>
              <Text style={{ color: '#384a5e', fontSize: 15, lineHeight: 22 }}>
                "Day 15 completed. The morning silence is becoming my favorite ritual."
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <Text style={{ color: '#0462a6', fontWeight: '700', marginRight: 18 }}>♥ 24</Text>
                <Text style={{ color: '#2f6ea1' }}>💬 8</Text>
              </View>
            </View>
            <View style={{ borderRadius: 20, backgroundColor: '#ffffff', padding: 14 }}>
              <Text style={{ color: '#073863', fontWeight: '700', fontSize: 22, marginBottom: 6 }}>New Milestone!</Text>
              <View style={{ height: 12, borderRadius: 6, backgroundColor: '#c9dff2', marginBottom: 10 }}>
                <View style={{ width: '84%', height: 12, borderRadius: 6, backgroundColor: '#0462a6' }} />
              </View>
              <Text style={{ color: '#1a5a8d', fontSize: 16 }}>Marcus reached 85% of 'Marathon Prep'</Text>
            </View>
          </View>
        );
      }

      return (
        <View style={{ width: '100%', marginBottom: 24 }}>
          <View style={{ borderRadius: 20, backgroundColor: '#ffffff', padding: 14, marginBottom: 14 }}>
            <Text style={{ color: '#1a5a8d', fontSize: 14, letterSpacing: 1, marginBottom: 6 }}>CURRENT STREAK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: '#0462a6', fontSize: 42, fontWeight: '700' }}>12 <Text style={{ fontSize: 28, color: '#1a5a8d' }}>Days</Text></Text>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#b9d3ef', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28, color: '#0462a6' }}>🔥</Text>
              </View>
            </View>
          </View>
          <View style={{ borderRadius: 20, backgroundColor: '#dce8f6', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#073863', fontSize: 20, fontWeight: '700' }}>Activity Map</Text>
              <Text style={{ color: '#2f6ea1', fontSize: 16 }}>May 2024</Text>
            </View>
            {[0, 1, 2, 3].map((row) => (
              <View key={row} style={{ flexDirection: 'row', marginBottom: 8 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                  const palette = ['#9fc1e8', '#75a4d7', '#0f69a6', '#085992'];
                  const color = palette[(row + col + (row === 2 ? 1 : 0)) % palette.length];
                  return <View key={`${row}-${col}`} style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: color, marginRight: 6 }} />;
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: '#2f6ea1', fontSize: 14 }}>Less  ▪ ▪ ▪  More</Text>
              <Text style={{ color: '#0f69a6', fontSize: 14 }}>● Target Met</Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e8edf5' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {onboardingIndex < slides.length - 1 && (
            <View style={{ position: 'absolute', top: 12, right: 22, zIndex: 10 }}>
              <TouchableOpacity onPress={finishOnboarding}>
                <Text style={{ color: '#1a5a8d', fontSize: 18, fontWeight: '600' }}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            ref={onboardingScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              try {
                const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
                if (i !== onboardingIndex) setOnboardingIndex(i);
              } catch { }
            }}
            style={{ flex: 1 }}
          >
            {slides.map((s, i) => {
              return (
                <View key={i} style={{ width, minHeight: height, paddingHorizontal: 22, paddingTop: 28 }}>
                  {renderSlideArt(i)}
                  <Text style={{ color: titleColor, fontSize: titleSize, fontWeight: '800', marginBottom: 10 }}>{s.title}</Text>
                  <Text style={{ color: bodyColor, fontSize: bodySize, lineHeight: bodySize * 1.5 }}>{s.body}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              {slides.map((_, i) => {
                return (
                  <View
                    key={i}
                    style={{
                      width: i === onboardingIndex ? 44 : 14,
                      height: 10,
                      borderRadius: 5,
                      marginRight: 8,
                      backgroundColor: i === onboardingIndex ? '#0462a6' : '#b7d4f0'
                    }}
                  />
                );
              })}
            </View>

            {onboardingIndex < slides.length - 1 ? (
              <TouchableOpacity
                onPress={() => moveTo(onboardingIndex + 1)}
                style={{ height: 58, borderRadius: 29, backgroundColor: '#0462a6', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>Next</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => moveTo(onboardingIndex - 1)}
                  style={{ height: 56, width: '32%', borderRadius: 28, backgroundColor: '#b7d4f0', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#1a5a8d', fontSize: 16, fontWeight: '700' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={finishOnboarding}
                  style={{ height: 56, width: '64%', borderRadius: 28, backgroundColor: '#0462a6', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>Get Started</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // PTR overlay (GitHub-like) — only on Feed and Notifications
  const renderPtrOverlay = () => {
    // Show overlay based on visibility state, not page type
    // This allows the fade-out animation to complete before unmounting
    if (!ptrVisible && !ptrLoading && ptrProgress === 0) return null;
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

  const renderStartupSplash = () => (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e8edf5', zIndex: 20 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 126, height: 126, borderRadius: 30, backgroundColor: '#f5f7fb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <View style={{ width: 84, height: 84, borderRadius: 22, overflow: 'hidden', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={appLogo} style={{ width: 76, height: 76 }} resizeMode="contain" />
            </View>
          </View>
          <Text style={{ color: '#4d5f6e', fontSize: 34, fontWeight: '600', marginBottom: 4 }}>WishTrail</Text>
          <Text style={{ color: '#6f95b6', fontSize: 11, letterSpacing: 2.1 }}>FIND YOUR PATH</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 64, left: 0, right: 0, alignItems: 'center' }}>
          <IndeterminateProgressBar
            width={86}
            height={4}
          />
        </View>
      </SafeAreaView>
    </View>
  );

  if (!initialResolved) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#e8edf5' }}>
        <StatusBar barStyle={'dark-content'} />
        {renderStartupSplash()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e8edf5' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
      <WebView
        ref={webRef}
        userAgent="WishTrailApp"
        source={{ uri: initialUri }}
        originWhitelist={originWhitelist}
        onLoadStart={() => { setLoading(true); if (ptrAnimRef.current) { try { ptrAnimRef.current.stop(); } catch { } } setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); ptrAnim.setValue(0); }}
        onLoadEnd={() => { setLoading(false); setWebReady(true); setHasLoadedDashboard(true); if (splashFallbackTimer.current) { clearTimeout(splashFallbackTimer.current); splashFallbackTimer.current = null; } if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); injectRefreshToken(); setTimeout(() => { if (ptrAnimRef.current) { try { ptrAnimRef.current.stop(); } catch { } } setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); ptrAnim.setValue(0); }, 400); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="always"
        scrollEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => <View style={{ flex: 1, backgroundColor: '#e8edf5' }} />}
        refreshControl={undefined}
      />
      {!hasLoadedDashboard && renderStartupSplash()}
      {renderPtrOverlay()}
      {renderOnboarding()}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
