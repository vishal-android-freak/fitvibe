import React, { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Badge } from '@/components';
import { fmtMin } from '@/data/mock';
import { border, font, fontSize, hue, radius, ringTrack, surface, text } from '@/theme';

/**
 * A realistic night as [stage, minutes] segments. Deep clusters early, REM
 * lengthens toward morning, brief awakenings. Totals are DERIVED from this so
 * the chart and the breakdown can never disagree.
 */
const SLEEP_SEGMENTS: [Stage, number][] = [
  ['Light', 32], ['Deep', 28], ['Light', 14], ['Deep', 22], ['REM', 10],
  ['Light', 38], ['Awake', 5], ['Light', 20], ['Deep', 10], ['REM', 16],
  ['Light', 24], ['REM', 14], ['Awake', 6], ['Light', 42], ['Deep', 6],
  ['REM', 22], ['Light', 18], ['REM', 16], ['Awake', 7], ['Light', 22],
  ['REM', 18], ['Light', 20], ['Awake', 6], ['Light', 40],
];

type Stage = 'Awake' | 'REM' | 'Light' | 'Deep';

const STAGE_META: Record<Stage, { lane: number; hue: string; label: string; typical: number }> = {
  Awake: { lane: 0, hue: hue.heart, label: 'Awake', typical: 0.05 },
  REM: { lane: 1, hue: hue.mind, label: 'REM', typical: 0.22 },
  Light: { lane: 2, hue: hue.sleep, label: 'Light', typical: 0.5 },
  Deep: { lane: 3, hue: hue.sky, label: 'Deep', typical: 0.18 },
};

const ONSET_CLOCK = 23 * 60 + 24; // 11:24 PM, minutes since midnight

function fmtClock(c: number): string {
  c = ((c % 1440) + 1440) % 1440;
  const h = Math.floor(c / 60);
  const m = c % 60;
  const ap = h < 12 ? 'a' : 'p';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

/* ---- Derived once from the constant segments (never per render) ---- */
const TOTAL = SLEEP_SEGMENTS.reduce((a, [, d]) => a + d, 0);
const ASLEEP = SLEEP_SEGMENTS.reduce((a, [s, d]) => a + (s === 'Awake' ? 0 : d), 0);
const WAKE = ONSET_CLOCK + TOTAL;
const EFFICIENCY = Math.round((ASLEEP / TOTAL) * 100);
const ORDER: Stage[] = ['Deep', 'REM', 'Light', 'Awake'];

const STAGE_TOTALS: Partial<Record<Stage, number>> = {};
SLEEP_SEGMENTS.forEach(([s, d]) => (STAGE_TOTALS[s] = (STAGE_TOTALS[s] || 0) + d));

// Stage segments with cumulative start offsets + lane/hue metadata.
const SEGS = (() => {
  let cum = 0;
  return SLEEP_SEGMENTS.map(([stage, dur]) => {
    const s = { stage, start: cum, dur, ...STAGE_META[stage] };
    cum += dur;
    return s;
  });
})();

// Even-hour clock ticks that fall inside the night.
const TICKS: { off: number; label: string }[] = [];
for (let hh = 0; hh < 24; hh += 2) {
  const off = (((hh * 60 - ONSET_CLOCK) % 1440) + 1440) % 1440;
  if (off > 8 && off < TOTAL - 8) TICKS.push({ off, label: fmtClock(hh * 60) });
}

function Hypnogram({ width }: { width: number }) {
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
  const x = (min: number) => plotL + (min / TOTAL) * plotW;

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
      {TICKS.map((t) => (
        <React.Fragment key={t.off}>
          <Line x1={x(t.off)} y1={padT} x2={x(t.off)} y2={padT + plotH} stroke={border.subtle} strokeWidth={1} opacity={0.4} />
          <SvgText x={x(t.off)} y={H - 9} fill={text.tertiary} fontSize={9.5} fontFamily={font.mono} textAnchor="middle">
            {t.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* connectors — the cityscape steps */}
      {SEGS.map((s, i) => {
        if (i === 0) return null;
        const prev = SEGS[i - 1];
        const xb = x(s.start);
        return <Line key={`c${i}`} x1={xb} y1={laneY(prev.lane)} x2={xb} y2={laneY(s.lane)} stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeLinecap="round" />;
      })}

      {/* stage blocks */}
      {SEGS.map((s, i) => (
        <Rect
          key={i}
          x={x(s.start)}
          y={laneY(s.lane) - blockH / 2}
          width={Math.max(2, x(s.start + s.dur) - x(s.start))}
          height={blockH}
          rx={4}
          fill={s.hue}
          opacity={0.95}
        />
      ))}
    </Svg>
  );
}

/** Last night's sleep: hypnogram + stage breakdown with typical-range markers. */
export function SleepCard() {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <View style={styles.headRow}>
            <Text style={styles.duration}>{fmtMin(ASLEEP)}</Text>
            <Text style={styles.asleep}>asleep</Text>
          </View>
          <Text style={styles.times}>
            {fmtClock(ONSET_CLOCK)} – {fmtClock(WAKE)} · {EFFICIENCY}% efficiency
          </Text>
        </View>
        <Badge tone="positive">Best this week</Badge>
      </View>

      <View style={styles.chart} onLayout={onLayout}>
        {w > 0 && <Hypnogram width={w} />}
      </View>

      <View style={styles.breakdown}>
        {ORDER.map((key) => {
          const m = STAGE_META[key];
          const min = STAGE_TOTALS[key] || 0;
          const pct = Math.round((min / TOTAL) * 100);
          return (
            <View key={key} style={styles.stageRow}>
              <View style={styles.stageLabel}>
                <View style={[styles.dot, { backgroundColor: m.hue }]} />
                <Text style={styles.stageName}>{m.label}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: m.hue }]} />
                <View style={[styles.typical, { left: `${Math.round(m.typical * 100)}%` }]} />
              </View>
              <Text style={styles.stageStat}>
                <Text style={styles.stageMin}>{fmtMin(min)}</Text> · {pct}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendMark} />
        <Text style={styles.legendText}>marker shows the typical range for your age</Text>
      </View>
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
