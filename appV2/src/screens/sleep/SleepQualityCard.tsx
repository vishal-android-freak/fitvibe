import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { border, hue, font, fontSize, radius, status, surface, text, tint } from '@/theme';
import type { SleepQuality, SleepBands } from '@/data/sleep';
import { clk, fmtH, type NightView } from './data';

type Verdict = 'in' | 'amber' | 'out' | null;

const VERDICT_LABEL: Record<'in' | 'amber' | 'out', string> = {
  in: 'In range',
  amber: 'Pay attention',
  out: 'Out of range',
};

function verdictColor(v: Verdict): string {
  return v === 'in' ? status.positive : v === 'amber' ? status.warning : status.danger;
}

/** Lower-is-better verdict: in ≤greenMax, amber ≤amberMax, else out. */
function lowerVerdict(value: number, greenMax: number, amberMax: number): Verdict {
  if (value <= greenMax) return 'in';
  if (value <= amberMax) return 'amber';
  return 'out';
}

/**
 * Google Health's "Sleep quality" card, driven by the backend's derived metrics
 * and "typical for your age" bands (NSF 2017 / Ohayon norms — not medical
 * thresholds). Rows:
 *  - Time to sound sleep — approximate (±~2 min vs Google), age-banded.
 *  - Restorative (Deep + REM) — our own honest metric. NOT Google's "sound
 *    sleep" (which HR-gates light & deep); banded as % of asleep time by age.
 *  - Interruptions — exact match to Google; in range is ≤~20 min & ≤1 awakening
 *    (NOT required to be zero).
 *  - Sleep disruptions — a stage-based tick timeline (NOT movement restlessness).
 *
 * Sleep efficiency is deliberately NOT shown: the device exposes no real "time
 * in bed", so asleep/sleep-period is always ~98-99% and carries no signal.
 */
export function SleepQualityCard({ night }: { night: NightView }) {
  const q: SleepQuality = night.raw.quality;
  const b: SleepBands = night.raw.bands;
  const asleep = night.raw.durationMinutes;

  // Time to sound sleep — lower is better, banded.
  const ttss = q.timeToSoundSleepMinutes;
  const ttssVerdict: Verdict = ttss == null ? null : lowerVerdict(ttss, b.timeToSoundSleep.greenMax, b.timeToSoundSleep.amberMax);

  // Restorative (Deep + REM) — fraction-of-asleep band scaled to minutes.
  const restoreLo = Math.round(b.soundSleepFraction.greenLo * asleep);
  const restoreHi = Math.round(b.soundSleepFraction.greenHi * asleep);
  const restoreAmberLo = Math.round(b.soundSleepFraction.amberLo * asleep);
  const restore = q.soundSleepMinutes;
  const restoreVerdict: Verdict =
    asleep <= 0 ? null : restore >= restoreLo ? 'in' : restore >= restoreAmberLo ? 'amber' : 'out';

  // Interruptions — both WASO minutes AND awakening count must be in range.
  const wasoV = lowerVerdict(q.interruptionsMinutes, b.interruptionsMinutes.greenMax, b.interruptionsMinutes.amberMax);
  const awakeV = lowerVerdict(q.fullAwakenings, b.fullAwakenings.greenMax, b.fullAwakenings.amberMax);
  const interruptVerdict: Verdict = worst(wasoV, awakeV);

  // Sleep efficiency is intentionally omitted: the device gives no real
  // "time in bed", so asleep/sleep-period is always ~98-99% and carries no
  // signal. See backend/docs/calculations-methodology.html.

  return (
    <View style={styles.card}>
      <RangeRow
        label="Time to sound sleep"
        value={ttss == null ? '—' : `${ttss} min`}
        verdict={ttssVerdict}
        // Scale the track to the amber edge + headroom.
        fill={ttss == null ? null : clamp(ttss / (b.timeToSoundSleep.amberMax * 1.4))}
        bandStart={0}
        bandEnd={clamp(b.timeToSoundSleep.greenMax / (b.timeToSoundSleep.amberMax * 1.4))}
        hue={hue.sleep}
      />
      <View style={styles.divider} />
      <RangeRow
        label="Restorative"
        sublabel="Deep + REM"
        value={fmtH(restore)}
        verdict={restoreVerdict}
        // Higher is better here; fill against ~60% of asleep for headroom.
        fill={asleep <= 0 ? null : clamp(restore / (asleep * 0.6))}
        bandStart={asleep <= 0 ? null : clamp(restoreLo / (asleep * 0.6))}
        bandEnd={asleep <= 0 ? null : clamp(restoreHi / (asleep * 0.6))}
        hue={hue.recovery}
      />
      <View style={styles.divider} />
      <RangeRow
        label="Interruptions"
        value={`${q.interruptionsMinutes} min · ${q.fullAwakenings} ${q.fullAwakenings === 1 ? 'moment' : 'moments'}`}
        verdict={interruptVerdict}
        fill={clamp(q.interruptionsMinutes / (b.interruptionsMinutes.amberMax * 1.4))}
        bandStart={0}
        bandEnd={clamp(b.interruptionsMinutes.greenMax / (b.interruptionsMinutes.amberMax * 1.4))}
        hue={hue.heart}
      />
      <View style={styles.divider} />
      <Disruptions night={night} q={q} />
      <Text style={styles.footnote}>Typical for ages {b.ageBucket}. Best read as a trend, not one night.</Text>
    </View>
  );
}

