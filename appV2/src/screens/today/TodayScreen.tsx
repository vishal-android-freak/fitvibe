import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ScreenContainer, Screen, SectionLabel } from '@/components';
import { TodayHeader } from './TodayHeader';
import { HeroCarousel } from './HeroCarousel';
import { TodayInsight } from './TodayInsight';
import { ActivityLog } from './ActivityLog';
import { SleepCard } from './SleepCard';

/**
 * The Today dashboard — pure composition of independent section components:
 * header, hero carousel, AI insight, activity feed, and last night's sleep.
 */
export function TodayScreen() {
  const router = useRouter();
  const openAnalysis = (id: string) => router.push(`/analysis/${id}`);

  return (
    <ScreenContainer>
      <Screen>
        <TodayHeader />

        <View style={styles.hero}>
          <HeroCarousel />
        </View>

        <View style={styles.insight}>
          <TodayInsight onPress={() => openAnalysis('sleep')} />
        </View>

        <SectionLabel action="All">Today's activity</SectionLabel>
        <ActivityLog onOpen={openAnalysis} />

        <SectionLabel>Last night</SectionLabel>
        <SleepCard />
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 10 },
  insight: { marginTop: 18 },
});
