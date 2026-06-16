import React, { useId, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { accent } from '@/theme';

export interface SparklineProps {
  data: number[];
  hue?: string;
  /** fixed width; omit to fill the parent's width responsively */
  width?: number;
  height?: number;
  fill?: boolean;
  dot?: boolean;
  strokeWidth?: number;
  style?: ViewStyle;
}

/** Compact smooth trend line (Catmull-Rom → cubic bézier) + gradient fill + end dot. */
export function Sparkline({
  data,
  hue = accent.base,
  width,
  height = 40,
  fill = true,
  dot = true,
  strokeWidth = 2,
  style,
}: SparklineProps) {
  const [measured, setMeasured] = useState(0);
  const id = useId();
  const w = width ?? measured;

  const onLayout = (e: LayoutChangeEvent) => {
    if (width == null) setMeasured(e.nativeEvent.layout.width);
  };

  if (data.length < 2 || w <= 0) {
    return <View onLayout={onLayout} style={[{ width: width ?? '100%', height }, style]} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map<[number, number]>((d, i) => [pad + i * stepX, pad + (height - pad * 2) * (1 - (d - min) / span)]);

  let path = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  const end = pts[pts.length - 1];
  const gid = `sl-${id}`;

  return (
    <View onLayout={onLayout} style={[{ width: width ?? '100%', height }, style]}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={hue} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={hue} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill && <Path d={`${path} L ${end[0]},${height} L ${pts[0][0]},${height} Z`} fill={`url(#${gid})`} />}
        <Path d={path} fill="none" stroke={hue} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        {dot && <Circle cx={end[0]} cy={end[1]} r={strokeWidth + 1.4} fill={hue} />}
      </Svg>
    </View>
  );
}
