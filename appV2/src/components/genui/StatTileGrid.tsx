import React from 'react';
import { type DimensionValue, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { StatTile } from '@/components/data/StatTile';

export interface StatTileSpec {
  label: string;
  value: string | number;
  unit?: string;
  hue: string;
  icon?: IconName;
  delta?: string;
  deltaDir?: 'up' | 'down';
  goal?: string;
  spark?: number[];
}

export interface StatTileGridProps {
  tiles: StatTileSpec[];
  /** tiles per row (default 2) */
  columns?: number;
  style?: ViewStyle;
}

/** A responsive grid of StatTiles from a data array. Generative-UI block. */
export function StatTileGrid({ tiles, columns = 2, style }: StatTileGridProps) {
  const basis = `${Math.floor(100 / columns) - 3}%` as DimensionValue;
  return (
    <View style={[styles.grid, style]}>
      {tiles.map((t) => (
        <View key={t.label} style={[styles.cell, { width: basis }]}>
          <StatTile
            label={t.label}
            value={t.value}
            unit={t.unit}
            hue={t.hue}
            icon={t.icon ? <Icon name={t.icon} size={16} color={t.hue} /> : undefined}
            delta={t.delta}
            deltaDir={t.deltaDir}
            goal={t.goal}
            spark={t.spark}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexGrow: 1 },
});
