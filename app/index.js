import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Animated, PermissionsAndroid, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Onboarding from './components/Onboarding';
import StartupSplash from './components/StartupSplash';
import * as NativeSplash from 'expo-splash-screen';

import { getOnboardingState, completeOnboarding as saveOnboardingCompletion } from './onboardingState';
NativeSplash.preventAutoHideAsync().catch(() => {});
NativeSplash.setOptions({ duration: 350, fade: true });
// Push notifications removed (Expo). FCM to be integrated later.

WebBrowser.maybeCompleteAuthSession();

// RNFB: set a background handler early to suppress warnings and ensure background messages are handled gracefully.
try {
  let bgMessaging;
  let mod;
  try {
    mod = require('@react-native-firebase/messaging');
    bgMessaging = mod?.default || mod;
    console.log('[FCM] module loaded:', !!bgMessaging);
  } catch (e) {
    console.log('[FCM] require failed:', e);
  }
  bgMessaging = mod && (mod.default || mod);
  if (bgMessaging && typeof bgMessaging === 'function' && Platform.OS === 'android') {
    try { bgMessaging().setBackgroundMessageHandler(async () => { }); } catch (_) { }
  }
} catch (_) { }

const AsyncStorage = (() => { try { return require('@react-native-async-storage/async-storage').default; } catch { return null; } })();
let SecureStore = null; try { SecureStore = require('expo-secure-store'); } catch (_) { SecureStore = null; }

