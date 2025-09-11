import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
// Push notifications removed (Expo). FCM to be integrated later.

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
      }
    });
    return () => sub.remove();
  }, []);

  // FCM: request permissions, get token, and forward foreground messages to web UI
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) return;
        const fcmToken = await messaging().getToken();
        try { console.log('FCM token:', fcmToken ? (fcmToken.slice(0, 12) + '...') : 'null'); } catch {}
        const API_BASE = (Constants.expoConfig?.extra?.API_URL || Constants.manifest?.extra?.API_URL || '').replace(/\/$/, '');
        if (API_BASE && fcmToken && (authToken || userId)) {
          try {
            await fetch(`${API_BASE}/notifications/devices/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
              body: JSON.stringify({ token: fcmToken, platform: Platform.OS, provider: 'fcm', userId: userId || undefined })
            });
          } catch {}
        }
        const unsub = messaging().onMessage(async (remoteMessage) => {
          try {
            const data = remoteMessage?.data || {};
            const payload = { title: remoteMessage?.notification?.title || '', body: remoteMessage?.notification?.body || '', url: data?.url || '', type: data?.type || '', id: data?.id || '' };
            const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
            webRef.current?.injectJavaScript(js);
          } catch {}
        });
        // Note: no cleanup needed on Android for now
      } catch (e) {
        try { console.log('FCM init error', e?.message || e); } catch {}
      }
    })();
  }, [authToken, userId]);

  // Expo push listeners removed

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

  // Expo WebView registration helper removed

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

  // Expo registration helper removed

  // Expo registration retry removed

  // Expo unregister removed

  // Expo web registration removed

  // Expo push registration/unregistration removed (migrating to FCM)
  

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        originWhitelist={originWhitelist}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => { setLoading(false); injectAuthProbe(); if (expoPushToken) injectRegisterViaWeb(expoPushToken); }}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onMessage={onMessage}
        pullToRefreshEnabled={Platform.OS === 'android'}
        overScrollMode="always"
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => <View style={{ flex: 1, backgroundColor: '#fff' }} />}
        refreshControl={Platform.OS === 'ios' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      />
      {/* Expo in-app toast removed */}
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
