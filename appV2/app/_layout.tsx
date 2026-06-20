import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider, useAuth } from '@/auth';
import { useNotificationRouting } from '@/data/useNotificationRouting';
import { surface } from '@/theme';

/** Inside AuthProvider + router context: wires notification-tap routing + token
 *  re-registration once the user is signed in. Renders nothing. */
function NotificationRouter() {
  const { status } = useAuth();
  useNotificationRouting(status === 'signedIn');
  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: surface.bgApp }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
          <NotificationRouter />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: surface.bgApp },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="oauthredirect" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ask" />
            <Stack.Screen name="history" options={{ presentation: 'modal' }} />
            <Stack.Screen name="analysis/[id]" options={{ presentation: 'modal' }} />
          </Stack>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
