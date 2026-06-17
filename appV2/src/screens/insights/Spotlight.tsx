import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, InsightCard } from '@/components';
import { RecoverySignals } from '@/components/genui/RecoverySignals';
import { accent, font, fontSize, glass, text } from '@/theme';
import { SPOTLIGHT } from './data';
import { Provenance } from './Provenance';

/** "Insight of the week" — featured insight with recovery viz + provenance. */
export function Spotlight({ onAsk }: { onAsk: (seed: string) => void }) {
  return (
    <Pressable onPress={() => onAsk(SPOTLIGHT.seed)}>
      <InsightCard eyebrow="Insight of the week" title={SPOTLIGHT.title}>
        <Text style={styles.body}>
          {SPOTLIGHT.body.map((s, i) => (
            <Text key={i} style={s.b ? styles.bold : undefined}>
              {s.t}
            </Text>
          ))}
        </Text>
        <View style={styles.signals}>
          <RecoverySignals />
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
  bold: { fontFamily: font.sansBold, color: text.primary },
  signals: { marginTop: 14 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
  askText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: accent.base },
});
