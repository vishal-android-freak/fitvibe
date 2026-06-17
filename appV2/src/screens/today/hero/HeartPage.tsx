import React from 'react';
import { HeartMetrics, type HeartTile } from '@/components';
import { hue } from '@/theme';

const TREND = [58, 57, 59, 56, 55, 54, 54];
const TILES: HeartTile[] = [
  { label: 'HRV', value: '62 ms', color: hue.mind },
  { label: 'Range', value: '48–142', color: hue.heart },
];

/** Hero page 3 — resting heart rate hero + sparkline + HRV/range tiles. */
export function HeartPage() {
  return <HeartMetrics bpm={54} trend={TREND} tiles={TILES} />;
}
