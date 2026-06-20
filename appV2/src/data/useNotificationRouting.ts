/**
 * Routes a notification tap to the right tab (data.tab → today/sleep/insights),
 * for both a warm tap (app backgrounded) and a cold start (app launched from the
 * notification). Lazy-imports expo-notifications so it no-ops without a dev build.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { routeForTab, refreshRegistrationIfOptedIn } from './notifications';

export function useNotificationRouting(signedIn: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!signedIn) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      // Re-register the push token if the user opted in previously.
      await refreshRegistrationIfOptedIn();

      let Notifications: typeof import('expo-notifications');
      try {
        Notifications = await import('expo-notifications');
      } catch {
        return; // module not in this build
      }
      if (cancelled) return;

      const go = (data: unknown) => {
        const route = routeForTab((data as { tab?: string } | undefined)?.tab);
        if (route) router.navigate(route as never);
      };

      // Cold start: app opened by tapping a notification.
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) go(last.notification.request.content.data);

      // Warm taps while the app is running/backgrounded.
      sub = Notifications.addNotificationResponseReceivedListener((resp) => {
        go(resp.notification.request.content.data);
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [signedIn, router]);
}
