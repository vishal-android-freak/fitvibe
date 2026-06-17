import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Sparkline } from '@/components/data/Sparkline';
import { border, font, fontSize, hue as hues, radius, surface, text } from '@/theme';

export interface HeartTile {
  label: string;
  value: string;
  color: string;
}

export interface HeartMetricsProps {
  bpm: number;
  caption?: string;
  trend: number[];
  trendHue?: string;
  tiles?: HeartTile[];
  style?: ViewStyle;
}

/** Resting heart-rate hero + trend sparkline + supporting tiles. Generative-UI block. */
export function HeartMetrics({ bpm, caption = 'resting heart rate · lowest this month', trend, trendHue = hues.heart, tiles = [], style }: HeartMetricsProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.eyebrow}>HEART</Text>
      <View style={styles.row}>
        <Text style={styles.big}>{bpm}</Text>
        <Text style={styles.unit}>bpm</Text>
      </View>
      <Text style={styles.sub}>{caption}</Text>
      <View style={styles.spark}>
        <Sparkline data={trend} hue={trendHue} height={56} />
      </View>
      {tiles.length > 0 && (
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={[styles.tileVal, { color: t.color }]}>{t.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: hues.heart, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontFamily: font.display, fontSize: 64, color: text.primary, lineHeight: 64 },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.muted },
  sub: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.secondary, marginTop: 4 },
  spark: { marginTop: 16, width: '100%', maxWidth: 264, alignSelf: 'center' },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' },
  tile: { flex: 1, gap: 3, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  tileLabel: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  tileVal: { fontFamily: font.display, fontSize: 16, lineHeight: 16 },
});
