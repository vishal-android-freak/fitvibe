import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AIGradient } from '@/components/ai/AIGradient';
import { accent, ai, border, font, fontSize, glow, motion, radius, surface, text } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ai';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const SIZES: Record<Size, { height: number; padding: number; font: number; radius: number }> = {
  sm: { height: 36, padding: 14, font: fontSize.sm, radius: radius.md },
  md: { height: 46, padding: 20, font: fontSize.md, radius: radius.md },
  lg: { height: 54, padding: 26, font: fontSize.lg, radius: radius.lg },
};

/** Pillowy, sporty CTA. `variant="ai"` paints the signature AI gradient. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft,
  iconRight,
  onPress,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const s = SIZES[size];
  const isAI = variant === 'ai';

  const fg =
    variant === 'ai'
      ? ai.onGradient
      : variant === 'primary'
        ? text.onAccent
        : variant === 'secondary'
          ? text.primary
          : text.secondary;

  const containerStyle: ViewStyle = {
    height: s.height,
    paddingHorizontal: s.padding,
    borderRadius: s.radius,
    width: block ? '100%' : undefined,
    opacity: disabled ? 0.45 : 1,
    ...(variant === 'primary' && { backgroundColor: accent.base, ...glow.accent }),
    ...(variant === 'secondary' && {
      backgroundColor: surface.raised,
      borderWidth: 1,
      borderColor: border.strong,
    }),
    ...(variant === 'ghost' && { backgroundColor: 'transparent' }),
    ...(isAI && glow.ai),
  };

  const inner = (
    <View style={styles.row}>
      {iconLeft}
      {typeof children === 'string' ? (
        <Text style={[styles.label, { color: fg, fontSize: s.font }]}>{children}</Text>
      ) : (
        children
      )}
      {iconRight}
    </View>
  );

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: motion.durFast }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: motion.durFast }))}
      style={[animStyle, style]}
    >
      {isAI ? (
        <AIGradient style={[styles.base, containerStyle]}>{inner}</AIGradient>
      ) : (
        <View style={[styles.base, containerStyle]}>{inner}</View>
      )}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: font.sansBold, letterSpacing: -0.2 },
});
