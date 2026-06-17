import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, MiniRing, Sparkline, StreakDots } from '@/components';
import type { Viz as VizModel } from './data';

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
});
