import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { ProgressRing } from '@/components/data/ProgressRing';
import { accent, border, font, radius, status, surface, text } from '@/theme';

export interface ReadinessFactor {
  icon: IconName;
  hue: string;
  label: string;
  value: string;
  delta: string;
  good: boolean;
}

export interface ReadinessCardProps {
  score: number; // 0..100
  caption?: string;
  factors: ReadinessFactor[];
  hue?: string;
  style?: ViewStyle;
}

/** Readiness score ring + the factor tiles behind it. Generative-UI block. */
export function ReadinessCard({ score, caption = 'READY TO PUSH', factors, hue = accent.base, style }: ReadinessCardProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ProgressRing value={score / 100} hue={hue} size={172} thickness={15}>
        <Text style={styles.score}>{score}</Text>
        <Text style={[styles.caption, { color: hue }]}>{caption}</Text>
      </ProgressRing>
      <View style={styles.factors}>
        {factors.map((f) => (
          <View key={f.label} style={styles.factor}>
            <View style={styles.factorHead}>
              <Icon name={f.icon} size={13} color={f.hue} />
              <Text style={styles.factorLabel}>{f.label}</Text>
            </View>
            <Text style={styles.factorVal}>{f.value}</Text>
            <Text style={[styles.factorDelta, { color: f.good ? status.positive : text.muted }]}>{f.delta}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  score: { fontFamily: font.display, fontSize: 52, color: text.primary, lineHeight: 52 },
  caption: { fontFamily: font.sansBold, fontSize: 11, marginTop: 3, letterSpacing: 0.8 },
  factors: { flexDirection: 'row', gap: 7, marginTop: 18, alignSelf: 'stretch' },
  factor: { flex: 1, gap: 3, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  factorHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factorLabel: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  factorVal: { fontFamily: font.display, fontSize: 14, color: text.primary, lineHeight: 16 },
  factorDelta: { fontFamily: font.sansBold, fontSize: 10 },
});
