import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme';
import { easeOut } from '@/theme/easing';

/** Staggered entrance: fades + rises into place. Respects reduced motion. */
export function Rise({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) p.value = 1;
    else p.value = withDelay(delay, withTiming(1, { duration: motion.durSlow, easing: easeOut }));
  }, [delay, reduced, p]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 14 }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}
