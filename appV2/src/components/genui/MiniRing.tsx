import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ProgressRing } from '@/components/data/ProgressRing';
import { font, fontSize, text } from '@/theme';

export interface MiniRingProps {
  value: number; // 0..1
  hue: string;
  center: string;
  size?: number;
  style?: ViewStyle;
}

/** A compact progress ring with a centered figure. Generative-UI block. */
export function MiniRing({ value, hue, center, size = 92, style }: MiniRingProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ProgressRing value={value} hue={hue} size={size} thickness={10}>
        <Text style={styles.center}>{center}</Text>
      </ProgressRing>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
});
