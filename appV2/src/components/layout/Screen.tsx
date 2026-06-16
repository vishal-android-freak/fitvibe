import React from 'react';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/theme';

const NAV_CLEARANCE = 104; // floating bottom nav height + margin

export interface ScreenProps {
  children: React.ReactNode;
  /** apply horizontal gutter padding (default true) */
  pad?: boolean;
  contentStyle?: ViewStyle;
  scrollRef?: React.Ref<ScrollView>;
}

/**
 * Scrollable content region inside the screen column. Leaves clearance for the
 * floating glass bottom nav, and applies the responsive side gutter.
 */
export function Screen({ children, pad = true, contentStyle, scrollRef }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        {
          paddingTop: insets.top + 8,
          paddingBottom: NAV_CLEARANCE + insets.bottom,
          paddingHorizontal: pad ? gutter : 0,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
});

export { NAV_CLEARANCE };
