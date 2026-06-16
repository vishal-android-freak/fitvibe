import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AIGradient } from '@/components/ai/AIGradient';
import { accent, ai, font, surface } from '@/theme';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  ring?: boolean;
  style?: ViewStyle;
}

/** Round avatar; gradient-initials fallback, optional accent ring. */
export function Avatar({ src, name = '', size = 40, ring = false, style }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ringStyle: ViewStyle = ring
    ? { borderWidth: 2, borderColor: accent.base, padding: 2, backgroundColor: surface.bgApp }
    : {};

  return (
    <View style={[{ borderRadius: 999 }, ringStyle, style]}>
      <AIGradient style={[styles.inner, { width: size, height: size, borderRadius: 999 }]}>
        {src ? (
          <Image source={{ uri: src }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        )}
      </AIGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: font.sansBold, color: ai.onGradient },
});
