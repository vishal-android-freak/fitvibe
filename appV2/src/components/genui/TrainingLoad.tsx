import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from '@/components/data/BarChart';
import { border, font, fontSize, hue, radius, surface, text } from '@/theme';

const WEEK_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];
const DATA = [18, 40, 26, 52, 38, 12, 32];

/** Active-minutes bar chart for the week — a generative-UI block. */
export function TrainingLoad() {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Active minutes</Text>
        <Text style={styles.sub}>this week</Text>
      </View>
      <BarChart data={DATA} labels={WEEK_LABELS} hue={hue.move} height={92} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderRadius: radius.lg, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  sub: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
});
