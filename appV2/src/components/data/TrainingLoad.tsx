import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BarChart } from '@/components/data/BarChart';
import { border, font, fontSize, hue as hues, radius, surface, text } from '@/theme';

export interface TrainingLoadProps {
  data: number[];
  labels?: string[];
  title?: string;
  caption?: string;
  hue?: string;
  height?: number;
  /** Per-bar tooltip strings; when set, tapping a bar shows its value. */
  tooltips?: string[];
  style?: ViewStyle;
}

/** A titled bar chart of a weekly metric (e.g. active minutes). Generative-UI block. */
export function TrainingLoad({
  data,
  labels,
  title = 'Active minutes',
  caption = 'this week',
  hue = hues.move,
  height = 92,
  tooltips,
  style,
}: TrainingLoadProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{caption}</Text>
      </View>
      <BarChart data={data} labels={labels} hue={hue} height={height} tooltips={tooltips} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderRadius: radius.lg, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  sub: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
});
