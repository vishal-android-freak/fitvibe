import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, Screen } from '@/components';
import { font, fontSize, text } from '@/theme';
import { Spotlight } from './Spotlight';
import { WeeklyRecap } from './WeeklyRecap';
import { FilterChips } from './FilterChips';
import { InsightFeedCard } from './InsightFeedCard';
import { GROUPS, INSIGHTS, type CatId } from './data';

/**
 * The Insights feed — header → spotlight → weekly recap → category filter →
 * recency-grouped feed of derived insights. Tapping a card opens Ask FitVibe
 * seeded with a tailored question. Composes independent sections.
 */
export function InsightsScreen() {
  const router = useRouter();
  const [cat, setCat] = useState<CatId>('all');
  const ask = (seed: string) => router.push({ pathname: '/ask', params: { seed } });

  const list = INSIGHTS.filter((i) => cat === 'all' || i.cat === cat);

  return (
    <ScreenContainer>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Derived from your Google Health data</Text>
        </View>

        <Spotlight onAsk={ask} />

        <View style={styles.recap}>
          <WeeklyRecap />
        </View>

        <View style={styles.filters}>
          <FilterChips value={cat} onChange={setCat} />
        </View>

        {GROUPS.map((g) => {
          const items = list.filter((i) => i.group === g.id);
          if (!items.length) return null;
          return (
            <View key={g.id}>
              <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
              <View style={styles.feed}>
                {items.map((i) => (
                  <InsightFeedCard key={i.id} insight={i} onAsk={ask} />
                ))}
              </View>
            </View>
          );
        })}

        {list.length === 0 && <Text style={styles.empty}>No insights in this category yet.</Text>}
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, marginBottom: 16 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  subtitle: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, marginTop: 4 },
  recap: { marginTop: 14 },
  filters: { marginTop: 18, marginBottom: 4 },
  groupLabel: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary, marginTop: 16, marginBottom: 11, paddingHorizontal: 2 },
  feed: { gap: 12 },
  empty: { textAlign: 'center', fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, paddingVertical: 40 },
});
