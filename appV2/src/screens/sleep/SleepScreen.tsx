import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, Screen, SectionLabel } from '@/components';
import { SleepCard } from '@/screens/today/SleepCard';
import { useSleepNights } from '@/data/sleep';
import { accent, font, fontSize, text } from '@/theme';
import { DayScroller } from './DayScroller';
import { ScoreHero } from './ScoreHero';
import { SleepInsight } from './SleepInsight';
import { VitalsGrid } from './VitalsGrid';
import { ScheduleCard } from './ScheduleCard';
import { WeeklyTrend } from './WeeklyTrend';
import { toNightViews } from './data';

/**
 * The Sleep dashboard — day scroller → score hero → AI insight → hypnogram →
 * overnight vitals → schedule → weekly trend. Real data from /me/sleep/nights.
 */
export function SleepScreen() {
  const router = useRouter();
  const { nights: raw, loading, error } = useSleepNights(14);
  const [idx, setIdx] = useState(0);
  const nights = toNightViews(raw);
  const safeIdx = Math.min(idx, Math.max(0, nights.length - 1));
  const night = nights[safeIdx];

  return (
    <ScreenContainer>
      <Screen>
        {!night ? (
          <View style={styles.placeholder}>
            {loading ? (
              <ActivityIndicator color={accent.base} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>{error ? "Couldn't load sleep" : 'No sleep recorded yet'}</Text>
                <Text style={styles.emptyBody}>Wear your device to bed and your nights will appear here.</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <DayScroller idx={safeIdx} setIdx={setIdx} nights={nights} />

            <View style={styles.hero}>
              <ScoreHero night={night} />
            </View>

            <View style={styles.insight}>
              <SleepInsight night={night} onPress={() => router.push('/analysis/sleep')} />
            </View>

            <SectionLabel>Stages</SectionLabel>
            <SleepCard />

            <SectionLabel>Overnight vitals</SectionLabel>
            <VitalsGrid nights={nights} idx={safeIdx} />

            <SectionLabel>Schedule</SectionLabel>
            <ScheduleCard night={night} />

            <SectionLabel action="Month">Last {Math.min(nights.length, 7)} nights</SectionLabel>
            <WeeklyTrend nights={nights} />
          </>
        )}
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 16 },
  insight: { marginTop: 14 },
  placeholder: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 40 },
  emptyTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.secondary },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, textAlign: 'center' },
});
