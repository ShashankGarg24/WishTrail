import { pullToRefreshScript } from './webViewGestures';
import { startPushRegistration } from './pushRegistration';
import { persistRefreshToken } from './refreshTokenStorage';
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
// Native push notifications use Firebase Cloud Messaging.

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

  const injectPullToRefreshJS = useCallback(() => {
    webRef.current?.injectJavaScript(pullToRefreshScript);
  }, []);

  const [pushAllowed, setPushAllowed] = useState(false);
  const permissionRequest = useRef(null);
  const postNotificationPermissionState = useCallback(async (requestId = null, request = false, automatic = false) => {
    try {
      const mod = require('@react-native-firebase/messaging');
      const messaging = mod.default || mod;
      const existingPermission = await messaging().hasPermission();
      const alreadyAsked = await AsyncStorage?.getItem('wt_push_perm_asked');
      if (request && existingPermission !== 1 && existingPermission !== 2 && (!automatic || alreadyAsked !== '1')) {
        if (!permissionRequest.current) {
          permissionRequest.current = (async () => {
            if (Platform.OS === 'android' && Platform.Version >= 33) {
              await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            } else if (Platform.OS === 'ios') {
              await messaging().requestPermission();
            }
            await AsyncStorage?.setItem('wt_push_perm_asked', '1');
          })().finally(() => { permissionRequest.current = null; });
        }
        await permissionRequest.current;
      }
      const auth = await messaging().hasPermission();
      const granted = auth === 1 || auth === 2;
      setPushAllowed(granted);
      const payload = JSON.stringify({ type: 'WT_NOTIFICATION_PERMISSION_STATE', requestId, granted, status: granted ? 'granted' : 'denied', platform: Platform.OS });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
    } catch (error) {
      console.warn('[FCM] Permission check failed:', error?.code || error?.message);
      const payload = JSON.stringify({ type: 'WT_NOTIFICATION_PERMISSION_STATE', requestId, granted: false, status: 'unknown' });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && appState.current !== 'active') {
        webRef.current?.injectJavaScript("window.dispatchEvent(new Event('wt_native_resume')); true;");
      }
      appState.current = state;
    });
    return () => subscription.remove();
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


  // Initialize FCM only after notification permission has been granted.
  const [fcmToken, setFcmToken] = useState(null);
  const lastRegisteredSignatureRef = useRef('');
  const [pushResume, setPushResume] = useState(0);
  const initialNotificationHandledRef = useRef(false);

  useEffect(() => {
    if (!onboardingReady || showOnboarding || splashVisible) return;
    // Read existing OS permission without waiting for the website or prompting.
    postNotificationPermissionState();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      postNotificationPermissionState();
      lastRegisteredSignatureRef.current = '';
      setPushResume(value => value + 1);
    });
    return () => subscription.remove();
  }, [onboardingReady, showOnboarding, splashVisible, postNotificationPermissionState]);

  const [googleRequest, googleResponse, promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined
  });
  useEffect(() => {
    if (!onboardingReady || showOnboarding || splashVisible || !pushAllowed) return;
    const disableFcm = !!(Constants?.expoConfig?.extra?.DISABLE_FCM || Constants?.manifest?.extra?.DISABLE_FCM);
    if (disableFcm) { try { console.log('FCM disabled via extra.DISABLE_FCM'); } catch { }; return; }
    let cancelled = false;
    const subscriptions = [];
    (async () => {
      try {
        try { console.log('[FCM] init start', { platform: Platform.OS }); } catch { }
        let messaging;
        try {
          const mod = require('@react-native-firebase/messaging');
          messaging = mod?.default || mod;
        } catch (_) { messaging = null; }
        if (!messaging) { try { console.log('FCM: messaging module not available; skipping'); } catch { }; return; }

        try { if (typeof messaging().registerDeviceForRemoteMessages === 'function') await messaging().registerDeviceForRemoteMessages(); } catch (_) { }
        const token = await messaging().getToken();
        if (cancelled || unregisteringRef.current) return;
        setFcmToken(token);
        subscriptions.push(messaging().onTokenRefresh(setFcmToken));
        try { console.log('FCM token:', token ? (token.slice(0, 12) + '...') : 'null'); } catch { }

        subscriptions.push(messaging().onMessage(async (remoteMessage) => {
          try {
            const data = remoteMessage?.data || {};
            const payload = { title: remoteMessage?.notification?.title || '', body: remoteMessage?.notification?.body || '', url: data?.url || '', type: data?.type || '', id: data?.id || '' };
            const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
            webRef.current?.injectJavaScript(js);
          } catch { }
        }));

        subscriptions.push(messaging().onNotificationOpenedApp((remoteMessage) => {
          try {
            const url = remoteMessage?.data?.url || '';
            if (url) {
              if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
            }
          } catch { }
        }));

        try {
          const initial = initialNotificationHandledRef.current ? null : await messaging().getInitialNotification();
          initialNotificationHandledRef.current = true;
          const url = initial?.data?.url || '';
          if (url) {
            if (webReady) forwardDeepLinkToWeb(url); else pendingDeepLinkRef.current = url;
          }
        } catch { }
      } catch (e) {
        try { console.log('FCM init error', e?.message || e); } catch { }
      }
    })();
    return () => { cancelled = true; subscriptions.forEach(unsubscribe => unsubscribe()); };
  }, [webReady, forwardDeepLinkToWeb, onboardingReady, showOnboarding, splashVisible, pushAllowed, pushResume]);

  const unregisteringRef = useRef(false);
  const flushPendingUnregister = useCallback(async () => {
    const raw = await SecureStore?.getItemAsync('wt_pending_unregister');
    if (!raw) return;
    const pending = JSON.parse(raw);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(`${API_BASE.replace(/\/$/, '')}/notifications/devices/unregister`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pending.authToken}` },
        body: JSON.stringify({ token: pending.token }), signal: controller.signal
      });
    } finally { clearTimeout(timer); }
    // Expired credentials cannot unregister; logout also revokes the FCM token locally.
    if (!response.ok && response.status !== 401 && response.status !== 403) throw new Error('unregister_pending');
    await SecureStore?.deleteItemAsync('wt_pending_unregister');
  }, []);
  useEffect(() => {
    flushPendingUnregister().catch(() => {});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') flushPendingUnregister().catch(() => {}); });
    return () => subscription.remove();
  }, [flushPendingUnregister]);

  // Register only after any pending logout cleanup has completed.
  useEffect(() => {
    const API = (API_BASE || '').replace(/\/$/, '');
    if (!pushAllowed || !API || !fcmToken || !authToken || unregisteringRef.current) return;
    const signature = `${userId || ''}:${fcmToken}`;
    if (lastRegisteredSignatureRef.current === signature) return;
    return startPushRegistration({
      register: async signal => {
        await flushPendingUnregister();
        if (signal.aborted || unregisteringRef.current) throw new Error('registration_cancelled');
        const response = await fetch(`${API}/notifications/devices/register`, {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ token: fcmToken, platform: Platform.OS, provider: 'fcm', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        });
        if (!response.ok) throw Object.assign(new Error('device_registration_failed'), { status: response.status });
      },
      onSuccess: () => {
        lastRegisteredSignatureRef.current = signature;
        console.log('[FCM] Device registered');
      },
      onFailure: error => console.warn('[FCM] Registration failed:', error.status || error.message)
    });
  }, [authToken, userId, fcmToken, pushAllowed, pushResume, flushPendingUnregister]);

  // Retry FCM token fetch when auth arrives but token is missing (helps recover from startup race)
  useEffect(() => {
    if (!pushAllowed || !authToken || fcmToken || unregisteringRef.current) return;
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
  }, [authToken, fcmToken, pushAllowed]);

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
      if (data?.type === 'WT_UNREGISTER_DEVICE') {
        unregisteringRef.current = true;
        lastRegisteredSignatureRef.current = '';
        (async () => {
          try {
            if (fcmToken && authToken) {
              await SecureStore?.setItemAsync('wt_pending_unregister', JSON.stringify({ token: fcmToken, authToken }));
              await flushPendingUnregister();
            }
          } catch { /* Retry securely stored unregister on next start/resume. */ }
          finally {
            try { const mod = require('@react-native-firebase/messaging'); await (mod.default || mod)().deleteToken(); setFcmToken(null); } catch {}
            await SecureStore?.deleteItemAsync('wt_refresh_token');
            webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'WT_DEVICE_UNREGISTERED' }) })); true;`);
          }
        })();
      } else if (data?.type === 'WT_AUTH') {
        const t = (data.token || '').trim();
        if (t && t.length > 0) {
          setAuthToken(t);
          try { AsyncStorage && AsyncStorage.setItem('wt_native_authed', '1'); } catch { }
        } else {
          setAuthToken(null);
          setUserId(null);
          unregisteringRef.current = false;
          lastRegisteredSignatureRef.current = "";
          try { AsyncStorage && AsyncStorage.removeItem('wt_native_authed'); } catch { }
        }
      } else if (data?.type === 'WT_USER') {
        const uid = String(data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      } else if (data?.type === 'WT_REFRESH') {
        const rt = (data.refreshToken || '').trim();
        if (rt && rt.length > 0) {
          void persistRefreshToken(SecureStore, rt)
            .then(() => {
              console.log('[Auth] refresh credential persisted');
              try { webRef.current?.injectJavaScript(`window.__WT_REFRESH_TOKEN = ${JSON.stringify(rt)}; true;`); } catch { }
            })
            .catch(error => console.warn('[Auth] refresh credential persistence failed:', error?.message || error));
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
        postNotificationPermissionState(data.requestId, !!data.request, !!data.automatic).catch(() => { });
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
        ptrAnim.setValue(0);
      } else if (data?.type === 'WT_PTR_PROGRESS') {
        // Debounce rapid progress updates (max 60fps)
        const now = Date.now();
        if (now - lastProgressUpdate.current < 16) return;
        lastProgressUpdate.current = now;

        const p = Math.max(0, Math.min(Number(data.progress) || 0, 1));
        setPtrVisible(true);
        setPtrProgress(p);

        // Follow the finger directly; only release/hide uses a timed animation.
        ptrAnim.setValue(p);
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
        webRef.current?.injectJavaScript(`
          if (location.pathname === '/feed' || location.pathname === '/feed/') {
            window.dispatchEvent(new Event('wt_refresh'));
          } else { location.reload(); }
          true;
        `);
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
  }, [ptrAnim, promptGoogleSignIn, postNotificationPermissionState, fcmToken, authToken, flushPendingUnregister]);

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
        await persistRefreshToken(SecureStore, refreshToken);
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
      const idToken = googleResponse?.params?.id_token || googleResponse?.authentication?.idToken;
      if (idToken) {
        completeNativeGoogleLogin(idToken);
      } else {
        Alert.alert('Google Sign-In', 'Google did not return an ID token.');
      }
    } else if (googleResponse.type === 'error') {
      Alert.alert('Google Sign-In', googleResponse?.error?.message || 'Google sign-in failed. Please try again.');
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
        onLoadEnd={() => { setLoading(false); setWebReady(true); if (pendingDeepLinkRef.current) { forwardDeepLinkToWeb(pendingDeepLinkRef.current); pendingDeepLinkRef.current = ''; } injectAuthProbe(); injectRefreshToken(); setTimeout(() => { if (ptrAnimRef.current) { try { ptrAnimRef.current.stop(); } catch { } } setPtrLoading(false); setPtrVisible(false); setPtrProgress(0); ptrAnim.setValue(0); }, 400); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        scalesPageToFit={false}
        bounces={false}
        overScrollMode="never"
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
