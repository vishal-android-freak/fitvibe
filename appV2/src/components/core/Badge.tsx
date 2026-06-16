import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { font, fontSize, resolveHue, status, text, tint } from '@/theme';

type Tone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info' | 'accent';

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: Tone;
  /** metric hue token name (move/heart/sleep/…) or any color */
  hue?: string;
  solid?: boolean;
  style?: ViewStyle;
}

const TONE_COLOR: Record<Tone, string> = {
  neutral: text.muted,
  positive: status.positive,
  warning: status.warning,
  danger: status.danger,
  info: status.info,
  accent: '#A78BFA',
};

/** Tiny status/trend pill. `hue` colors it by metric; `tone` by semantic state. */
export function Badge({ children, tone = 'neutral', hue, solid = false, style }: BadgeProps) {
  const c = hue ? resolveHue(hue) : TONE_COLOR[tone];
  return (
    <View
      style={[
        styles.base,
        solid ? { backgroundColor: c } : { backgroundColor: tint(c, 0.16) },
        style,
      ]}
    >
      <Text style={[styles.label, { color: solid ? '#1a0b33' : c }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.4, lineHeight: 22 },
});
