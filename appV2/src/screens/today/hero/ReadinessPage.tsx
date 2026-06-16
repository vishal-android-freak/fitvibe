import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, ProgressRing, type IconName } from '@/components';
import { accent, border, font, hue, radius, status, surface, text, tracking } from '@/theme';

const FACTORS: { icon: IconName; hue: string; label: string; val: string; delta: string; good: boolean }[] = [
  { icon: 'activity', hue: hue.mind, label: 'HRV', val: '62 ms', delta: '▲ 12%', good: true },
  { icon: 'heart', hue: hue.heart, label: 'Resting HR', val: '54 bpm', delta: '▼ 3', good: true },
  { icon: 'moon', hue: hue.sleep, label: 'Sleep', val: '7h 12m', delta: 'good', good: true },
];

/** Hero page 1 — readiness score ring + the three factors behind it. */
export function ReadinessPage() {
  return (
    <>
      <ProgressRing value={0.86} hue={accent.base} size={172} thickness={15}>
        <Text style={styles.score}>86</Text>
        <Text style={styles.ready}>READY TO PUSH</Text>
      </ProgressRing>
      <View style={styles.factors}>
        {FACTORS.map((f) => (
          <View key={f.label} style={styles.factor}>
            <View style={styles.factorHead}>
              <Icon name={f.icon} size={13} color={f.hue} />
              <Text style={styles.factorLabel}>{f.label}</Text>
            </View>
            <Text style={styles.factorVal}>{f.val}</Text>
            <Text style={[styles.factorDelta, { color: f.good ? status.positive : text.muted }]}>{f.delta}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  score: { fontFamily: font.display, fontSize: 52, color: text.primary, lineHeight: 52 },
  ready: { fontFamily: font.sansBold, fontSize: 11, color: accent.base, marginTop: 3, letterSpacing: tracking.wide },
  factors: { flexDirection: 'row', gap: 7, marginTop: 18, alignSelf: 'stretch' },
  factor: { flex: 1, gap: 3, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  factorHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factorLabel: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  factorVal: { fontFamily: font.display, fontSize: 14, color: text.primary, lineHeight: 16 },
  factorDelta: { fontFamily: font.sansBold, fontSize: 10 },
});
