import React, { useState } from 'react';
import { type DimensionValue, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { accent, border, font, fontSize, radius, surface, text, tint } from '@/theme';
import { useAnimatedFraction } from './useAnimatedFraction';

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
  // When interactive, only the tapped bar glows (and nothing once dismissed) —
  // otherwise dismissing a tooltip would make the tallest bar look "selected".
  // Non-interactive charts keep the tallest-bar highlight.
  const litIdx = interactive ? (selected ?? -1) : highlightMax ? maxIdx : -1;

  // Center of the selected column as a fraction of the row width (columns are
  // evenly spaced via flex: 1), so the chart-level tooltip can sit over it.
  const tipLeft: DimensionValue =
    selected != null && data.length ? `${((selected + 0.5) / data.length) * 100}%` : '0%';

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
              onPress={interactive ? () => setSelected((s) => (s === i ? null : i)) : undefined}
            />
          );
        })}
        {/* One tooltip at the chart level so it isn't clipped by a bar column's
            narrow width; placed at the selected column's center and shifted
            back by half its own width so it stays centered at any text length. */}
        {selected != null && tooltips?.[selected] != null && (
          <View style={[styles.tooltip, { left: tipLeft }]} pointerEvents="none">
            <Text style={styles.tooltipText} numberOfLines={1}>
              {tooltips[selected]}
            </Text>
          </View>
        )}
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
  const h = useAnimatedFraction(pct);
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
  // Content-sized box at the selected column's center; translateX(-50%) pulls
  // it back by half its own width so it stays centered at any text length.
  // alignSelf: flex-start stops it from stretching to the row width.
  tooltip: {
    position: 'absolute',
    top: 0,
    alignSelf: 'flex-start',
    transform: [{ translateX: '-50%' }],
    paddingHorizontal: 10,
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
