import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, Screen } from '@/components';
import { BlockList } from '@/components/ai/BlockRenderer';
import { useDayInsight } from '@/data/vaidya';
import { accent, font, fontSize, text } from '@/theme';

/**
 * The Insights feed — Vaidya's nightly detailed day report, rendered live as a
 * sequence of generative blocks (insight cards with correlations/trends/flags +
 * supporting charts). Empty/loading states until the nightly report is generated.
 */
export function InsightsScreen() {
  const { data, loading } = useDayInsight();
  const blocks = data?.blocks ?? [];

  return (
    <ScreenContainer>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>
            {data?.date ? `Your day, analyzed · ${data.date}` : 'Derived from your Google Health data'}
          </Text>
        </View>

        {blocks.length > 0 ? (
          <BlockList blocks={blocks} />
        ) : (
          <View style={styles.placeholder}>
            {loading ? (
              <ActivityIndicator color={accent.base} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>Your daily report is being prepared</Text>
                <Text style={styles.emptyBody}>
                  Vaidya analyzes your day each evening — correlations, trends, and what to act on.
                  Check back tonight.
                </Text>
              </>
            )}
          </View>
        )}
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, marginBottom: 16 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  subtitle: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, marginTop: 4 },
  placeholder: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.secondary },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, textAlign: 'center', maxWidth: 300, lineHeight: fontSize.sm * 1.5 },
});
