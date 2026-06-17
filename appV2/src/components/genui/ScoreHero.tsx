import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GaugeArc } from '@/components/data/GaugeArc';
import type { IconName } from '@/components/Icon';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';

export interface ScoreHeroProps {
  score: number; // 0..100
  rating: string;
  ratingHue?: string;
  /** big secondary figure, e.g. "7h 12m" */
  primary: string;
  /** mono caption, e.g. "11:24 PM – 6:48 AM" */
  caption?: string;
  eyebrow?: string;
  icon?: IconName;
  style?: ViewStyle;
}

/** A score gauge + rating + a primary figure and caption. Generative-UI block. */
export function ScoreHero({ score, rating, ratingHue = accent.base, primary, caption, eyebrow = 'SCORE', icon = 'moon', style }: ScoreHeroProps) {
  return (
    <View style={[styles.card, style]}>
      <GaugeArc value={score / 100} size={104} hue={ratingHue} icon={icon} />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{score}</Text>
          <Text style={[styles.rating, { color: ratingHue }]}>{rating}</Text>
        </View>
        <View style={styles.primaryRow}>
          <Text style={styles.primary}>{primary}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  body: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary, marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  score: { fontFamily: font.display, fontSize: 46, lineHeight: 46, color: text.primary },
  rating: { fontFamily: font.sansBold, fontSize: fontSize.md },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  primary: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
  caption: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
});
