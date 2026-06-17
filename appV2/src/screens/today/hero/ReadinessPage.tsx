import React from 'react';
import { ReadinessCard, type ReadinessFactor } from '@/components';
import { useLastNight } from '@/data/sleep';
import { fmtStampClock, useTodaySummary } from '@/data/today';
import { fmtMin } from '@/data/mock';
import { hue } from '@/theme';

/** Hero page 1 — readiness score ring + today's headline stats (steps, current
 *  heart rate, last night's sleep). */
export function ReadinessPage() {
  const { data: today } = useTodaySummary();
  const { data: night } = useLastNight();

  const factors: ReadinessFactor[] = [
    {
      icon: 'chart-no-axes-column',
      hue: hue.steps,
      label: 'Steps',
      value: today ? today.steps.toLocaleString() : '—',
      delta: 'today',
      good: !!today && today.steps > 0,
    },
    {
      icon: 'heart-pulse',
      hue: hue.heart,
      label: 'Heart Rate',
      value: today?.latestHeartRate ? `${Math.round(today.latestHeartRate.value)} bpm` : '—',
      delta: today?.latestHeartRate ? fmtStampClock(today.latestHeartRate) : 'no data',
      good: !!today?.latestHeartRate,
    },
    {
      icon: 'alarm-clock',
      hue: hue.sleep,
      label: 'Sleep',
      value: night ? fmtMin(night.asleepMinutes) : '—',
      delta: 'last night',
      good: !!night,
    },
  ];

  // Score still TODO (no readiness endpoint yet) — keep the sample value for now.
  return <ReadinessCard score={86} factors={factors} />;
}
