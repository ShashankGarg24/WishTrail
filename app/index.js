import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking, AppState, TouchableOpacity, Text, Modal, FlatList } from 'react-native';
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unread, setUnread] = useState(0);

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
        if (authToken) fetchNotifications();
      }
    });
    return () => sub.remove();
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

  useEffect(() => {
    if (authToken) {
      fetchNotifications();
    }
  }, [authToken]);

  async function fetchNotifications() {
    try {
      setNotificationsLoading(true);
      const res = await fetch(`${WEB_URL.replace(/\/$/, '')}/api/v1/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        credentials: 'include'
      });
      const json = await res.json();
      const list = json?.data?.notifications || json?.data || [];
      setNotifications(Array.isArray(list) ? list : []);
      setUnread(json?.data?.unread || (list.filter(n => !n.isRead).length));
    } catch (e) {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
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

  const timeAgo = (iso) => {
    try {
      const now = Date.now();
      const t = new Date(iso).getTime();
      const diff = Math.max(0, now - t);
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'now';
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h`;
      const d = Math.floor(h / 24);
      return `${d}d`;
    } catch { return ''; }
  };

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
      {/* Floating notifications button */}
      <View style={{ position: 'absolute', right: 16, bottom: 24 }}>
        <TouchableOpacity onPress={() => { setNotifOpen(true); if (authToken && notifications.length === 0) fetchNotifications(); }} style={{ backgroundColor: '#0ea5e9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>🔔</Text>
          {unread > 0 && (
            <View style={{ marginLeft: 6, backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications modal */}
      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={() => setNotifOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 24 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifOpen(false)}><Text style={{ color: '#9ca3af', fontSize: 14 }}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TouchableOpacity disabled={!authToken} onPress={async () => { try { await fetch(`${WEB_URL.replace(/\/$/, '')}/api/v1/notifications/read-all`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${authToken}` }, credentials: 'include' }); setNotifications(list => list.map(n => ({ ...n, isRead: true }))); setUnread(0); } catch {} }}>
                <Text style={{ color: authToken ? '#60a5fa' : '#6b7280' }}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#1f2937', height: 1, marginBottom: 8 }} />
            {notificationsLoading ? (
              <View style={{ padding: 16 }}><Text style={{ color: '#9ca3af' }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item._id || String(Math.random())}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: item.isRead ? '#111827' : '#0b1220', borderRadius: 12, padding: 12, marginVertical: 6 }}>
                    <Text style={{ color: '#e5e7eb', fontWeight: '600' }}>{item.title || 'Update'}</Text>
                    <Text style={{ color: '#c7d2fe', marginTop: 2 }}>{item.message}</Text>
                    <Text style={{ color: '#9ca3af', marginTop: 6, fontSize: 12 }}>{timeAgo(item.createdAt)}</Text>
                  </View>
                )}
                ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: '#9ca3af' }}>No notifications</Text></View>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;
