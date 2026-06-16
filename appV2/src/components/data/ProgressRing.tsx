import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { accent, motion, tint } from '@/theme';
import { easeOut } from '@/theme/easing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface Ring {
  value: number; // 0..1
  hue: string;
}

export interface ProgressRingProps {
  rings?: Ring[];
  value?: number;
  hue?: string;
  size?: number;
  thickness?: number;
  trackOpacity?: number;
  glow?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Concentric Apple-style activity rings — the signature FitVibe viz. Each ring
 * animates up from 0 on mount (respecting reduced motion) with a glowing cap.
 */
export function ProgressRing({
  rings,
  value,
  hue = accent.base,
  size = 160,
  thickness,
  trackOpacity = 0.16,
  glow = true,
  children,
  style,
}: ProgressRingProps) {
  const data = rings ?? [{ value: value ?? 0, hue }];
  const stroke = thickness ?? Math.max(8, size * 0.085);
  const gap = stroke * 0.55;
  const cx = size / 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {data.map((ring, i) => {
          const r = cx - stroke / 2 - i * (stroke + gap);
          if (r <= 0) return null;
          return (
            <RingArc
              key={i}
              cx={cx}
              r={r}
              stroke={stroke}
              color={ring.hue || hue}
              value={ring.value}
              trackOpacity={trackOpacity}
              glow={glow}
            />
          );
        })}
      </Svg>
      {children != null && <View style={styles.center}>{children}</View>}
    </View>
  );
}

function RingArc({
  cx,
  r,
  stroke,
  color,
  value,
  trackOpacity,
  glow,
}: {
  cx: number;
  r: number;
  stroke: number;
  color: string;
  value: number;
  trackOpacity: number;
  glow: boolean;
}) {
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? pct : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = pct;
    } else {
      progress.value = withTiming(pct, { duration: motion.durSlow, easing: easeOut });
    }
  }, [pct, reduced, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  return (
    <>
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeOpacity={trackOpacity} strokeWidth={stroke} />
      <AnimatedCircle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        animatedProps={animatedProps}
      />
      {glow ? (
        <AnimatedCircle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={tint(color, 0.35)}
          strokeWidth={stroke + 2}
          strokeLinecap="round"
          strokeDasharray={circ}
          animatedProps={animatedProps}
          opacity={0.5}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
