import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from '@/components';
import { border, font, fontSize, hue, radius, surface, text } from '@/theme';
import { NIGHTS, fmtH } from './data';

// Oldest → newest, derived once.
const CHRONO = [...NIGHTS].reverse();
const DURATIONS = CHRONO.map((n) => n.dur);
const LABELS = CHRONO.map((n) => n.day[0]);
const AVG = Math.round(DURATIONS.reduce((a, b) => a + b, 0) / DURATIONS.length);
const SPREAD = Math.round((Math.max(...DURATIONS) - Math.min(...DURATIONS)) / 2);

/** Last-7-nights duration bars with average + consistency spread. */
export function WeeklyTrend() {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.statLabel}>7-night average</Text>
          <Text style={styles.statValue}>{fmtH(AVG)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.statLabel}>consistency</Text>
          <Text style={styles.statValue}>±{SPREAD}m</Text>
        </View>
      </View>
      <BarChart data={DURATIONS} labels={LABELS} hue={hue.sleep} height={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  right: { alignItems: 'flex-end' },
  statLabel: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  statValue: { fontFamily: font.display, fontSize: fontSize.xl, color: text.primary, marginTop: 2 },
});
