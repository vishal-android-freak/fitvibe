import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { font, fontSize, text as textColor } from '@/theme';

/** A run of body text; `b` marks an emphasized (bold) metric span. */
export interface Seg {
  t: string;
  b?: boolean;
}

/**
 * Renders AI body copy as `Seg[]` with bolded metric spans — the shape insights
 * and analyses use so numbers/metrics stand out. `style` styles the base run;
 * bold spans layer on the strong weight + primary color.
 */
export function RichText({ segs, style }: { segs: Seg[]; style?: StyleProp<TextStyle> }) {
  // Base style first so non-bold runs always get a readable color/font even when
  // the caller passes no `style` (otherwise RN defaults to black). Caller `style`
  // overrides the defaults.
  return (
    <Text style={[styles.base, style]}>
      {segs.map((s, i) => (
        <Text key={i} style={s.b ? styles.bold : undefined}>
          {s.t}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: font.sansRegular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.6,
    color: textColor.secondary,
  },
  bold: { fontFamily: font.sansBold, color: textColor.primary },
});
