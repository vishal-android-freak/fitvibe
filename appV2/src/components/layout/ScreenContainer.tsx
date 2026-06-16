import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FieldGlow } from '@/components/FieldGlow';
import { useResponsive } from '@/theme';

/**
 * Full-bleed field-glow backdrop with a centered, max-width content column.
 * On phones the column fills the width; on tablet / iPad / web it stays
 * centered at `maxContent` so the UI keeps its mobile proportions instead of
 * stretching awkwardly across a wide screen.
 */
export function ScreenContainer({ children }: { children: React.ReactNode }) {
  const { maxContent } = useResponsive();
  return (
    <FieldGlow>
      <View style={styles.center}>
        <View style={[styles.column, { maxWidth: maxContent }]}>{children}</View>
      </View>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center' },
  // alignSelf:stretch (not width:100%) sizes the column to EXACTLY the parent
  // width — capped by maxWidth — so it can never measure wider than the
  // viewport and clip content on the right. This is the single place width is
  // bounded; descendants (Screen's scroller) just inherit via flex.
  column: { flex: 1, alignSelf: 'stretch' },
});
