import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, InsightCard } from '@/components';
import { BlockList } from '@/components/ai/BlockRenderer';
import { useSleepInsight } from '@/data/vaidya';
import { font, fontSize, text } from '@/theme';
import { fmtH, type NightView } from './data';

/** Per-night sleep insight. Prefers Vaidya's generated insight for the night's
 *  date; falls back to the factual derived summary until Vaidya has produced one. */
export function SleepInsight({ night, onPress }: { night: NightView; onPress?: () => void }) {
  const { data } = useSleepInsight(night.raw.date);
  const blocks = data?.blocks ?? [];

  if (blocks.length) {
    return (
      <Pressable onPress={onPress}>
        <View pointerEvents="box-none">
          <BlockList blocks={blocks} />
        </View>
      </Pressable>
    );
  }

  return <DerivedInsight night={night} onPress={onPress} />;
}

/** Factual fallback derived from the night's own stage/vital data. */
function DerivedInsight({ night, onPress }: { night: NightView; onPress?: () => void }) {
  const n = night.raw;
  const deepPct = n.stages.find((s) => s.stage === 'Deep')?.percent ?? 0;
  const remPct = n.stages.find((s) => s.stage === 'REM')?.percent ?? 0;
  const wakeups = n.quality.fullAwakenings;
  const title = wakeups >= 2 ? 'Restful overall, a few wake-ups' : 'A solid night';

  return (
    <Pressable onPress={onPress}>
      <InsightCard eyebrow="FitVibe insight" title={title}>
        <Text style={styles.body}>
          You slept {fmtH(night.dur)} — {deepPct}% deep and {remPct}% REM, with{' '}
          {wakeups} {wakeups === 1 ? 'wake-up' : 'wake-ups'}
          {n.vitals.hrv != null ? `, and HRV at ${Math.round(n.vitals.hrv)} ms` : ''}.
        </Text>
        <View style={styles.badges}>
          <Badge hue="sleep">Deep {deepPct}%</Badge>
          <Badge hue="mind">REM {remPct}%</Badge>
          {n.vitals.hrv != null && <Badge hue="mind">HRV {Math.round(n.vitals.hrv)} ms</Badge>}
        </View>
      </InsightCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  badges: { flexDirection: 'row', gap: 7, marginTop: 13, flexWrap: 'wrap' },
});
