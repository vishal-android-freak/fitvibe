import React from 'react';
import { ReadinessCard, type ReadinessFactor } from '@/components';
import { hue } from '@/theme';

const FACTORS: ReadinessFactor[] = [
  { icon: 'activity', hue: hue.mind, label: 'HRV', value: '62 ms', delta: '▲ 12%', good: true },
  { icon: 'heart', hue: hue.heart, label: 'Resting HR', value: '54 bpm', delta: '▼ 3', good: true },
  { icon: 'moon', hue: hue.sleep, label: 'Sleep', value: '7h 12m', delta: 'good', good: true },
];

/** Hero page 1 — readiness score ring + the factors behind it. */
export function ReadinessPage() {
  return <ReadinessCard score={86} factors={FACTORS} />;
}
