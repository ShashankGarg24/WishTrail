import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const WEB_URL = (Constants.expoConfig?.extra?.WEB_URL || Constants.manifest?.extra?.WEB_URL || 'http://localhost:5173');

function App() {
  const webRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const authProbeTries = useRef(0);
  const authProbeTimer = useRef(null);

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
    // Configure notification handler (foreground display)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
    });
    registerForPushNotificationsAsync().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      const prev = appState.current;
      appState.current = state;
      if (prev.match(/inactive|background/) && state === 'active') {
        webRef.current?.injectJavaScript(`window.dispatchEvent(new Event('focus')); true;`);
        // Try to re-capture auth after returning to foreground
        if (!authToken) injectAuthProbe();
        // Retry web-side registration if we have the token
        if (expoPushToken) injectRegisterViaWeb(expoPushToken);
      }
    });
    return () => sub.remove();
  }, [expoPushToken]);

  // Foreground and tap listeners for push notifications
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      try {
        const content = notification?.request?.content || {};
        const data = content?.data || {};
        const payload = {
          title: content?.title || '',
          body: content?.body || '',
          url: data?.url || '',
          type: data?.type || '',
          id: data?.id || ''
        };
        const js = `window.dispatchEvent(new CustomEvent('wt_push', { detail: ${JSON.stringify(payload)} })); true;`;
        webRef.current?.injectJavaScript(js);
      } catch {}
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        const url = data?.url;
        if (url && typeof url === 'string') {
          const js = `try{window.location.href = ${JSON.stringify(url)};}catch(e){}; true;`;
          webRef.current?.injectJavaScript(js);
        }
      } catch {}
    });
    return () => { receivedSub.remove(); responseSub.remove(); };
  }, []);

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

  // Web-context registration using the web app's Authorization (localStorage token)
  const injectRegisterViaWeb = useCallback((token) => {
    try {
      if (!token) return;
      const script = `
        (async function(){
          try {
            var jwt = localStorage.getItem('token') || '';
            if (!jwt) return;
            await fetch('${WEB_URL.replace(/\/$/, '')}/api/v1/notifications/devices/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
              body: JSON.stringify({ token: ${JSON.stringify(token)}, platform: ${JSON.stringify(Platform.OS)}, provider: 'expo' })
            });
          } catch(e) {}
        })(); true;
      `;
      webRef.current?.injectJavaScript(script);
    } catch {}
  }, []);

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
          if (expoPushToken) unregisterForPushNotificationsAsync(expoPushToken);
          setAuthToken(null);
          setUserId(null);
        }
      } else if (data?.type === 'WT_USER') {
        const uid = (data.userId || '').trim();
        if (uid && uid.length > 0) setUserId(uid);
      }
    } catch {}
  }, [expoPushToken]);

  // Re-register device token when auth becomes available
  useEffect(() => {
    if (authToken && expoPushToken) {
      registerForPushNotificationsAsync().catch(() => {});
    }
  }, [authToken, expoPushToken]);

  useEffect(() => {
    return () => {
      if (expoPushToken && authToken) {
        unregisterForPushNotificationsAsync(expoPushToken);
      }
    };
  }, [expoPushToken, authToken]);

  // Retry web-context registration when we have expo token
  useEffect(() => { if (expoPushToken) injectRegisterViaWeb(expoPushToken); }, [expoPushToken, injectRegisterViaWeb]);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice || !authToken) return;
  
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
  
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    setExpoPushToken(token);
  
    // Always include auth header so backend can extract userId
    await fetch(`${WEB_URL.replace(/\/$/, '')}/api/v1/notifications/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS, provider: 'expo' }),
    });
  }

  async function unregisterForPushNotificationsAsync(token) {
    if (!token || !authToken) return;
    try {
      await fetch(`${WEB_URL.replace(/\/$/, '')}/api/v1/notifications/devices/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (e) {
      console.warn('Unregister failed', e);
    }
  }
  

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
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
