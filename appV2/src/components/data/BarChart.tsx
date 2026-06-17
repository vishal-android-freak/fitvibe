import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { accent, border, font, fontSize, motion, radius, surface, text, tint } from '@/theme';
import { easeOut } from '@/theme/easing';

export interface BarChartProps {
  data: number[];
  labels?: string[];
  hue?: string;
  height?: number;
  goal?: number;
  highlightMax?: boolean;
  /** One tooltip string per bar. When set, bars are tappable and tapping one
   *  shows a tooltip over it (tap again, or another bar, to move/dismiss it). */
  tooltips?: string[];
  style?: ViewStyle;
}

/** Vertical bars for daily/weekly trends. The tallest bar glows; bars grow from
 *  0. Pass `tooltips` to let the user tap a bar and read its value in a popover. */
export function BarChart({
  data,
  labels = [],
  hue = accent.base,
  height = 140,
  goal,
  highlightMax = true,
  tooltips,
  style,
}: BarChartProps) {
  const max = Math.max(...data, goal || 0) || 1;
  const maxIdx = data.indexOf(Math.max(...data));
  // Locally-tracked tapped bar (tooltip target); null when none is open.
  const [selected, setSelected] = useState<number | null>(null);
  const interactive = tooltips != null;
  // A tapped bar (if any) takes the highlight; otherwise the tallest one glows.
  const litIdx = selected != null ? selected : highlightMax ? maxIdx : -1;

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
              tooltip={selected === i ? tooltips?.[i] : undefined}
              onPress={interactive ? () => setSelected((s) => (s === i ? null : i)) : undefined}
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
  tooltip,
  onPress,
}: {
  pct: number;
  color: string;
  glow: boolean;
  tooltip?: string;
  onPress?: () => void;
}) {
  const reduced = useReducedMotion();
  const h = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) h.value = pct;
    else h.value = withTiming(pct, { duration: motion.durSlow, easing: easeOut });
  }, [pct, reduced, h]);

  const animStyle = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  // The tooltip is anchored to the bar's top edge (bottom: '100%' of the bar
  // wrapper) so it floats just above the bar tip regardless of the bar height.
  const inner = (
    <Animated.View style={[styles.barWrap, animStyle]}>
      {tooltip != null && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText} numberOfLines={1}>
            {tooltip}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.bar,
          { backgroundColor: color },
          glow && { shadowColor: color, shadowOpacity: 0.5, shadowRadius: 14, elevation: 6 },
        ]}
      />
    </Animated.View>
  );

  // The whole column is the touch target so the empty space above a short bar
  // is tappable too — much easier to hit than the bar alone.
  if (onPress) {
    return (
      <Pressable style={styles.barCol} onPress={onPress} hitSlop={6}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.barCol}>{inner}</View>;
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  barWrap: { width: '100%' },
  bar: { width: '100%', height: '100%', borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    alignSelf: 'center',
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: surface.raised,
    borderWidth: 1,
    borderColor: border.strong,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  tooltipText: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'], color: text.primary, textAlign: 'center' },
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
