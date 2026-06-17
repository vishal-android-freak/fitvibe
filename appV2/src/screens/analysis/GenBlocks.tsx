import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SleepCard } from '@/screens/today/SleepCard';
import { RecoverySignals } from '@/components/genui/RecoverySignals';
import { SleepDurationCard } from '@/components/genui/SleepDurationCard';
import { TrainingLoad } from '@/components/genui/TrainingLoad';
import { font, fontSize, text } from '@/theme';
import type { GenKind } from './data';

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
        <RecoverySignals />
      </>
    );
  }
  return (
    <>
      <SectionLabel>This week's training load</SectionLabel>
      <TrainingLoad />
      <SectionLabel>Your recovery signals</SectionLabel>
      <RecoverySignals />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary, marginTop: 22, marginBottom: 12 },
  gap: { marginTop: 12 },
});
