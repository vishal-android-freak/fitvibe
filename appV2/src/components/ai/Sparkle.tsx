import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ai } from '@/theme';

/** The bespoke 4-point AI sparkle. Marks anything AI-generated. */
export function Sparkle({ size = 13, color = ai.onGradient }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l1.8 5.6a4 4 0 0 0 2.6 2.6L22 12l-5.6 1.8a4 4 0 0 0-2.6 2.6L12 22l-1.8-5.6a4 4 0 0 0-2.6-2.6L2 12l5.6-1.8a4 4 0 0 0 2.6-2.6L12 2z" />
    </Svg>
  );
}