/** The more severe of two verdicts (out > amber > in). */
function worst(a: Verdict, b: Verdict): Verdict {
  const rank = { in: 0, amber: 1, out: 2 } as const;
  if (a == null) return b;
  if (b == null) return a;
  return rank[a] >= rank[b] ? a : b;
}

/** A metric row: label + value + verdict pill, with a band gauge + value dot. */
function RangeRow({
  label,
  sublabel,
  value,
  verdict,
  fill,
  bandStart,
  bandEnd,
  hue: barHue,
}: {
  label: string;
  sublabel?: string;
  value: string;
  verdict: Verdict;
  fill: number | null;
  bandStart: number | null;
  bandEnd: number | null;
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
        {verdict ? (
          <View style={[styles.pill, { backgroundColor: tint(verdictColor(verdict), 0.16) }]}>
            <Text style={[styles.pillText, { color: verdictColor(verdict) }]}>{VERDICT_LABEL[verdict]}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.track}>
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
        {fill != null ? <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: tint(barHue, 0.55) }]} /> : null}
        {fill != null ? <View style={[styles.dot, { left: `${fill * 100}%`, backgroundColor: barHue }]} /> : null}
      </View>
    </View>
  );
}

/** The "Sleep disruptions" tick timeline across the night (onset → wake). */
function Disruptions({ night, q }: { night: NightView; q: SleepQuality }) {
  const onset = night.bed;
  const wake = night.wake;
  const span = ((wake - onset + 1440) % 1440) || 1440;
  const pos = (atClock: number) => clamp(((atClock - onset + 1440) % 1440) / span);

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
  value: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.secondary },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontFamily: font.sansBold, fontSize: fontSize['2xs'] },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: surface.inset, overflow: 'hidden', justifyContent: 'center' },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill, borderWidth: 1, borderStyle: 'dashed' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, borderWidth: 2, borderColor: surface.card },
  timeline: { height: 28, borderRadius: radius.sm, backgroundColor: surface.inset, overflow: 'hidden', justifyContent: 'center' },
  tick: { position: 'absolute', top: 5, bottom: 5, width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: hue.heart },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
  divider: { height: 1, backgroundColor: border.subtle },
  footnote: { fontFamily: font.sansRegular, fontSize: fontSize['2xs'], color: text.muted, paddingVertical: 12 },
});
