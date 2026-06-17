import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { font, fontSize, tint } from '@/theme';

/** A small category-hued tag with an icon + label (e.g. an insight's type). */
export function TypeTag({ icon, label, color, style }: { icon: IconName; label: string; color: string; style?: ViewStyle }) {
  return (
    <View style={[styles.tag, { backgroundColor: tint(color, 0.15) }, style]}>
      <Icon name={icon} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  label: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.3 },
});
