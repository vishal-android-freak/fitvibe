import React from 'react';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** The FitVibe app icon — a ring + heartbeat wave in the AI gradient on dark ink. */
export function AppIcon({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" fill="none">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#0F1726" />
          <Stop offset="1" stopColor="#070B14" />
        </LinearGradient>
        <LinearGradient id="stroke" x1="34" y1="40" x2="150" y2="150" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#4ADE80" />
          <Stop offset="0.5" stopColor="#38E0D8" />
          <Stop offset="1" stopColor="#60A5FA" />
        </LinearGradient>
        <RadialGradient id="glow" cx="0.32" cy="0.2" r="0.9">
          <Stop stopColor="#4ADE80" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#4ADE80" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={180} height={180} rx={44} fill="url(#bg)" />
      <Rect width={180} height={180} rx={44} fill="url(#glow)" />
      <Path d="M90 32 a58 58 0 1 1 -41 17" stroke="url(#stroke)" strokeWidth={16} strokeLinecap="round" fill="none" />
      <Path
        d="M52 90 H73 l8 -24 l15 48 l8 -24 H128"
        stroke="url(#stroke)"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
