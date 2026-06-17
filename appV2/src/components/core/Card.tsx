import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AIGradient } from '@/components/ai/AIGradient';
import { AnimatedPressable } from '@/components/core/AnimatedPressable';
import { border, glow, motion, radius, shadow, space, surface } from '@/theme';

type Tone = 'default' | 'raised' | 'inset' | 'ai';
type Pad = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  children?: React.ReactNode;
  tone?: Tone;
  pad?: Pad;
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const PADS: Record<Pad, number> = {
  none: 0,
  sm: space[3],
  md: space[4],
  lg: space[5], // card-pad
  xl: space[6],
};

/**
 * The pillowy workhorse surface (28px radius). `tone="ai"` paints the signature
 * gradient hairline border + glow for AI moments — implemented as a gradient
 * backdrop with the card surface inset by 1px (RN has no gradient borders).
 */
export function Card({ children, tone = 'default', pad = 'lg', interactive, onPress, style }: CardProps) {
  const lift = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  const padding = PADS[pad];

  if (tone === 'ai') {
    return (
      <AnimatedWrap interactive={interactive} onPress={onPress} lift={lift} animStyle={animStyle} style={style}>
        <AIGradient style={[styles.aiBorder, glow.ai]}>
          <View style={[styles.aiInner, { padding }]}>{children}</View>
        </AIGradient>
      </AnimatedWrap>
    );
  }

  const toneStyle: ViewStyle =
    tone === 'raised'
      ? { backgroundColor: surface.raised, ...shadow.lg, borderWidth: 1, borderColor: border.subtle }
      : tone === 'inset'
        ? { backgroundColor: surface.inset, borderWidth: 1, borderColor: border.subtle }
        : { backgroundColor: surface.card, ...shadow.md, borderWidth: 1, borderColor: border.subtle };

  return (
    <AnimatedWrap interactive={interactive} onPress={onPress} lift={lift} animStyle={animStyle} style={style}>
      <View style={[styles.base, toneStyle, { padding }]}>{children}</View>
    </AnimatedWrap>
  );
}

function AnimatedWrap({
  interactive,
  onPress,
  lift,
  animStyle,
  style,
  children,
}: {
  interactive?: boolean;
  onPress?: () => void;
  lift: ReturnType<typeof useSharedValue<number>>;
  animStyle: ReturnType<typeof useAnimatedStyle>;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  if (!interactive && !onPress) return <View style={style}>{children}</View>;
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (lift.value = withTiming(-2, { duration: motion.durBase }))}
      onPressOut={() => (lift.value = withTiming(0, { duration: motion.durBase }))}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.xl },
  aiBorder: { borderRadius: radius.xl, padding: 1 },
  aiInner: { borderRadius: radius.xl - 1, backgroundColor: surface.card },
});
