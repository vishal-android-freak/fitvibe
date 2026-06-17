import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GaugeArc } from '@/components';
import { border, font, fontSize, radius, surface, text } from '@/theme';
import { clk, fmtH, ratingHue, type Night } from './data';

/** Sleep score gauge + rating + duration and bed–wake window. */
export function ScoreHero({ night }: { night: Night }) {
  const hue = ratingHue(night.rating);
  return (
    <View style={styles.card}>
      <GaugeArc value={night.score / 100} size={104} hue={hue} icon="moon" />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>SLEEP SCORE</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{night.score}</Text>
          <Text style={[styles.rating, { color: hue }]}>{night.rating}</Text>
        </View>
        <View style={styles.durRow}>
          <Text style={styles.dur}>{fmtH(night.dur)}</Text>
          <Text style={styles.window}>
            {clk(night.bed)} – {clk(night.wake)}
          </Text>
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
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  dur: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
  window: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
});
