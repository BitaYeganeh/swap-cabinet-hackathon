import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// The Sharetribe Web Template with the Smart Search module, served from the
// laptop on the same Wi-Fi. Change this when the laptop's address changes.
const MARKETPLACE_URL = 'http://192.168.1.172:4000';

// Development aid: send the page's JavaScript errors to the Expo log.
const REPORT_ERRORS = `
  window.addEventListener('error', function (e) {
    window.ReactNativeWebView.postMessage('error: ' + e.message + ' @ ' + e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.ReactNativeWebView.postMessage('rejection: ' + (e.reason && e.reason.message || e.reason));
  });
  true;
`;

export default function App() {
  const webView = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  // Android back button: go back inside the marketplace, not out of the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webView.current) {
        webView.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const retry = useCallback(() => {
    setFailed(false);
    webView.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.title}>Can't reach the marketplace</Text>
            <Text style={styles.text}>
              Check that the phone and the laptop are on the same Wi-Fi, and that the website runs
              on {MARKETPLACE_URL}.
            </Text>
            <Pressable style={styles.button} onPress={retry}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={webView}
            source={{ uri: MARKETPLACE_URL }}
            style={styles.root}
            onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
            onError={() => setFailed(true)}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" />
              </View>
            )}
            // iOS: swipe from the edge to go back, like Safari.
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            // Photo search: the file picker offers the camera and the photo library.
            allowFileAccess
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={__DEV__ ? REPORT_ERRORS : undefined}
            onMessage={e => console.log('[web]', e.nativeEvent.data)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  text: { fontSize: 15, color: '#555555', textAlign: 'center' },
  button: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#1d4f6d' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
