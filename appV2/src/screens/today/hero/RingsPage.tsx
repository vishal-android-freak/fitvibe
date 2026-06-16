import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressRing, type Ring } from '@/components';
import { font, fontSize, hue, text, tracking } from '@/theme';

const RING_DEFS = [
  { key: 'move', hue: hue.move, target: 0.82, label: 'Move', val: '612', goal: '750' },
  { key: 'exercise', hue: hue.oxygen, target: 0.64, label: 'Exercise', val: '32', goal: '50' },
  { key: 'active', hue: hue.heart, target: 0.47, label: 'Active', val: '9', goal: '12' },
];

// Static — built once, not per render.
const RINGS: Ring[] = RING_DEFS.map((r) => ({ value: r.target, hue: r.hue }));

/** Hero page 2 — Apple-style activity rings (Move / Exercise / Active). */
export function RingsPage() {
  return (
    <>
      <ProgressRing rings={RINGS} size={184}>
        <Text style={styles.eyebrow}>ACTIVITY</Text>
        <Text style={styles.score}>82%</Text>
      </ProgressRing>
      <View style={styles.legend}>
        {RING_DEFS.map((r) => (
          <View key={r.key} style={styles.item}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: r.hue, shadowColor: r.hue }]} />
              <Text style={styles.label}>{r.label}</Text>
            </View>
            <Text style={styles.val}>
              {r.val}
              <Text style={styles.goal}>/{r.goal}</Text>
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: tracking.caps, color: text.tertiary, marginBottom: 2 },
  score: { fontFamily: font.display, fontSize: 30, color: text.primary, lineHeight: 30 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 18 },
  item: { alignItems: 'center', minWidth: 52 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  dot: { width: 7, height: 7, borderRadius: 999, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  label: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  val: { fontFamily: font.display, fontSize: 15, color: text.primary, lineHeight: 15 },
  goal: { fontFamily: font.sansSemibold, fontSize: 10, color: text.muted },
});
