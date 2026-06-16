import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { surface } from '@/theme';

/**
 * The app field: deep-ink canvas + a subtle radial vitality wash (faint green
 * top-left, sky/violet top-right). Used as the screen backdrop. No busy
 * patterns — restraint on dark.
 */
export function FieldGlow({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="g1" cx="8%" cy="2%" r="55%">
            <Stop offset="0" stopColor="#4ADE80" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#4ADE80" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="98%" cy="0%" r="55%">
            <Stop offset="0" stopColor="#22D3EE" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#22D3EE" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g2)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.bgApp },
});
