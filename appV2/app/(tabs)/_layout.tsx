import { useEffect } from 'react';
import { router, Tabs } from 'expo-router';
import { useAuth } from '@/auth';
import { BottomNav, NAV_ITEMS } from '@/components/layout/BottomNav';

// Module-level guard so a navigation-triggered remount can't reset it and
// re-fire the redirect (a per-instance ref does not survive remounts).
let tabsRedirecting = false;

/**
 * Tab shell with the custom glass bottom nav. The center "Ask" item is not a
 * real tab — it pushes the /ask modal. Today/Sleep/Body/Insights switch tabs.
 *
 * Auth-guarded: if the user signs out (or the session ends) while in the tabs,
 * bounce back to the entry gate. The redirect is fired exactly ONCE via a ref
 * guard (not a rendered <Redirect>, and not an effect keyed on the router
 * object) — anything that re-issues the navigation on every render trips
 * React's "maximum update depth" guard. We use the imperative `router` singleton
 * (stable, no hook dependency) so the effect can't re-run on router churn.
 */
export default function TabsLayout() {
  const { status } = useAuth();
  const signedOut = status !== 'signedIn' && status !== 'loading';

  useEffect(() => {
    if (!signedOut) {
      tabsRedirecting = false;
      return;
    }
    // Module-level guard: a remount (which router navigation can cause) would
    // reset a per-instance ref, so the flag must outlive the component.
    if (tabsRedirecting) return;
    tabsRedirecting = true;
    // Go to the dedicated /welcome route, NOT '/' — '/' is shared with this
    // group's index (app/(tabs)/index.tsx), so replace('/') resolves back here.
    // Defer past this commit so the navigator has settled before navigating.
    requestAnimationFrame(() => router.replace('/welcome'));
  }, [signedOut]);

  // Render nothing while signed out / redirecting (the tabs UI is gone).
  if (signedOut) return null;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={({ state }) => {
        const activeKey = state.routes[state.index]?.name ?? 'index';
        return (
          <BottomNav
            active={activeKey}
            onSelect={(key) => {
              if (key === 'ask') {
                router.push('/ask');
                return;
              }
              router.navigate(`/(tabs)/${key === 'index' ? '' : key}` as never);
            }}
          />
        );
      }}
    >
      {NAV_ITEMS.filter((i) => !i.ai).map((item) => (
        <Tabs.Screen key={item.key} name={item.key} />
      ))}
    </Tabs>
  );
}
