import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { ai, ringTrack } from '@/theme';

export interface StreakDotsProps {
  filled: number;
  total: number;
  hue: string;
  style?: ViewStyle;
}

/** A row of completion dots — filled (with a check + glow) vs empty. Generative-UI block. */
export function StreakDots({ filled, total, hue, style }: StreakDotsProps) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: on ? hue : ringTrack }, on && { shadowColor: hue, shadowOpacity: 0.55, shadowRadius: 10, elevation: 4 }]}
          >
            {on && <Icon name="check" size={16} strokeWidth={3} color={ai.onGradient} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
