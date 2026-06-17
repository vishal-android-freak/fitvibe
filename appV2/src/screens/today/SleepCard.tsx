import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Hypnogram, SAMPLE_ONSET_CLOCK, SAMPLE_SLEEP_SEGMENTS } from '@/components';
import { fmtMin } from '@/data/mock';
import { border, font, fontSize, radius, surface, text } from '@/theme';

// Header stats derived once from the same segments the Hypnogram renders, so
// the summary and the chart can never disagree.
const ASLEEP = SAMPLE_SLEEP_SEGMENTS.reduce((a, [s, d]) => a + (s === 'Awake' ? 0 : d), 0);
const TOTAL = SAMPLE_SLEEP_SEGMENTS.reduce((a, [, d]) => a + d, 0);
const WAKE = SAMPLE_ONSET_CLOCK + TOTAL;
const EFFICIENCY = Math.round((ASLEEP / TOTAL) * 100);

function fmtClock(c: number): string {
  c = ((c % 1440) + 1440) % 1440;
  const h = Math.floor(c / 60);
  const m = c % 60;
  const ap = h < 12 ? 'a' : 'p';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

/** Last night's sleep: a summary header over the shared Hypnogram component. */
export function SleepCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <View style={styles.headRow}>
            <Text style={styles.duration}>{fmtMin(ASLEEP)}</Text>
            <Text style={styles.asleep}>asleep</Text>
          </View>
          <Text style={styles.times}>
            {fmtClock(SAMPLE_ONSET_CLOCK)} – {fmtClock(WAKE)} · {EFFICIENCY}% efficiency
          </Text>
        </View>
        <Badge tone="positive">Best this week</Badge>
      </View>

      <Hypnogram style={styles.chart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  duration: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
  asleep: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  times: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 5 },
  chart: { marginTop: 6 },
});
