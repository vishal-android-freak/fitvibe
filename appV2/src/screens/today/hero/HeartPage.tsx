import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '@/components';
import { border, font, fontSize, hue, radius, surface, text, tracking } from '@/theme';

const SPARK_DATA = [58, 57, 59, 56, 55, 54, 54];
const TILES: [string, string, string][] = [
  ['HRV', '62 ms', hue.mind],
  ['Range', '48–142', hue.heart],
];

/** Hero page 3 — resting heart rate hero + sparkline + HRV/range tiles. */
export function HeartPage() {
  return (
    <>
      <Text style={styles.eyebrow}>HEART</Text>
      <View style={styles.row}>
        <Text style={styles.big}>54</Text>
        <Text style={styles.unit}>bpm</Text>
      </View>
      <Text style={styles.sub}>resting heart rate · lowest this month</Text>
      <View style={styles.spark}>
        <Sparkline data={SPARK_DATA} hue={hue.heart} height={56} />
      </View>
      <View style={styles.tiles}>
        {TILES.map(([k, v, c]) => (
          <View key={k} style={styles.tile}>
            <Text style={styles.tileLabel}>{k}</Text>
            <Text style={[styles.tileVal, { color: c }]}>{v}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: tracking.caps, color: hue.heart, marginBottom: 10 },
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
