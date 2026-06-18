import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { accent, border, font, fontSize, radius, space, status, surface, text, tint } from '@/theme';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  hue?: string;
  icon?: React.ReactNode;
  delta?: string;
  deltaDir?: 'up' | 'down';
  spark?: number[];
  goal?: string;
  style?: ViewStyle;
}

/** Dense metric tile: icon + label, big tabular value + unit, delta, mini spark. */
export function StatTile({
  label,
  value,
  unit,
  hue = accent.base,
  icon,
  delta,
  deltaDir = 'up',
  spark,
  goal,
  style,
}: StatTileProps) {
  const deltaGood = deltaDir === 'up';
  return (
    <View style={[styles.base, style]}>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconBox, { backgroundColor: tint(hue, 0.16) }]}>{icon}</View>
        ) : null}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {(delta != null || spark) && (
        <View style={styles.footer}>
          {delta != null && (
            <Text style={[styles.delta, { color: deltaGood ? status.positive : status.danger }]}>
              {deltaGood ? '▲' : '▼'} {delta}
            </Text>
          )}
          {goal != null && <Text style={styles.goal}>{goal}</Text>}
          {spark ? (
            <View style={styles.spark}>
              <MiniSpark data={spark} hue={hue} />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function MiniSpark({ data, hue }: { data: number[]; hue: string }) {
  const w = 76;
  const h = 26;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = w / (data.length - 1);
  const pts = data.map((d, i) => `${i * stepX},${h - 2 - (h - 4) * ((d - min) / span)}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={hue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: {
    gap: 10,
    padding: space[5],
    borderRadius: radius.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
    minWidth: 0,
    flex: 1,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconBox: { width: 24, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.muted },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' },
  value: { fontFamily: font.display, fontSize: fontSize.xl, color: text.primary, lineHeight: Math.round(fontSize.xl * 1.18) },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.muted, marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delta: { fontFamily: font.sansBold, fontSize: fontSize.xs },
  goal: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.tertiary },
  spark: { marginLeft: 'auto' },
});
