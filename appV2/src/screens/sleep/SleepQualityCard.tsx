import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { border, hue, font, fontSize, radius, status, surface, text, tint } from '@/theme';
import type { SleepQuality } from '@/data/sleep';
import { clk, fmtH, type NightView } from './data';

/**
 * Google Health's "Sleep quality" card. Shows the derived metrics the backend
 * computes from the stage timeline:
 *  - Time to sound sleep (ideal < 20 min) — approximate (±~2 min vs Google)
 *  - Interruptions (ideal 0) — exact match to Google
 *  - Sound sleep — labeled "Deep + REM" (a proxy, not Google's exact value)
 *  - A "Sleep disruptions" tick timeline across the night (stage-based; this is
 *    NOT Google's movement restlessness, which the API doesn't expose).
 */
export function SleepQualityCard({ night }: { night: NightView }) {
  const q: SleepQuality = night.raw.quality;
  const ttss = q.timeToSoundSleepMinutes;

  return (
    <View style={styles.card}>
      <RangeRow
        label="Time to sound sleep"
        value={ttss == null ? '—' : `${ttss} min`}
        // Ideal band is 0–20 min; place the dot within 0–40 for headroom.
        fill={ttss == null ? null : clamp(ttss / 40)}
        bandStart={0}
        bandEnd={20 / 40}
        inRange={ttss != null && ttss <= 20}
        hue={hue.sleep}
      />
      <View style={styles.divider} />
      <RangeRow
        label="Sound sleep"
        sublabel="Deep + REM"
        value={fmtH(q.soundSleepMinutes)}
        // No published band; show the bar filled proportionally to a ~4h ceiling.
        fill={clamp(q.soundSleepMinutes / 240)}
        bandStart={null}
        bandEnd={null}
        inRange={null}
        hue={hue.recovery}
      />
      <View style={styles.divider} />
      <RangeRow
        label="Interruptions"
        value={`${q.interruptionsMinutes} min · ${q.fullAwakenings} ${q.fullAwakenings === 1 ? 'moment' : 'moments'}`}
        // Ideal is 0; anything > 0 sits outside the band.
        fill={clamp(q.interruptionsMinutes / 60)}
        bandStart={0}
        bandEnd={0.02}
        inRange={q.interruptionsMinutes === 0}
        hue={hue.heart}
      />
      <View style={styles.divider} />
      <Disruptions night={night} q={q} />
    </View>
  );
}

/** A metric row: label + value + optional in-range pill, with a band gauge. */
function RangeRow({
  label,
  sublabel,
  value,
  fill,
  bandStart,
  bandEnd,
  inRange,
  hue: barHue,
}: {
  label: string;
  sublabel?: string;
  value: string;
  fill: number | null; // 0..1 position of the value on the track, null = unknown
  bandStart: number | null; // 0..1 ideal-band start, null = no band
  bandEnd: number | null;
  inRange: boolean | null; // null = no judgement (e.g. sound sleep)
  hue: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{label}</Text>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
        <Text style={styles.value}>{value}</Text>
        {inRange != null ? (
          <View style={[styles.pill, { backgroundColor: tint(inRange ? status.positive : status.warning, 0.16) }]}>
            <Text style={[styles.pillText, { color: inRange ? status.positive : status.warning }]}>
              {inRange ? 'In range' : 'High'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.track}>
        {/* The dashed ideal band, when this metric has one. */}
        {bandStart != null && bandEnd != null ? (
          <View
            style={[
              styles.band,
              {
                left: `${bandStart * 100}%`,
                width: `${Math.max(bandEnd - bandStart, 0.04) * 100}%`,
                borderColor: tint(barHue, 0.5),
              },
            ]}
          />
        ) : null}
        {/* Filled portion up to the value. */}
        {fill != null ? <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: tint(barHue, 0.55) }]} /> : null}
        {/* The value dot. */}
        {fill != null ? <View style={[styles.dot, { left: `${fill * 100}%`, backgroundColor: barHue }]} /> : null}
      </View>
    </View>
  );
}

/** The "Sleep disruptions" tick timeline across the night (onset → wake). */
function Disruptions({ night, q }: { night: NightView; q: SleepQuality }) {
  const onset = night.bed;
  const wake = night.wake;
  // Minutes from onset to wake, wrapping past midnight.
  const span = ((wake - onset + 1440) % 1440) || 1440;
  const pos = (atClock: number) => {
    const fromOnset = ((atClock - onset + 1440) % 1440);
    return clamp(fromOnset / span);
  };

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.labelWrap}>
          <Text style={styles.label}>Sleep disruptions</Text>
          <Text style={styles.sublabel}>
            {q.disruptions.length === 0
              ? 'an undisturbed night'
              : `${q.disruptions.length} ${q.disruptions.length === 1 ? 'moment' : 'moments'}`}
          </Text>
        </View>
      </View>
      <View style={styles.timeline}>
        {q.disruptions.map((d, i) => (
          <View key={`${d.at}-${i}`} style={[styles.tick, { left: `${pos(d.at) * 100}%` }]} />
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>{clk(onset)}</Text>
        <Text style={styles.axisLabel}>{clk(wake)}</Text>
      </View>
    </View>
  );
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  row: { paddingVertical: 14 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  labelWrap: { flex: 1 },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.primary },
  sublabel: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  value: { fontFamily: font.mono, fontSize: fontSize.sm, color: text.secondary },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontFamily: font.sansBold, fontSize: fontSize['2xs'] },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: surface.inset, overflow: 'hidden', justifyContent: 'center' },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: surface.card,
  },
  timeline: { height: 28, borderRadius: radius.sm, backgroundColor: surface.inset, overflow: 'hidden', justifyContent: 'center' },
  tick: { position: 'absolute', top: 5, bottom: 5, width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: hue.heart },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
  divider: { height: 1, backgroundColor: border.subtle },
});
