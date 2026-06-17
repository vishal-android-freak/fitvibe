import { useEffect, useRef, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { FieldGlow } from '@/components';
import { useAuth } from '@/auth';
import { accent } from '@/theme';

/**
 * OAuth deep-link landing route. The backend redirects the browser here
 * (fitvibe://oauthredirect?token=…&state=…); Expo Router renders this screen,
 * which redeems the one-time token via the auth context, then routes onward.
 */
export default function OAuthRedirect() {
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const { completeSignIn } = useAuth();
  const [done, setDone] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Best-effort close the auth browser tab. dismissBrowser is typed as a
    // Promise but can return undefined at runtime (no browser to dismiss when
    // the deep link reopened the app); Promise.resolve handles both.
    void Promise.resolve(WebBrowser.dismissBrowser()).catch(() => {});
    completeSignIn({ token, error }).finally(() => setDone(true));
  }, [completeSignIn, token, error]);

  // Once handled, the index gate decides Today (signed in) vs Welcome.
  if (done) return <Redirect href="/" />;

  return (
    <FieldGlow>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={accent.base} />
      </View>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
