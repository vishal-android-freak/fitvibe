import React from 'react';
import { type ViewStyle } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { hue as hues } from '@/theme';

const DEFAULT_POINTS =
  '0,18 26,18 32,18 36,7 41,30 46,12 52,18 78,18 84,18 88,9 93,28 98,14 104,18 130,18 136,18 140,8 145,29 150,13 156,18 182,18 188,18 192,9 197,28 202,14 208,18 234,18';

export interface EcgTraceProps {
  color?: string;
  /** override the waveform polyline points (viewBox 234×36) */
  points?: string;
  height?: number;
  style?: ViewStyle;
}

/** A small ECG-style waveform trace. Generative-UI block. */
export function EcgTrace({ color = hues.heart, points = DEFAULT_POINTS, height = 36, style }: EcgTraceProps) {
  return (
    <Svg viewBox="0 0 234 36" width="100%" height={height} preserveAspectRatio="none" style={style}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
