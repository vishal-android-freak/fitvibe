import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { accent, motion } from '@/theme';
import { easeOut } from '@/theme/easing';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface GaugeArcProps {
  value?: number; // 0..1
  size?: number;
  hue?: string;
  icon?: IconName;
}

const SWEEP = 270;
const START = -135;

/** A 270° score gauge with a gap at the bottom and a centered metric icon.
 *  The fill animates via stroke-dashoffset (worklet-safe numbers) over a fixed
 *  270° track path, rather than regenerating the SVG path string. */
export function GaugeArc({ value = 0.84, size = 84, hue = accent.base, icon = 'moon' }: GaugeArcProps) {
  const cx = size / 2;
  const r = cx - 9;
  const stroke = 9;

  const pt = (deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cx - r * Math.cos(a)];
  };
  const start = pt(START);
  const end = pt(START + SWEEP);
  const trackPath = `M ${start[0].toFixed(2)} ${start[1].toFixed(2)} A ${r} ${r} 0 1 1 ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;

  // Arc length of the 270° sweep; dashoffset hides the unfilled remainder.
  const arcLen = (2 * Math.PI * r * SWEEP) / 360;

  const pct = Math.max(0, Math.min(1, value));
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? pct : 0);

  useEffect(() => {
    if (reduced) progress.value = pct;
    else progress.value = withTiming(pct, { duration: motion.durSlow, easing: easeOut });
  }, [pct, reduced, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLen * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path d={trackPath} fill="none" stroke={hue} strokeOpacity={0.16} strokeWidth={stroke} strokeLinecap="round" />
        <AnimatedPath
          d={trackPath}
          fill="none"
          stroke={hue}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center}>
        <Icon name={icon} size={22} color={hue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
