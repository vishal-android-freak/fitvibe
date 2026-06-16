import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { GoogleMark } from './GoogleMark';
import { Spinner } from '@/components/Spinner';
import { font, fontSize, motion, shadow } from '@/theme';

export interface GoogleButtonProps {
  onPress?: () => void;
  label?: string;
  busy?: boolean;
}

/** The white "Continue with Google" trigger shown on the dark welcome. */
export function GoogleButton({ onPress, label = 'Continue with Google', busy = false }: GoogleButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: motion.durFast }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: motion.durFast }))}
      style={[styles.button, busy && { opacity: 0.7 }, animStyle]}
    >
      {busy ? <Spinner size={20} color="#1F2024" /> : <GoogleMark size={22} />}
      <Text style={styles.label}>{busy ? 'Opening Google…' : label}</Text>
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    ...shadow.lg,
  },
  label: { fontFamily: font.sansBold, fontSize: fontSize.md, color: '#1F2024', letterSpacing: -0.15 },
});
