import React from 'react';
import { ReadinessCard, type ReadinessFactor } from '@/components';
import { fmtStampClock, useToday } from '@/data/today';
import { fmtMin } from '@/data/mock';
import { hue } from '@/theme';

/** Hero page 1 — readiness score ring + today's headline stats (steps, current
 *  heart rate, last night's sleep). */
export function ReadinessPage() {
  const { data } = useToday();
  const today = data?.summary ?? null;
  const night = data?.sleep ?? null;

  const readiness = data?.readiness ?? null;

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

  const score = readiness?.value ?? null;
  return (
    <ReadinessCard
      score={score ?? 0}
      hue={readinessHue(readiness?.band)}
      caption={readinessCaption(score, readiness?.band)}
      factors={factors}
    />
  );
}

/** Band → ring hue. Falls back to the neutral accent while warming up. */
function readinessHue(band?: string): string | undefined {
  switch (band) {
    case 'High':
      return hue.move;
    case 'Moderate':
      return hue.energy;
    case 'Low':
      return hue.heart;
    default:
      return undefined; // ReadinessCard's default accent
  }
}

/** Caption under the ring: band-driven, or a warming-up note when no score yet. */
function readinessCaption(score: number | null, band?: string): string {
  if (score === null) return 'WARMING UP';
  switch (band) {
    case 'High':
      return 'READY TO PUSH';
    case 'Moderate':
      return 'TAKE IT STEADY';
    case 'Low':
      return 'PRIORITIZE RECOVERY';
    default:
      return 'READINESS';
  }
}
