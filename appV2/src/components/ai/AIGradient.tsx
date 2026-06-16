import React from 'react';
import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { ai } from '@/theme';

/** The signature AI gradient as a fill. Reserved for AI / insight moments. */
export function AIGradient(props: Partial<LinearGradientProps> & { style?: any; children?: React.ReactNode }) {
  return (
    <LinearGradient
      colors={ai.gradient as unknown as readonly [string, string, ...string[]]}
      start={ai.gradientStart}
      end={ai.gradientEnd}
      {...props}
    />
  );
}
