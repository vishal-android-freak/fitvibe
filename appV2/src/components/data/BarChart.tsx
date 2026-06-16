import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { accent, border, font, fontSize, motion, radius, text, tint } from '@/theme';
import { easeOut } from '@/theme/easing';

export interface BarChartProps {
  data: number[];
  labels?: string[];
  hue?: string;
  height?: number;
  goal?: number;
  highlightMax?: boolean;
  style?: ViewStyle;
}

/** Vertical bars for daily/weekly trends. Tallest bar glows; bars grow from 0. */
export function BarChart({
  data,
  labels = [],
  hue = accent.base,
  height = 140,
  goal,
  highlightMax = true,
  style,
}: BarChartProps) {
  const max = Math.max(...data, goal || 0) || 1;
  const maxIdx = data.indexOf(Math.max(...data));

  return (
    <View style={style}>
      <View style={[styles.bars, { height }]}>
        {goal != null && (
          <View style={[styles.goalLine, { bottom: `${(goal / max) * 100}%` }]} />
        )}
        {data.map((d, i) => {
          const isMax = highlightMax && i === maxIdx;
          return (
            <Bar
              key={i}
              pct={Math.max(0.02, d / max)}
              color={isMax ? hue : tint(hue, 0.3)}
              glow={isMax}
            />
          );
        })}
      </View>
      {labels.length > 0 && (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.label,
                { color: i === maxIdx && highlightMax ? text.secondary : text.tertiary },
              ]}
            >
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Bar({ pct, color, glow }: { pct: number; color: string; glow: boolean }) {
  const reduced = useReducedMotion();
  const h = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) h.value = pct;
    else h.value = withTiming(pct, { duration: motion.durSlow, easing: easeOut });
  }, [pct, reduced, h]);

  const animStyle = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  return (
    <View style={styles.barCol}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          glow && { shadowColor: color, shadowOpacity: 0.5, shadowRadius: 14, elevation: 6 },
          animStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderColor: border.strong,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  labels: { flexDirection: 'row', gap: 6, marginTop: 8 },
  label: { flex: 1, textAlign: 'center', fontFamily: font.sansSemibold, fontSize: fontSize['2xs'] },
});
