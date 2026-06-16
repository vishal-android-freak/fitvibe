import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { accent, border, font, fontSize, glow, surface, text } from '@/theme';

export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  iconLeft?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Filter / quick-prompt pill. Fills with accent when selected. */
export function Chip({ children, selected = false, iconLeft, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        selected
          ? { backgroundColor: accent.base, ...glow.accent }
          : { backgroundColor: surface.raised, borderWidth: 1, borderColor: border.strong },
        style,
      ]}
    >
      {iconLeft}
      <Text style={[styles.label, { color: selected ? text.onAccent : text.secondary }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.sm },
});
