import React from 'react';
import { TrendCard } from '@/components';
import { hue } from '@/theme';
import { fmtH, type NightView } from './data';

/**
 * Recent-nights duration bars (real data) with average + consistency spread.
 * Tapping a bar shows a tooltip with that night's date and sleep duration.
 *
 * `nights` is newest-first; bars render oldest→newest, so the rightmost bar is
 * the latest night.
 */
export function WeeklyTrend({ nights }: { nights: NightView[] }) {
  // Most-recent 7, oldest → newest for the bar order.
  const chrono = nights.slice(0, 7).reverse();
  const durations = chrono.map((c) => c.dur);
  const labels = chrono.map((c) => c.day[0]);
  const tooltips = chrono.map((c) => `${c.day} · ${fmtH(c.dur)}`);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const spread = durations.length ? Math.round((Math.max(...durations) - Math.min(...durations)) / 2) : 0;

  return (
    <TrendCard
      data={durations}
      labels={labels}
      hue={hue.sleep}
      tooltips={tooltips}
      stats={[
        { label: `${durations.length}-night average`, value: fmtH(avg) },
        { label: 'consistency', value: `±${spread}m` },
      ]}
    />
  );
}
