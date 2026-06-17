import React, { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { fmtClock } from '@/data/mock';
import { border, font, fontSize, hue, ringTrack, text } from '@/theme';

export type SleepStage = 'Awake' | 'REM' | 'Light' | 'Deep';

/** [stage, minutes] segments through the night, in chronological order. */
export type SleepSegment = [SleepStage, number];

/** Typical fraction (0–1) of the night spent in each stage, e.g. for the user's age. */
export type TypicalByStage = Partial<Record<SleepStage, number>>;

export interface HypnogramProps {
  /** Chronological [stage, minutes] segments. Defaults to a sample night. */
  segments?: SleepSegment[];
  /** Sleep onset in minutes since midnight (drives the hour axis). */
  onsetClock?: number;
  /** Per-stage typical fractions for the breakdown markers; falls back to generic norms. */
  typical?: TypicalByStage;
  /** Show the derived stage breakdown bars + typical-range legend below the chart. */
  showBreakdown?: boolean;
  style?: ViewStyle;
}

const STAGE_META: Record<SleepStage, { lane: number; hue: string; label: string; typical: number }> = {
  Awake: { lane: 0, hue: hue.heart, label: 'Awake', typical: 0.05 },
  REM: { lane: 1, hue: hue.mind, label: 'REM', typical: 0.22 },
  Light: { lane: 2, hue: hue.sleep, label: 'Light', typical: 0.5 },
  Deep: { lane: 3, hue: hue.sky, label: 'Deep', typical: 0.18 },
};

const STAGE_ORDER: SleepStage[] = ['Deep', 'REM', 'Light', 'Awake'];

/** A realistic sample night — Deep clusters early, REM lengthens toward morning. */
export const SAMPLE_SLEEP_SEGMENTS: SleepSegment[] = [
  ['Light', 32], ['Deep', 28], ['Light', 14], ['Deep', 22], ['REM', 10],
  ['Light', 38], ['Awake', 5], ['Light', 20], ['Deep', 10], ['REM', 16],
  ['Light', 24], ['REM', 14], ['Awake', 6], ['Light', 42], ['Deep', 6],
  ['REM', 22], ['Light', 18], ['REM', 16], ['Awake', 7], ['Light', 22],
  ['REM', 18], ['Light', 20], ['Awake', 6], ['Light', 40],
];

export const SAMPLE_ONSET_CLOCK = 23 * 60 + 24; // 11:24 PM

interface Derived {
  total: number;
  segs: { stage: SleepStage; start: number; dur: number; lane: number; hue: string; label: string; typical: number }[];
  ticks: { off: number; label: string }[];
  totals: Partial<Record<SleepStage, number>>;
}

function derive(segments: SleepSegment[], onsetClock: number): Derived {
  const total = segments.reduce((a, [, d]) => a + d, 0);

  let cum = 0;
  const segs = segments.map(([stage, dur]) => {
    const s = { stage, start: cum, dur, ...STAGE_META[stage] };
    cum += dur;
    return s;
  });

  const ticks: { off: number; label: string }[] = [];
  for (let hh = 0; hh < 24; hh += 2) {
    const off = (((hh * 60 - onsetClock) % 1440) + 1440) % 1440;
    if (off > 8 && off < total - 8) ticks.push({ off, label: fmtClock(hh * 60) });
  }

  const totals: Partial<Record<SleepStage, number>> = {};
  segments.forEach(([s, d]) => (totals[s] = (totals[s] || 0) + d));

  return { total, segs, ticks, totals };
}

function Chart({ width, d }: { width: number; d: Derived }) {
  const H = 172;
  const padR = 8;
  const padT = 8;
  const padB = 26;
  const labelW = 38;
  const plotL = labelW;
  const plotR = width - padR;
  const plotW = plotR - plotL;
  const plotH = H - padT - padB;
  const laneH = plotH / 4;
  const blockH = 15;
  const laneY = (lane: number) => padT + lane * laneH + laneH / 2;
  const x = (min: number) => plotL + (min / d.total) * plotW;

  return (
    <Svg viewBox={`0 0 ${width} ${H}`} width="100%" height={H}>
      {/* lane baselines + labels */}
      {Object.values(STAGE_META).map((m) => (
        <React.Fragment key={m.label}>
          <Line x1={plotL} y1={laneY(m.lane)} x2={plotR} y2={laneY(m.lane)} stroke={border.subtle} strokeWidth={1} strokeDasharray="1 5" opacity={0.5} />
          <SvgText x={4} y={laneY(m.lane) + 3.5} fill={text.tertiary} fontSize={10} fontFamily={font.sansSemibold} fontWeight="600">
            {m.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* hour gridlines */}
      {d.ticks.map((t) => (
        <React.Fragment key={t.off}>
          <Line x1={x(t.off)} y1={padT} x2={x(t.off)} y2={padT + plotH} stroke={border.subtle} strokeWidth={1} opacity={0.4} />
          <SvgText x={x(t.off)} y={H - 9} fill={text.tertiary} fontSize={9.5} fontFamily={font.mono} textAnchor="middle">
            {t.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* connectors — the cityscape steps */}
      {d.segs.map((s, i) => {
        if (i === 0) return null;
        const prev = d.segs[i - 1];
        const xb = x(s.start);
        return <Line key={`c${i}`} x1={xb} y1={laneY(prev.lane)} x2={xb} y2={laneY(s.lane)} stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeLinecap="round" />;
      })}

      {/* stage blocks */}
      {d.segs.map((s, i) => (
        <Rect key={i} x={x(s.start)} y={laneY(s.lane) - blockH / 2} width={Math.max(2, x(s.start + s.dur) - x(s.start))} height={blockH} rx={4} fill={s.hue} opacity={0.95} />
      ))}
    </Svg>
  );
}

/**
 * The sleep "cityscape" hypnogram (stages over the night) plus, optionally, the
 * derived stage breakdown bars and typical-range legend below it. A single
 * self-contained unit; totals are derived from `segments` so the chart and the
 * breakdown can never disagree.
 */
export function Hypnogram({
  segments = SAMPLE_SLEEP_SEGMENTS,
  onsetClock = SAMPLE_ONSET_CLOCK,
  typical,
  showBreakdown = true,
  style,
}: HypnogramProps) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const d = useMemo(() => derive(segments, onsetClock), [segments, onsetClock]);

  return (
    <View style={style}>
      <View onLayout={onLayout}>{w > 0 && <Chart width={w} d={d} />}</View>

      {showBreakdown && (
        <>
          <View style={styles.breakdown}>
            {STAGE_ORDER.map((key) => {
              const m = STAGE_META[key];
              const min = d.totals[key] || 0;
              const pct = d.total > 0 ? Math.round((min / d.total) * 100) : 0;
              const typicalPct = typical?.[key] ?? m.typical;
              return (
                <View key={key} style={styles.stageRow}>
                  <View style={styles.stageLabel}>
                    <View style={[styles.dot, { backgroundColor: m.hue }]} />
                    <Text style={styles.stageName}>{m.label}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: m.hue }]} />
                    <View style={[styles.typical, { left: `${Math.round(typicalPct * 100)}%` }]} />
                  </View>
                  <Text style={styles.stageStat}>
                    <Text style={styles.stageMin}>{fmtStageMin(min)}</Text> · {pct}%
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendMark} />
            <Text style={styles.legendText}>marker shows the typical range for your age</Text>
          </View>
        </>
      )}
    </View>
  );
}

function fmtStageMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  breakdown: { gap: 9, marginTop: 8 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageLabel: { width: 62, flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  stageName: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.secondary },
  barTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: ringTrack, justifyContent: 'center' },
  barFill: { height: 6, borderRadius: 999, opacity: 0.9 },
  typical: { position: 'absolute', top: -2, bottom: -2, width: 2, borderRadius: 2, backgroundColor: text.secondary, opacity: 0.75 },
  stageStat: { width: 64, textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
  stageMin: { fontFamily: font.mono, color: text.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  legendMark: { width: 2, height: 11, borderRadius: 2, backgroundColor: text.secondary },
  legendText: { fontFamily: font.sansRegular, fontSize: fontSize['2xs'], color: text.tertiary, lineHeight: fontSize['2xs'] * 1.3 },
});
