import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { accent, border } from '@/theme';

/** Animated page-position dots; the active dot widens and tints accent. */
export function PageDots({ count, active }: { count: number; active: number }) {
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <View style={styles.dots}>
      {indices.map((i) => (
        <View
          key={i}
          style={[styles.dot, { width: i === active ? 22 : 7, backgroundColor: i === active ? accent.base : border.strong }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 12 },
  dot: { height: 7, borderRadius: 999 },
});
