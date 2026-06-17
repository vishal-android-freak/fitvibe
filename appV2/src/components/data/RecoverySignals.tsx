import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Badge } from '@/components/core/Badge';
import { Sparkline } from '@/components/data/Sparkline';
import { border, font, fontSize, radius, surface, text } from '@/theme';

export interface RecoverySignal {
  label: string;
  value: string;
  unit: string;
  hue: string;
  week: number[];
  status?: string;
}

export interface RecoverySignalsProps {
  signals: RecoverySignal[];
  /** x-axis day labels (must match the length of each signal's week) */
  labels?: string[];
  style?: ViewStyle;
}

const DEFAULT_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];

function SignalCard({ signal, labels }: { signal: RecoverySignal; labels: string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{signal.label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{signal.value}</Text>
        <Text style={styles.unit}>{signal.unit}</Text>
      </View>
      <Sparkline data={signal.week} hue={signal.hue} height={38} />
      <View style={styles.labels}>
        {labels.map((d, i) => {
          const last = i === labels.length - 1;
          return (
            <Text key={i} style={[styles.dayLabel, { color: last ? signal.hue : text.tertiary }]}>
              {d}
            </Text>
          );
        })}
      </View>
      <View style={styles.badge}>
        <Badge tone="positive">{signal.status ?? 'In range'}</Badge>
      </View>
    </View>
  );
}

/** A row of recovery signal cards (value + week sparkline + status). Generative-UI block. */
export function RecoverySignals({ signals, labels = DEFAULT_LABELS, style }: RecoverySignalsProps) {
  return (
    <View style={[styles.row, style]}>
      {signals.map((s) => (
        <SignalCard key={s.label} signal={s} labels={labels} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 13, borderRadius: radius.lg, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle, gap: 9 },
  label: { fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.25, color: text.secondary, minHeight: 30 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary, lineHeight: 35 },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.muted },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 },
  dayLabel: { fontFamily: font.sansSemibold, fontSize: 9.5 },
  badge: { flexDirection: 'row' },
});
