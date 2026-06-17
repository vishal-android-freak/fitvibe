import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { font, fontSize, ringTrack, text } from '@/theme';

export interface Micro {
  label: string;
  value: number;
  goal: number;
  unit: string;
  hue: string;
}

/** A single micronutrient progress bar (value/goal with unit). */
export function MicroBar({ label, value, goal, unit, hue }: Micro) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: hue }]} />
      </View>
      <Text style={styles.stat}>
        <Text style={styles.strong}>{value.toLocaleString()}</Text>/{goal.toLocaleString()} {unit}
      </Text>
    </View>
  );
}

/** A stack of micronutrient bars. Generative-UI block. */
export function MicroBars({ items, style }: { items: Micro[]; style?: ViewStyle }) {
  return (
    <View style={style}>
      {items.map((m) => (
        <MicroBar key={m.label} {...m} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  label: { width: 84, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: ringTrack, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999, opacity: 0.9 },
  stat: { width: 92, textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
  strong: { color: text.primary },
});
