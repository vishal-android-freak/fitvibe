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
      <ProgressRing value={score / 100} hue={hue} size={156} thickness={14}>
        <Text style={styles.score}>{score}</Text>
        <Text style={[styles.caption, { color: hue }]}>{caption}</Text>
      </ProgressRing>
      <View style={styles.factors}>
        {factors.map((f) => (
          <View key={f.label} style={styles.factor}>
            <View style={styles.factorHead}>
              <Icon name={f.icon} size={13} color={f.hue} />
              <Text style={styles.factorLabel} numberOfLines={1}>
                {f.label}
              </Text>
            </View>
            <Text style={styles.factorVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {f.value}
            </Text>
            <Text style={[styles.factorDelta, { color: f.good ? status.positive : text.muted }]} numberOfLines={1}>
              {f.delta}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-width so the factor row spans the screen; alignItems only centers the
  // ring. Without an explicit width, the column collapses to the ring's width
  // and the factor tiles get squeezed into ~156px.
  wrap: { width: '100%', alignItems: 'center' },
  score: { fontFamily: font.display, fontSize: 42, color: text.primary, lineHeight: 50 },
  caption: { fontFamily: font.sansBold, fontSize: 9.5, marginTop: 3, letterSpacing: 0.7 },
  factors: { flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' },
  factor: { flex: 1, gap: 6, paddingHorizontal: 11, paddingVertical: 13, minHeight: 78, justifyContent: 'space-between', borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  factorHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factorLabel: { flex: 1, fontFamily: font.sansSemibold, fontSize: 10, letterSpacing: -0.2, color: text.tertiary },
  factorVal: { fontFamily: font.display, fontSize: 19, color: text.primary, lineHeight: 23 },
  factorDelta: { fontFamily: font.sansBold, fontSize: 10 },
});
