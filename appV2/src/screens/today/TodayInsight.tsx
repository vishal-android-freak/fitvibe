import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, InsightCard } from '@/components';
import { font, fontSize, text } from '@/theme';

/** The Today "FitVibe insight" card; taps through to the rich analysis. */
export function TodayInsight({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <InsightCard eyebrow="FitVibe insight" title="Your recovery is trending up">
        <Text style={styles.body}>
          Resting HR dropped 3 bpm and HRV rose 12% this week — your training load looks well matched to recovery.
          Today's a good day for a harder session.
        </Text>
        <View style={styles.badges}>
          <Badge hue="mind">HRV ▲ 12%</Badge>
          <Badge hue="heart">Resting HR ▼ 3</Badge>
        </View>
      </InsightCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  badges: { flexDirection: 'row', gap: 7, marginTop: 13, flexWrap: 'wrap' },
});
