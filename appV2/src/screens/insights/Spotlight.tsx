import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, InsightCard, RecoverySignals, RichText, type RecoverySignal } from '@/components';
import { accent, font, fontSize, glass, hue, text } from '@/theme';
import { SPOTLIGHT } from './data';
import { Provenance } from './Provenance';

const RECOVERY_SIGNALS: RecoverySignal[] = [
  { label: 'Resting heart rate', value: '54', unit: 'bpm', hue: hue.heart, week: [58, 57, 57, 56, 55, 54, 54] },
  { label: 'Heart rate variability', value: '62', unit: 'ms', hue: hue.mind, week: [52, 55, 54, 58, 60, 61, 62] },
];

/** "Insight of the week" — featured insight with recovery viz + provenance. */
export function Spotlight({ onAsk }: { onAsk: (seed: string) => void }) {
  return (
    <Pressable onPress={() => onAsk(SPOTLIGHT.seed)}>
      <InsightCard eyebrow="Insight of the week" title={SPOTLIGHT.title}>
        <RichText segs={SPOTLIGHT.body} style={styles.body} />
        <View style={styles.signals}>
          <RecoverySignals signals={RECOVERY_SIGNALS} />
        </View>
        <Provenance items={SPOTLIGHT.prov} source={SPOTLIGHT.source} topBorder={glass.border} />
        <View style={styles.ask}>
          <Icon name="sparkles" size={14} color={accent.base} />
          <Text style={styles.askText}>Ask about this</Text>
        </View>
      </InsightCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  signals: { marginTop: 14 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
  askText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: accent.base },
});
