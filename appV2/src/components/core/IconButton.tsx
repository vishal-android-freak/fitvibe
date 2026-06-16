import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { accent, border, glow, motion, radius, surface } from '@/theme';

type Variant = 'ghost' | 'solid' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  round?: boolean;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const DIMS: Record<Size, number> = { sm: 36, md: 44, lg: 52 };

/** Icon-only button. Pass a Lucide icon node as children. */
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  round = true,
  active = false,
  disabled = false,
  label,
  onPress,
  style,
}: IconButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const d = DIMS[size];

  const variantStyle: ViewStyle =
    variant === 'solid'
      ? { backgroundColor: surface.raised, borderWidth: 1, borderColor: border.strong }
      : variant === 'accent'
        ? { backgroundColor: accent.base, ...glow.accent }
        : { backgroundColor: active ? accent.soft : 'transparent' };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && (scale.value = withTiming(0.9, { duration: motion.durFast }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: motion.durFast }))}
      style={[
        styles.base,
        { width: d, height: d, borderRadius: round ? 999 : radius.md, opacity: disabled ? 0.45 : 1 },
        variantStyle,
        animStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
