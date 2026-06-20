import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InsightCard } from '@/components';
import { BlockList } from '@/components/ai/BlockRenderer';
import { useTodayInsight } from '@/data/vaidya';
import { font, fontSize, text } from '@/theme';

/** The Today "FitVibe insight" card — the cron-generated today_headline, rendered
 *  via BlockRenderer. Taps through to the rich analysis. Shows a quiet placeholder
 *  until the first insight has been generated. */
export function TodayInsight({ onPress }: { onPress?: () => void }) {
  const { data, loading } = useTodayInsight();
  const blocks = data?.blocks ?? [];

  if (!blocks.length) {
    if (loading) return null; // nothing to show on first load; stay quiet
    return (
      <InsightCard eyebrow="FitVibe insight" title="Vaidya is warming up">
        <Text style={styles.body}>
          Your daily insight will appear here once Vaidya has read today's signals.
        </Text>
      </InsightCard>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <View pointerEvents="box-none">
        <BlockList blocks={blocks} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
});
