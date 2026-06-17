import React from 'react';
import { TrendCard } from '@/components';
import { hue } from '@/theme';
import { fmtH, type NightView } from './data';

/**
 * Recent-nights duration bars (real data) with average + consistency spread.
 * Tapping a bar selects that night (drives the rest of the Sleep tab).
 *
 * `nights` is newest-first; bars render oldest→newest, so the rightmost bar is
 * the latest night. `selectedIdx` is in `nights` space (0 = latest).
 */
export function WeeklyTrend({
  nights,
  selectedIdx,
  onSelect,
}: {
  nights: NightView[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  // Most-recent 7, oldest → newest for the bar order.
  const chrono = nights.slice(0, 7).reverse();
  const n = chrono.length;
  const durations = chrono.map((c) => c.dur);
  const labels = chrono.map((c) => c.day[0]);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const spread = durations.length ? Math.round((Math.max(...durations) - Math.min(...durations)) / 2) : 0;

  // Map between display order (oldest→newest) and nights order (newest-first).
  const displayToNights = (i: number) => n - 1 - i;
  const selectedDisplay = n - 1 - selectedIdx;

  return (
    <TrendCard
      data={durations}
      labels={labels}
      hue={hue.sleep}
      selectedIndex={selectedDisplay}
      onBarPress={(i) => onSelect(displayToNights(i))}
      stats={[
        { label: `${durations.length}-night average`, value: fmtH(avg) },
        { label: 'consistency', value: `±${spread}m` },
      ]}
    />
  );
}
