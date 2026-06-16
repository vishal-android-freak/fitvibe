import { Tabs, useRouter } from 'expo-router';
import { BottomNav, NAV_ITEMS } from '@/components/layout/BottomNav';

/**
 * Tab shell with the custom glass bottom nav. The center "Ask" item is not a
 * real tab — it pushes the /ask modal. Today/Sleep/Body/Insights switch tabs.
 */
export default function TabsLayout() {
  const router = useRouter();

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
