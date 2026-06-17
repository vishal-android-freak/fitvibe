import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { font, text as textColor } from '@/theme';

/**
 * The full FitVibe wordmark — the gradient mark + "FitVibe" (with "Vibe" in the
 * brand gradient). Drawn as one SVG so it scales crisply; `height` sets the size.
 */
export function Wordmark({ height = 32 }: { height?: number }) {
  const scale = height / 80;
  return (
    <Svg width={300 * scale} height={height} viewBox="0 0 300 80" fill="none">
      <Defs>
        <LinearGradient id="fvWord" x1="10" y1="14" x2="62" y2="66" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#4ADE80" />
          <Stop offset="0.5" stopColor="#38E0D8" />
          <Stop offset="1" stopColor="#60A5FA" />
        </LinearGradient>
      </Defs>
      <Path d="M40 12 a28 28 0 1 1 -19.8 8.2" stroke="url(#fvWord)" strokeWidth={9} strokeLinecap="round" fill="none" transform="translate(-8,0)" />
      <Path
        d="M23 40 H34 l4 -12 l7.5 24 l4 -12 H58"
        stroke="url(#fvWord)"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        transform="translate(-8,0)"
      />
      <SvgText x={86} y={52} fontFamily={font.display} fontSize={38} fontWeight="700" letterSpacing={-1.2} fill={textColor.primary}>
        Fit
        <TSpan fill="url(#fvWord)">Vibe</TSpan>
      </SvgText>
    </Svg>
  );
}
