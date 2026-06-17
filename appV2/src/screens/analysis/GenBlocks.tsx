import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RecoverySignals, SleepDurationCard, TrainingLoad, type RecoverySignal } from '@/components';
import { SleepCard } from '@/screens/today/SleepCard';
import { font, fontSize, hue, text } from '@/theme';
import type { GenKind } from './data';

const RECOVERY_SIGNALS: RecoverySignal[] = [
  { label: 'Resting heart rate', value: '54', unit: 'bpm', hue: hue.heart, week: [58, 57, 57, 56, 55, 54, 54] },
  { label: 'Heart rate variability', value: '62', unit: 'ms', hue: hue.mind, week: [52, 55, 54, 58, 60, 61, 62] },
];

const ACTIVE_MINUTES = [18, 40, 26, 52, 38, 12, 32];
const WEEK_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** The inline generative-UI blocks an analysis renders, keyed by kind. */
export function GenBlocks({ gen }: { gen: GenKind }) {
  if (gen === 'sleep') {
    return (
      <>
        <SectionLabel>Here's how you slept</SectionLabel>
        <SleepDurationCard duration="7h 12m" score={84} rating="Good" />
        <View style={styles.gap}>
          <SleepCard />
        </View>
        <SectionLabel>Your recovery signals</SectionLabel>
        <RecoverySignals signals={RECOVERY_SIGNALS} />
      </>
    );
  }
  return (
    <>
      <SectionLabel>This week's training load</SectionLabel>
      <TrainingLoad data={ACTIVE_MINUTES} labels={WEEK_LABELS} />
      <SectionLabel>Your recovery signals</SectionLabel>
      <RecoverySignals signals={RECOVERY_SIGNALS} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary, marginTop: 22, marginBottom: 12 },
  gap: { marginTop: 12 },
});
