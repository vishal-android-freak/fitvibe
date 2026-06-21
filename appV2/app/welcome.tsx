import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';

// Module-level guard (survives navigation-triggered remounts).
let welcomeRedirecting = false;

/**
 * The onboarding / signed-out screen. A dedicated route (not the root index) so
 * the signed-out redirect target is unambiguous — the root `/` is otherwise
 * shared by app/index.tsx AND app/(tabs)/index.tsx (groups are transparent in
 * the URL), so `replace('/')` would resolve to the tabs, not here. If the user
 * is actually signed in (e.g. they navigated here stale), bounce to the tabs.
 */
export default function Welcome() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn') {
      welcomeRedirecting = false;
      return;
    }
    if (welcomeRedirecting) return;
    welcomeRedirecting = true;
    requestAnimationFrame(() => router.replace('/(tabs)'));
  }, [status]);

  if (status === 'signedIn') return null; // mid-redirect to tabs
  return <WelcomeScreen />;
}
