import React from 'react';
import { ActivityRings, type ActivityRing } from '@/components';
import { hue } from '@/theme';

const RINGS: ActivityRing[] = [
  { key: 'move', hue: hue.move, value: 0.82, label: 'Move', current: '612', goal: '750' },
  { key: 'exercise', hue: hue.oxygen, value: 0.64, label: 'Exercise', current: '32', goal: '50' },
  { key: 'active', hue: hue.heart, value: 0.47, label: 'Active', current: '9', goal: '12' },
];

/** Hero page 2 — Apple-style activity rings (Move / Exercise / Active). */
export function RingsPage() {
  return <ActivityRings rings={RINGS} center="82%" />;
}
