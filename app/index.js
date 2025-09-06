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
      }
    });
    return () => sub.remove();
  }, []);

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

  // Capture auth token from the web app (after load)
  useEffect(() => {
    const script = `
      (function(){
        try {
          const t = localStorage.getItem('token') || '';
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_AUTH', token: t }));
        } catch(e) {}
      })(); true;
    `;
    const timer = setTimeout(() => { try { webRef.current?.injectJavaScript(script); } catch {} }, 1200);
    return () => clearTimeout(timer);
  }, [WEB_URL]);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data || '{}');
      if (data?.type === 'WT_AUTH') {
        const t = (data.token || '').trim();
        if (t && t.length > 0) setAuthToken(t);
      }
    } catch {}
  }, []);

  // Re-register device token when auth becomes available (helps associating token with user)
  useEffect(() => { if (authToken) { registerForPushNotificationsAsync().catch(() => {}); } }, [authToken]);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    // Android: ensure a high-importance channel
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#0ea5e9',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch {}
    }
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const platform = Platform.OS;
    try {
      const auth = authToken ? { Authorization: `Bearer ${authToken}` } : null;
      await fetch(`${WEB_URL.replace(/\/$/, '')}/api/v1/notifications/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth || {}) },
        body: JSON.stringify({ token, platform, provider: 'expo' })
      });
    } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        originWhitelist={originWhitelist}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
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
