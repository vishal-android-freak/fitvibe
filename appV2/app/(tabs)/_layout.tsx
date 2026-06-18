import { Redirect, Tabs, useRouter } from 'expo-router';
import { useAuth } from '@/auth';
import { BottomNav, NAV_ITEMS } from '@/components/layout/BottomNav';

/**
 * Tab shell with the custom glass bottom nav. The center "Ask" item is not a
 * real tab — it pushes the /ask modal. Today/Sleep/Body/Insights switch tabs.
 *
 * Auth-guarded: if the user signs out (or the session ends) while in the tabs,
 * bounce back to the entry gate so they land on the welcome screen.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { status } = useAuth();

  if (status !== 'signedIn' && status !== 'loading') {
    return <Redirect href="/" />;
  }

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
