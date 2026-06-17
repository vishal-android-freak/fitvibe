import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components';
import { border, font, fontSize, hue, radius, status, surface, text, tint } from '@/theme';
import { clk, delta, TARGET_BED, TARGET_WAKE, type Night } from './data';

function ScheduleRow({
  icon,
  iconHue,
  label,
  actual,
  target,
  dval,
}: {
  icon: IconName;
  iconHue: string;
  label: string;
  actual: string;
  target: string;
  dval: string;
}) {
  const off = dval !== '+0m' && dval !== '−0m' && dval !== '0m';
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: tint(iconHue, 0.16) }]}>
        <Icon name={icon} size={18} color={iconHue} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.target}>target {target}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.actual}>{actual}</Text>
        <Text style={[styles.delta, { color: off ? status.warning : status.positive }]}>{dval}</Text>
      </View>
    </View>
  );
}

/** Bedtime & wake, actual vs target with deltas. */
export function ScheduleCard({ night }: { night: Night }) {
  return (
    <View style={styles.card}>
      <ScheduleRow icon="moon" iconHue={hue.sleep} label="Bedtime" actual={clk(night.bed)} target={clk(TARGET_BED)} dval={delta(night.bed, TARGET_BED)} />
      <View style={styles.divider} />
      <ScheduleRow icon="sunrise" iconHue={hue.energy} label="Wake" actual={clk(night.wake)} target={clk(TARGET_WAKE)} dval={delta(night.wake, TARGET_WAKE)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  iconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.primary },
  target: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  actual: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  delta: { fontFamily: font.sansBold, fontSize: fontSize.xs, marginTop: 1 },
  divider: { height: 1, backgroundColor: border.subtle },
});
