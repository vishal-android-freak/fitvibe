import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** The FitVibe mark — a gradient ring + heartbeat wave, no background. */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Defs>
        <LinearGradient id="fvMark" x1="14" y1="16" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#4ADE80" />
          <Stop offset="0.5" stopColor="#38E0D8" />
          <Stop offset="1" stopColor="#60A5FA" />
        </LinearGradient>
      </Defs>
      <Path d="M48 14 a34 34 0 1 1 -24.04 9.96" stroke="url(#fvMark)" strokeWidth={11} strokeLinecap="round" fill="none" />
      <Path d="M26 48 H39 l5 -15 l9 30 l5 -15 H70" stroke="url(#fvMark)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
