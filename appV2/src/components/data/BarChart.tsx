import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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
  /** When set, this bar is highlighted (overrides highlightMax) — for selection. */
  selectedIndex?: number;
  /** Makes bars tappable; called with the bar's index. */
  onBarPress?: (i: number) => void;
  style?: ViewStyle;
}

/** Vertical bars for daily/weekly trends. The highlighted bar glows; bars grow
 *  from 0. Pass selectedIndex + onBarPress to make it an interactive selector. */
export function BarChart({
  data,
  labels = [],
  hue = accent.base,
  height = 140,
  goal,
  highlightMax = true,
  selectedIndex,
  onBarPress,
  style,
}: BarChartProps) {
  const max = Math.max(...data, goal || 0) || 1;
  const maxIdx = data.indexOf(Math.max(...data));
  // A selection (if any) wins over the tallest-bar highlight.
  const hasSelection = selectedIndex != null;
  const litIdx = hasSelection ? selectedIndex : highlightMax ? maxIdx : -1;

  return (
    <View style={style}>
      <View style={[styles.bars, { height }]}>
        {goal != null && (
          <View style={[styles.goalLine, { bottom: `${(goal / max) * 100}%` }]} />
        )}
        {data.map((d, i) => {
          const lit = i === litIdx;
          return (
            <Bar
              key={i}
              pct={Math.max(0.02, d / max)}
              color={lit ? hue : tint(hue, 0.3)}
              glow={lit}
              onPress={onBarPress ? () => onBarPress(i) : undefined}
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
                { color: i === litIdx && litIdx >= 0 ? text.secondary : text.tertiary },
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

function Bar({
  pct,
  color,
  glow,
  onPress,
}: {
  pct: number;
  color: string;
  glow: boolean;
  onPress?: () => void;
}) {
  const reduced = useReducedMotion();
  const h = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) h.value = pct;
    else h.value = withTiming(pct, { duration: motion.durSlow, easing: easeOut });
  }, [pct, reduced, h]);

  const animStyle = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  const bar = (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color },
        glow && { shadowColor: color, shadowOpacity: 0.5, shadowRadius: 14, elevation: 6 },
        animStyle,
      ]}
    />
  );

  // The whole column is the touch target so the empty space above a short bar
  // is tappable too — much easier to hit than the bar alone.
  if (onPress) {
    return (
      <Pressable style={styles.barCol} onPress={onPress} hitSlop={6}>
        {bar}
      </Pressable>
    );
  }
  return <View style={styles.barCol}>{bar}</View>;
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
