import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { AnimatedPressable, usePressScale } from '@/components/core/AnimatedPressable';
import { accent, border, glow, radius, surface } from '@/theme';

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
  const press = usePressScale(0.9);
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
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.base,
        { width: d, height: d, borderRadius: round ? 999 : radius.md, opacity: disabled ? 0.45 : 1 },
        variantStyle,
        press.animStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
