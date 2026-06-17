import React from 'react';
import { TrendCard } from '@/components';
import { hue } from '@/theme';
import { NIGHTS, fmtH } from './data';

// Oldest → newest, derived once.
const CHRONO = [...NIGHTS].reverse();
const DURATIONS = CHRONO.map((n) => n.dur);
const LABELS = CHRONO.map((n) => n.day[0]);
const AVG = Math.round(DURATIONS.reduce((a, b) => a + b, 0) / DURATIONS.length);
const SPREAD = Math.round((Math.max(...DURATIONS) - Math.min(...DURATIONS)) / 2);

/** Last-7-nights duration bars with average + consistency spread. */
export function WeeklyTrend() {
  return (
    <TrendCard
      data={DURATIONS}
      labels={LABELS}
      hue={hue.sleep}
      stats={[
        { label: '7-night average', value: fmtH(AVG) },
        { label: 'consistency', value: `±${SPREAD}m` },
      ]}
    />
  );
}
