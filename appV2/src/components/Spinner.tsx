import React, { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

/** Indeterminate spinner — an arc rotating over a faint track ring. */
export function Spinner({ size = 22, color = '#1F2024', stroke = 2.6 }: { size?: number; color?: string; stroke?: number }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={stroke} />
        <Path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
