import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, StatTile, type IconName } from '@/components';
import { hue } from '@/theme';
import type { Night } from './data';

/** Six overnight vitals tiles derived from the selected night. */
export function VitalsGrid({ night }: { night: Night }) {
  const tiles: {
    label: string;
    value: string;
    unit: string;
    hue: string;
    icon: IconName;
    delta?: string;
    deltaDir?: 'up' | 'down';
    spark: number[];
  }[] = [
    { label: 'Resting HR', value: String(night.rhr), unit: 'bpm', hue: hue.heart, icon: 'heart', spark: [52, 51, 50, 49, 49, 48, night.rhr] },
    { label: 'HRV', value: String(night.hrv), unit: 'ms', hue: hue.mind, icon: 'activity', delta: night.hrvDelta, deltaDir: 'up', spark: [54, 56, 55, 58, 60, 61, night.hrv] },
    { label: 'SpO₂', value: String(night.spo2), unit: '%', hue: hue.oxygen, icon: 'wind', spark: [96, 97, 96, 97, 98, 97, night.spo2] },
    { label: 'Respiratory rate', value: night.resp.toFixed(1), unit: 'br/min', hue: hue.sky, icon: 'wind', spark: [14.5, 14.2, 14.4, 14.1, 14.0, 14.3, night.resp] },
    { label: 'Skin temp', value: (night.skin > 0 ? '+' : '') + night.skin.toFixed(1), unit: '°C', hue: hue.energy, icon: 'thermometer', spark: [0.1, -0.1, 0.2, -0.2, 0.0, -0.1, night.skin] },
    { label: 'Restlessness', value: String(night.moves), unit: 'moves', hue: hue.move, icon: 'move', spark: [18, 22, 16, 24, 14, 19, night.moves] },
  ];
  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.cell}>
          <StatTile
            label={t.label}
            value={t.value}
            unit={t.unit}
            hue={t.hue}
            icon={<Icon name={t.icon} size={16} color={t.hue} />}
            delta={t.delta}
            deltaDir={t.deltaDir}
            spark={t.spark}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
});
