import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ProgressRing } from '@/components/data/ProgressRing';
import { font, fontSize, text } from '@/theme';

export interface ActivityRing {
  key: string;
  label: string;
  hue: string;
  value: number; // 0..1
  current: string;
  goal: string;
}

export interface ActivityRingsProps {
  rings: ActivityRing[];
  /** big centered figure, e.g. "82%" */
  center?: string;
  centerLabel?: string;
  size?: number;
  style?: ViewStyle;
}

/** Apple-style concentric activity rings + a per-ring legend. Generative-UI block. */
export function ActivityRings({ rings, center, centerLabel = 'ACTIVITY', size = 184, style }: ActivityRingsProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ProgressRing rings={rings.map((r) => ({ value: r.value, hue: r.hue }))} size={size}>
        {center ? (
          <>
            <Text style={styles.eyebrow}>{centerLabel}</Text>
            <Text style={styles.center}>{center}</Text>
          </>
        ) : null}
      </ProgressRing>
      <View style={styles.legend}>
        {rings.map((r) => (
          <View key={r.key} style={styles.item}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: r.hue, shadowColor: r.hue }]} />
              <Text style={styles.label}>{r.label}</Text>
            </View>
            <Text style={styles.val}>
              {r.current}
              <Text style={styles.goal}>/{r.goal}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary, marginBottom: 2 },
  center: { fontFamily: font.display, fontSize: 30, color: text.primary, lineHeight: 35 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 18 },
  item: { alignItems: 'center', minWidth: 52 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  dot: { width: 7, height: 7, borderRadius: 999, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  label: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  val: { fontFamily: font.display, fontSize: 15, color: text.primary, lineHeight: 18 },
  goal: { fontFamily: font.sansSemibold, fontSize: 10, color: text.muted },
});
