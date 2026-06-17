import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme';

/** A Pressable that accepts reanimated styles — the one shared definition. */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The app's standard "press shrinks slightly" feedback. Spread the returned
 * `onPressIn`/`onPressOut` onto an {@link AnimatedPressable} and include
 * `animStyle` in its style array.
 */
export function usePressScale(to = 0.97) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    animStyle,
    onPressIn: () => {
      scale.value = withTiming(to, { duration: motion.durFast });
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: motion.durFast });
    },
  };
}
