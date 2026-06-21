import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/auth';

// Module-level guard (survives navigation-triggered remounts; a per-instance
// ref would reset and re-fire the redirect → "maximum update depth").
let indexRedirecting = false;

/**
 * Entry gate at `/`. Pure router: signed-in users go to the tabs, everyone else
 * to the dedicated /welcome route. It renders nothing (the splash covers the
 * brief decision). We use a separate /welcome route rather than rendering the
 * onboarding here because `/` is shared with app/(tabs)/index.tsx (groups are
 * transparent in the URL), so a redirect to `/` is ambiguous.
 */
export default function Index() {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;
    if (indexRedirecting) return;
    indexRedirecting = true;
    requestAnimationFrame(() => router.replace(status === 'signedIn' ? '/(tabs)' : '/welcome'));
  }, [status]);

  return null;
}
