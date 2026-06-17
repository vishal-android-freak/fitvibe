import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, InsightCard } from '@/components';
import { font, fontSize, text } from '@/theme';
import { fmtH, type Night } from './data';

/** Per-night FitVibe sleep insight; taps through to the rich analysis. */
export function SleepInsight({ night, onPress }: { night: Night; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <InsightCard eyebrow="FitVibe insight" title="Strong recovery, but a late bedtime">
        <Text style={styles.body}>
          You slept {fmtH(night.dur)} with deep sleep up 18% and HRV at {night.hrv} ms. A late lights-out trimmed
          your final REM cycle — aim for an earlier wind-down tonight.
        </Text>
        <View style={styles.badges}>
          <Badge hue="sleep">Deep ▲ 18%</Badge>
          <Badge hue="mind">HRV {night.hrv} ms</Badge>
        </View>
      </InsightCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  badges: { flexDirection: 'row', gap: 7, marginTop: 13, flexWrap: 'wrap' },
});
