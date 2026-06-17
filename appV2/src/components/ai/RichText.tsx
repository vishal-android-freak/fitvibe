import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { font, text as textColor } from '@/theme';

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
  return (
    <Text style={style}>
      {segs.map((s, i) => (
        <Text key={i} style={s.b ? styles.bold : undefined}>
          {s.t}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontFamily: font.sansBold, color: textColor.primary },
});
