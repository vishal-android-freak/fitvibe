import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/theme';

const NAV_CLEARANCE = 104; // floating bottom nav height + margin

export interface ScreenProps {
  children: React.ReactNode;
  /** apply horizontal gutter padding (default true) */
  pad?: boolean;
}

/**
 * Scrollable content region inside the screen column. Leaves clearance for the
 * floating glass bottom nav, and applies the responsive side gutter.
 */
export function Screen({ children, pad = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: NAV_CLEARANCE + insets.bottom,
        paddingHorizontal: pad ? gutter : 0,
      }}
      showsVerticalScrollIndicator={false}
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
