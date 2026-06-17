import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AIGradient } from '@/components/ai/AIGradient';
import { font, fontSize, ringTrack, text } from '@/theme';

export interface CalorieBudgetProps {
  goal: number;
  food: number;
  exercise: number;
  style?: ViewStyle;
}

/** Calorie budget: remaining = goal − food + exercise, with a progress bar and
 *  the goal/food/exercise breakdown. Generative-UI block. */
export function CalorieBudget({ goal, food, exercise, style }: CalorieBudgetProps) {
  const remaining = goal - food + exercise;
  const eatenPct = goal + exercise > 0 ? Math.round((food / (goal + exercise)) * 100) : 0;
  const rows: [string, string][] = [
    ['Base goal', goal.toLocaleString()],
    ['Food', food.toLocaleString()],
    ['Exercise', `+${exercise}`],
  ];
  return (
    <View style={style}>
      <View style={styles.row}>
        <Text style={styles.big}>{remaining.toLocaleString()}</Text>
        <Text style={styles.unit}>kcal remaining</Text>
      </View>
      <View style={styles.track}>
        <AIGradient style={[styles.fill, { width: `${eatenPct}%` }]} />
      </View>
      <View style={styles.stats}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.stat}>
            <Text style={styles.statVal}>{v}</Text>
            <Text style={styles.statLabel}>{k}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontFamily: font.display, fontSize: fontSize['3xl'], color: text.primary, lineHeight: 44 },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.muted },
  track: { height: 8, borderRadius: 999, backgroundColor: ringTrack, overflow: 'hidden', marginTop: 14, marginBottom: 12 },
  fill: { height: 8, borderRadius: 999 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statVal: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  statLabel: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'], color: text.tertiary, marginTop: 2 },
});
