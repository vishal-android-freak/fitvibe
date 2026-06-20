/**
 * Push notifications: opt-in registration of an Expo push token with the Vaidya
 * service, and routing a notification tap to the right tab.
 *
 * expo-notifications is a NATIVE module (dev/standalone build only) and push
 * needs a physical device — so we import it lazily and degrade gracefully.
 * The opt-in preference is persisted so we re-register on app open when enabled.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiSend } from '@/data/api';
import { config } from '@/auth/config';

const OPT_IN_KEY = 'vaidya.notifications.optIn';
const TOKEN_KEY = 'vaidya.notifications.token';

/** Whether the user has opted in to notifications (persisted). */
export async function getNotificationsOptIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(OPT_IN_KEY)) === '1';
}

async function setOptIn(on: boolean): Promise<void> {
  await AsyncStorage.setItem(OPT_IN_KEY, on ? '1' : '0');
}

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas?.projectId;
}

/** Request permission + register the device's Expo push token with the service.
 *  Returns true on success. No-ops gracefully if the native module is absent. */
export async function enableNotifications(): Promise<boolean> {
  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = await import('expo-notifications');
  } catch {
    return false; // module not in this build
  }

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Insights',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  const token = tokenResp.data;

  await apiSend('POST', '/vaidya/push/register', { token, platform: Platform.OS }, config.vaidyaBaseUrl);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await setOptIn(true);
  return true;
}

/** Unregister this device's token and clear the opt-in. */
export async function disableNotifications(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await apiSend('POST', '/vaidya/push/unregister', { token }, config.vaidyaBaseUrl);
    } catch {
      /* best effort */
    }
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
  await setOptIn(false);
}

/** Re-register the token on app open IF the user previously opted in (tokens can
 *  rotate). Silent — never prompts. Call once after sign-in. */
export async function refreshRegistrationIfOptedIn(): Promise<void> {
  if (!(await getNotificationsOptIn())) return;
  try {
    await enableNotifications();
  } catch {
    /* offline / module missing — leave the stored opt-in as-is */
  }
}

/** Map a notification's `data.tab` to an in-app route. */
export function routeForTab(tab: unknown): string | null {
  switch (tab) {
    case 'today':
      return '/(tabs)';
    case 'sleep':
      return '/(tabs)/sleep';
    case 'insights':
      return '/(tabs)/insights';
    default:
      return null;
  }
}
