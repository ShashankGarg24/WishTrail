import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Platform, SafeAreaView, StatusBar, View, RefreshControl, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';

const WEB_URL = (Constants.expoConfig?.extra?.WEB_URL || Constants.manifest?.extra?.WEB_URL || 'http://localhost:5173');

function App() {
  const webRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
