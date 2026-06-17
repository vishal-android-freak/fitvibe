import React from 'react';
import { ScheduleCompare, type ScheduleItem } from '@/components';
import { hue } from '@/theme';
import { clk, delta, TARGET_BED, TARGET_WAKE, type NightView } from './data';

/** Bedtime & wake, actual vs target with deltas (wraps the genui block). */
export function ScheduleCard({ night }: { night: NightView }) {
  const items: ScheduleItem[] = [
    { icon: 'moon', hue: hue.sleep, label: 'Bedtime', actual: clk(night.bed), target: clk(TARGET_BED), delta: delta(night.bed, TARGET_BED) },
    { icon: 'sunrise', hue: hue.energy, label: 'Wake', actual: clk(night.wake), target: clk(TARGET_WAKE), delta: delta(night.wake, TARGET_WAKE) },
  ];
  return <ScheduleCompare items={items} />;
}
