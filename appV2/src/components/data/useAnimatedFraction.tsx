import { useEffect } from 'react';
import {
  type SharedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme';
import { easeOut } from '@/theme/easing';

/**
 * A shared value that eases from 0 up to `target` on mount and whenever `target`
 * changes, using the app's standard slow ease-out. Respects reduced motion by
 * jumping straight to the value. This is the one place chart-fill animation
 * (ring dashoffset, gauge sweep, bar height) is defined.
 */
export function useAnimatedFraction(target: number): SharedValue<number> {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? target : 0);
  useEffect(() => {
    if (reduced) progress.value = target;
    else progress.value = withTiming(target, { duration: motion.durSlow, easing: easeOut });
  }, [target, reduced, progress]);
  return progress;
}
