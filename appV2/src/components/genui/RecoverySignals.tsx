import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/core/Badge';
import { Sparkline } from '@/components/data/Sparkline';
import { border, font, fontSize, hue, radius, surface, text } from '@/theme';

const WEEK_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];

function SignalCard({ label, value, unit, hueColor, week }: { label: string; value: string; unit: string; hueColor: string; week: number[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Sparkline data={week} hue={hueColor} height={38} />
      <View style={styles.labels}>
        {WEEK_LABELS.map((d, i) => {
          const last = i === WEEK_LABELS.length - 1;
          return (
            <Text key={i} style={[styles.dayLabel, { color: last ? hueColor : text.tertiary }]}>
              {d}
            </Text>
          );
        })}
      </View>
      <View style={styles.badge}>
        <Badge tone="positive">In range</Badge>
      </View>
    </View>
  );
}

/** Two recovery signal cards (resting HR + HRV) — a generative-UI block. */
export function RecoverySignals() {
  return (
    <View style={styles.row}>
      <SignalCard label="Resting heart rate" value="54" unit="bpm" hueColor={hue.heart} week={[58, 57, 57, 56, 55, 54, 54]} />
      <SignalCard label="Heart rate variability" value="62" unit="ms" hueColor={hue.mind} week={[52, 55, 54, 58, 60, 61, 62]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 13, borderRadius: radius.lg, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle, gap: 9 },
  label: { fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.25, color: text.secondary, minHeight: 30 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary, lineHeight: fontSize['2xl'] },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.muted },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 },
  dayLabel: { fontFamily: font.sansSemibold, fontSize: 9.5 },
  badge: { flexDirection: 'row' },
});
