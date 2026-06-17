import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BarChart } from '@/components/data/BarChart';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';

export interface TrendStat {
  label: string;
  value: string;
}

export interface TrendCardProps {
  data: number[];
  labels?: string[];
  hue?: string;
  height?: number;
  /** up to two summary stats shown above the chart (left + right) */
  stats?: [TrendStat, TrendStat];
  style?: ViewStyle;
}

/** A bar-chart card with optional left/right summary stats. Generative-UI block. */
export function TrendCard({ data, labels, hue = accent.base, height = 96, stats, style }: TrendCardProps) {
  return (
    <View style={[styles.card, style]}>
      {stats && (
        <View style={styles.head}>
          <View>
            <Text style={styles.statLabel}>{stats[0].label}</Text>
            <Text style={styles.statValue}>{stats[0].value}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.statLabel}>{stats[1].label}</Text>
            <Text style={styles.statValue}>{stats[1].value}</Text>
          </View>
        </View>
      )}
      <BarChart data={data} labels={labels} hue={hue} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  right: { alignItems: 'flex-end' },
  statLabel: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  statValue: { fontFamily: font.display, fontSize: fontSize.xl, color: text.primary, lineHeight: 28, marginTop: 2 },
});
