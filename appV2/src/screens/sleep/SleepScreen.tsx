import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ScreenContainer, Screen, SectionLabel } from '@/components';
import { SleepCard } from '@/screens/today/SleepCard';
import { DayScroller } from './DayScroller';
import { ScoreHero } from './ScoreHero';
import { SleepInsight } from './SleepInsight';
import { VitalsGrid } from './VitalsGrid';
import { ScheduleCard } from './ScheduleCard';
import { WeeklyTrend } from './WeeklyTrend';
import { NIGHTS } from './data';

/**
 * The Sleep dashboard — day scroller → score hero → AI insight → hypnogram →
 * overnight vitals → schedule → weekly trend. Composes independent sections.
 */
export function SleepScreen() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const night = NIGHTS[idx];

  return (
    <ScreenContainer>
      <Screen>
        <DayScroller idx={idx} setIdx={setIdx} night={night} />

        <View style={styles.hero}>
          <ScoreHero night={night} />
        </View>

        <View style={styles.insight}>
          <SleepInsight night={night} onPress={() => router.push('/analysis/sleep')} />
        </View>

        <SectionLabel>Stages</SectionLabel>
        <SleepCard />

        <SectionLabel>Overnight vitals</SectionLabel>
        <VitalsGrid night={night} />

        <SectionLabel>Schedule</SectionLabel>
        <ScheduleCard night={night} />

        <SectionLabel action="Month">Last 7 nights</SectionLabel>
        <WeeklyTrend />
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 16 },
  insight: { marginTop: 14 },
});
