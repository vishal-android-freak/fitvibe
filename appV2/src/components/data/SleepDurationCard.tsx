import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GaugeArc } from '@/components/data/GaugeArc';
import type { IconName } from '@/components/Icon';
import { accent, border, font, fontSize, hue, radius, surface, text } from '@/theme';

export interface SleepDurationCardProps {
  duration: string;
  score: number;
  rating: string;
  label?: string;
  icon?: IconName;
  /** override the gauge hue; defaults by rating (Great/Good/else) */
  hueColor?: string;
  style?: ViewStyle;
}

/** A duration figure + score gauge with a rating. Generative-UI block. */
export function SleepDurationCard({ duration, score, rating, label = 'Sleep duration', icon = 'moon', hueColor, style }: SleepDurationCardProps) {
  const gaugeHue = hueColor ?? (rating === 'Great' ? hue.move : rating === 'Good' ? accent.base : hue.energy);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.duration}>{duration}</Text>
        <Text style={styles.meta}>
          <Text style={styles.score}>{score}</Text> · {rating}
        </Text>
      </View>
      <GaugeArc value={score / 100} hue={gaugeHue} icon={icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: radius.lg, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle },
  left: {},
  label: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.secondary, marginBottom: 6 },
  duration: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary, lineHeight: fontSize['2xl'], letterSpacing: -0.3 },
  meta: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, marginTop: 8 },
  score: { fontFamily: font.sansBold, color: text.secondary },
});
