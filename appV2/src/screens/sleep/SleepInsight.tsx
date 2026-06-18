import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, InsightCard } from '@/components';
import { font, fontSize, text } from '@/theme';
import { fmtH, type NightView } from './data';

/** Per-night sleep summary, derived from the night's real stage/vital data.
 *  (A richer AI narrative will come from the Vaidya coach; this stays factual.) */
export function SleepInsight({ night, onPress }: { night: NightView; onPress?: () => void }) {
  const n = night.raw;
  const deep = n.stages.find((s) => s.stage === 'Deep');
  const rem = n.stages.find((s) => s.stage === 'REM');
  const deepPct = deep?.percent ?? 0;
  const remPct = rem?.percent ?? 0;

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
