import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRefreshBus } from '@/data/refresh';
import { accent, useResponsive } from '@/theme';

const NAV_CLEARANCE = 104; // floating bottom nav height + margin

export interface ScreenProps {
  children: React.ReactNode;
  /** apply horizontal gutter padding (default true) */
  pad?: boolean;
  /**
   * Pull-to-refresh handler. When provided, the scroll view shows a
   * RefreshControl; the spinner stays until the returned promise settles.
   * If omitted, the screen auto-wires to the enclosing RefreshScope so every
   * data hook below it refetches on pull.
   */
  onRefresh?: () => Promise<unknown>;
}

/**
 * Scrollable content region inside the screen column. Leaves clearance for the
 * floating glass bottom nav, and applies the responsive side gutter. Pull-to-
 * refresh is on by default via the RefreshScope provided by ScreenContainer.
 */
export function Screen({ children, pad = true, onRefresh }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const bus = useRefreshBus();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = onRefresh ?? bus?.refreshAll;

  const handleRefresh = useCallback(() => {
    if (!refresh) return;
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  }, [refresh]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: NAV_CLEARANCE + insets.bottom,
        paddingHorizontal: pad ? gutter : 0,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        refresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent.base} colors={[accent.base]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Width is bounded once by ScreenContainer's column; the scroller just fills it.
  scroll: { flex: 1 },
});

export { NAV_CLEARANCE };
