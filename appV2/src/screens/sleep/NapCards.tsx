import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Hypnogram, type SleepSegment } from '@/components';
import { accent, border, font, fontSize, radius, surface, text, tint } from '@/theme';
import type { Nap } from '@/data/sleep';
import { clk, fmtH } from './data';

/**
 * Same-day naps for the selected night, each rendered as a compact hypnogram
 * tagged "Nap" — no score/quality (those belong to the main sleep). Renders
 * nothing when there are no naps that day.
 */
export function NapCards({ naps }: { naps: Nap[] }) {
  if (!naps || naps.length === 0) return null;
  return (
    <>
      {naps.map((nap, i) => (
        <View key={`${nap.onsetClock}-${i}`} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NAP</Text>
            </View>
            <Text style={styles.dur}>{fmtH(nap.durationMinutes)}</Text>
            <Text style={styles.times}>
              {clk(nap.onsetClock)} – {clk(nap.wakeClock)}
            </Text>
          </View>
          <Hypnogram
            style={styles.chart}
            segments={nap.segments.map((s) => [s.stage, s.minutes] as SleepSegment)}
            onsetClock={nap.onsetClock}
            showBreakdown={false}
          />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: tint(accent.base, 0.18) },
  badgeText: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.6, color: accent.base },
  dur: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  times: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
  chart: { marginTop: 6 },
});
