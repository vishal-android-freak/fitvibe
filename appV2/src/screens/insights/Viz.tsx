import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, Icon, ProgressRing, Sparkline } from '@/components';
import { ai, font, fontSize, ringTrack, text } from '@/theme';
import type { Viz as VizModel } from './data';

function StreakDots({ filled, total, hue }: { filled: number; total: number; hue: string }) {
  return (
    <View style={styles.streak}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        return (
          <View key={i} style={[styles.streakDot, { backgroundColor: on ? hue : ringTrack }, on && { shadowColor: hue, shadowOpacity: 0.55, shadowRadius: 10, elevation: 4 }]}>
            {on && <Icon name="check" size={16} strokeWidth={3} color={ai.onGradient} />}
          </View>
        );
      })}
    </View>
  );
}

function MiniRing({ value, hue, center }: { value: number; hue: string; center: string }) {
  return (
    <View style={styles.ring}>
      <ProgressRing value={value} hue={hue} size={92} thickness={10}>
        <Text style={styles.ringCenter}>{center}</Text>
      </ProgressRing>
    </View>
  );
}

/** Renders an insight's inline mini-visualization by kind. */
export function Viz({ viz }: { viz: VizModel }) {
  let el: React.ReactNode = null;
  if (viz.kind === 'spark') el = <Sparkline data={viz.data} hue={viz.hue} height={50} />;
  else if (viz.kind === 'bars') el = <BarChart data={viz.data} labels={viz.labels} hue={viz.hue} height={76} />;
  else if (viz.kind === 'streak') el = <StreakDots filled={viz.filled} total={viz.total} hue={viz.hue} />;
  else if (viz.kind === 'ring') el = <MiniRing value={viz.value} hue={viz.hue} center={viz.center} />;
  return <View style={styles.wrap}>{el}</View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, marginBottom: 2 },
  streak: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  streakDot: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ring: { alignItems: 'center' },
  ringCenter: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
});