const WEB_URL = (
  Constants.expoConfig?.extra?.WEB_URL ||
  Constants.manifest?.extra?.WEB_URL ||
  Constants.manifest2?.extra?.expoClient?.extra?.WEB_URL ||
  'http://localhost:5173'
);
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
  const [destinationReady, setDestinationReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [initialRefreshToken, setInitialRefreshToken] = useState(null);
  // Expo push removed
  const authProbeTimer = useRef(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const onboardingKey = useRef(null);

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

  const postNotificationPermissionState = useCallback(async () => {
    try {
      let granted = true;
      let status = 'granted';

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const postNoti = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        const hasPermission = await PermissionsAndroid.check(postNoti);
        granted = !!hasPermission;
        status = granted ? 'granted' : 'denied';
      } else if (Platform.OS === 'ios') {
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (messaging) {
          try {
            const auth = await messaging().hasPermission();
            granted = typeof auth === 'number' ? auth >= 1 : !!auth;
            status = granted ? 'granted' : 'denied';
          } catch (_) {
            granted = false;
            status = 'unknown';
          }
        }
      }

      const payload = JSON.stringify({
        type: 'WT_NOTIFICATION_PERMISSION_STATE',
        granted,
        status,
        platform: Platform.OS
      });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
    } catch (_) { }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getOnboardingState().then(({ key, completed }) => {
      if (cancelled) return;
      onboardingKey.current = key;
      setShowOnboarding(!completed);
      setOnboardingReady(true);
    }).catch(error => {
      console.warn('Unable to read onboarding state', error);
      if (!cancelled) { setShowOnboarding(true); setOnboardingReady(true); }
    });
    return () => { cancelled = true; };
  }, []);

  const finishOnboarding = useCallback(async (signIn = false) => {
    try {
      const key = onboardingKey.current || (await getOnboardingState()).key;
      await saveOnboardingCompletion(key);
    } catch (error) {
      Alert.alert('Could not save your progress', 'Please try again.');
      return;
    }
    if (signIn) {
      setInitialUri(WEB_URL.replace(/\/$/, '') + '/auth');
    }
    setShowOnboarding(false);
  }, []);

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


  // FCM init + handlers (unchanged)
  const [fcmToken, setFcmToken] = useState(null);
  const lastRegisteredSignatureRef = useRef('');

  const [googleRequest, googleResponse, promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined
  });
  useEffect(() => {
    if (!onboardingReady || showOnboarding || splashVisible) return;
    const disableFcm = !!(Constants?.expoConfig?.extra?.DISABLE_FCM || Constants?.manifest?.extra?.DISABLE_FCM);
    if (disableFcm) { try { console.log('FCM disabled via extra.DISABLE_FCM'); } catch { }; return; }
    (async () => {
      try {
        try { console.log('[FCM] init start', { platform: Platform.OS }); } catch { }
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) { try { console.log('FCM: messaging module not available; skipping'); } catch { }; return; }

        let authStatus = null;
        if (Platform.OS === 'ios') {
          try { authStatus = await messaging().requestPermission(); } catch (_) { }
          try { console.log('[FCM] permission status:', authStatus); } catch { }

          const enabled = (typeof authStatus === 'number') ? (authStatus >= 1) : !!authStatus;
          if (!enabled) {
            try { console.log('[FCM] iOS permission not granted; skipping token'); } catch { }
            return;
          }
        } else {
          try { authStatus = await messaging().requestPermission(); } catch (_) { }
          try { console.log('[FCM] permission status:', authStatus); } catch { }

          // Android may report null here; still continue to fetch/register FCM token.
          if (Platform.Version >= 33) {
            try {
              const postNoti = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
              const hasPermission = await PermissionsAndroid.check(postNoti);
              if (!hasPermission) {
                const req = await PermissionsAndroid.request(postNoti);
                try { console.log('[FCM] POST_NOTIFICATIONS:', req); } catch { }
              }
            } catch (_) { }
          }
        }
        try { if (typeof messaging().registerDeviceForRemoteMessages === 'function') await messaging().registerDeviceForRemoteMessages(); } catch (_) { }
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
  }, [webReady, forwardDeepLinkToWeb, onboardingReady, showOnboarding, splashVisible]);

  // Register device token (unchanged)
  useEffect(() => {
    (async () => {
      try {
        const API = (API_BASE || '').replace(/\/$/, '');
        console.log('[FCM Register Debug] API:', API ? 'present' : 'MISSING', 'fcmToken:', fcmToken ? fcmToken.slice(0, 12) + '...' : 'MISSING', 'authToken:', authToken ? 'present' : 'MISSING', 'userId:', userId || 'MISSING');
        
        if (!API || !fcmToken || !(authToken || userId)) {
          console.log('[FCM Register] Skipping: missing API/token/auth');
          return;
        }

        const currentUserId = userId || null;
        const signature = `${String(currentUserId || '')}:${String(fcmToken || '')}`;
        if (lastRegisteredSignatureRef.current === signature) {
          console.log('[FCM Register] Skipping: already registered with same signature');
          return;
        }

        console.log('[FCM Register] Attempting registration for user:', currentUserId);
        const response = await fetch(`${API}/notifications/devices/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ token: fcmToken, platform: Platform.OS, provider: 'fcm', userId: userId || undefined })
        });

        if (response.ok) {
          lastRegisteredSignatureRef.current = signature;
          console.log('✓ FCM register SUCCESS for user:', currentUserId || 'auth-only');
        } else {
          try {
            const txt = await response.text();
            console.log('✗ FCM register FAILED:', response.status, txt?.slice?.(0, 300));
          } catch (e) {
            console.log('✗ FCM register FAILED:', response.status, response.statusText);
          }
        }
      } catch (e) {
        console.log('[FCM Register Error]:', e?.message || e);
      }
    })();
  }, [authToken, userId, fcmToken]);

  // Retry FCM token fetch when auth arrives but token is missing (helps recover from startup race)
  useEffect(() => {
    if (!authToken || fcmToken) return;
    (async () => {
      try {
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) return;
        const token = await messaging().getToken();
        if (token) {
          setFcmToken(token);
          try { console.log('[FCM] retry token success:', token.slice(0, 12) + '...'); } catch { }
        }
      } catch (e) {
        try { console.log('[FCM] retry token failed:', e?.message || e); } catch { }
      }
    })();
  }, [authToken, fcmToken]);

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
    } catch { }
  }, [injectPullToRefreshJS]);

  useEffect(() => {
    const t = setTimeout(() => injectAuthProbe(), 1200);
    return () => clearTimeout(t);
  }, [injectAuthProbe]);

  // Keep probing while native auth context is missing; login can happen long after initial load.
  useEffect(() => {
    if (authToken && userId) {
      if (authProbeTimer.current) {
        clearInterval(authProbeTimer.current);
        authProbeTimer.current = null;
      }
      return;
    }

    if (!authProbeTimer.current) {
      authProbeTimer.current = setInterval(() => {
        try { injectAuthProbe(); } catch { }
      }, 4000);
    }

    return () => {
      if (authProbeTimer.current) {
        clearInterval(authProbeTimer.current);
        authProbeTimer.current = null;
      }
    };
  }, [authToken, userId, injectAuthProbe]);

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
      } else if (data?.type === 'WT_REQUEST_NOTIFICATION_PERMISSION_STATE') {
        postNotificationPermissionState().catch(() => { });
      } else if (data?.type === 'WT_OPEN_APP_NOTIFICATION_SETTINGS') {
        try { Linking.openSettings(); } catch { }
      } else if (data?.type === 'WT_PATH') {
        try {
          const p = String(data.path || '/');
          setCurrentPath(p);
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
      } else if (data?.type === 'WT_STARTUP_READY') {
        setDestinationReady(true);
      }
    } catch { }
  }, [ptrAnim, promptGoogleSignIn, postNotificationPermissionState]);

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

  // The web auth store remains the source of truth. Restore native hints in
  // parallel with onboarding and animation; the web router resolves the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [authed, refreshToken] = await Promise.all([
        AsyncStorage?.getItem('wt_native_authed').catch(() => null),
        SecureStore?.getItemAsync('wt_refresh_token').catch(() => null),
      ]);
      if (cancelled) return;
      setInitialRefreshToken(refreshToken || null);
      setInitialUri(WEB_URL.replace(/\/$/, '') + (authed === '1' || refreshToken ? '/dashboard' : '/auth'));
      setInitialResolved(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (onboardingReady && !showOnboarding && !splashVisible) {
      askPushPermissionOnce().catch(() => { });
    }
  }, [onboardingReady, showOnboarding, splashVisible, askPushPermissionOnce]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={{ flex: 1 }} accessibilityElementsHidden={splashVisible}
        importantForAccessibility={splashVisible ? 'no-hide-descendants' : 'auto'}>
      {initialResolved && onboardingReady && <WebView
        ref={webRef}
        userAgent="WishTrailApp"
        source={{ uri: initialUri }}
        originWhitelist={originWhitelist}
        injectedJavaScriptObject={{ refreshToken: initialRefreshToken }}
        injectedJavaScriptBeforeContentLoaded={`window.__WT_REFRESH_TOKEN = ${JSON.stringify(initialRefreshToken)}; true;`}
        onError={() => setDestinationReady(true)}
        onHttpError={event => { if (event.nativeEvent.url === initialUri) setDestinationReady(true); }}
        onLoadStart={() => { setLoading(true); if (ptrAnimRef.current) { try { ptrAnimRef.current.stop(); } catch { } } setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); ptrAnim.setValue(0); }}
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); injectRefreshToken(); setTimeout(() => { postNotificationPermissionState().catch(() => { }); if (ptrAnimRef.current) { try { ptrAnimRef.current.stop(); } catch { } } setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); ptrAnim.setValue(0); }, 400); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="always"
        scrollEnabled
        allowsBackForwardNavigationGestures
        style={{ backgroundColor: '#F8FAFC' }}
        refreshControl={undefined}
      />}
      {renderPtrOverlay()}
      {onboardingReady && showOnboarding && <Onboarding onFinish={finishOnboarding} />}
      </View>
      {splashVisible && <StartupSplash destinationReady={onboardingReady && initialResolved && (showOnboarding || destinationReady)} onHidden={() => setSplashVisible(false)} />}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
