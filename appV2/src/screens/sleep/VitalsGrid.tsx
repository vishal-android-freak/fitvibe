import React from 'react';
import { StatTileGrid, type StatTileSpec } from '@/components';
import { hue } from '@/theme';
import type { NightVitals } from '@/data/sleep';
import type { NightView } from './data';

/** A vital we render as a tile: how to read it off NightVitals + display config. */
interface VitalDef {
  key: keyof NightVitals;
  label: string;
  unit: string;
  hue: string;
  icon: StatTileSpec['icon'];
  /** Whether a HIGHER value is the "good" direction (drives delta arrow color). */
  higherIsBetter: boolean;
  /** Decimal places for the displayed value. */
  digits?: number;
  /** Show an explicit +/- sign (for skin-temp delta). */
  signed?: boolean;
}

const VITALS: VitalDef[] = [
  { key: 'rhr', label: 'Resting HR', unit: 'bpm', hue: hue.heart, icon: 'heart', higherIsBetter: false },
  { key: 'hrv', label: 'HRV', unit: 'ms', hue: hue.mind, icon: 'activity', higherIsBetter: true, digits: 0 },
  { key: 'spo2', label: 'SpO₂', unit: '%', hue: hue.oxygen, icon: 'wind', higherIsBetter: true, digits: 0 },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: 'br/min', hue: hue.sky, icon: 'wind', higherIsBetter: false, digits: 1 },
  { key: 'skinTempDelta', label: 'Skin temp', unit: '°C', hue: hue.energy, icon: 'thermometer', higherIsBetter: false, digits: 1, signed: true },
];

function fmtVal(v: number, def: VitalDef): string {
  const s = def.digits != null ? v.toFixed(def.digits) : String(Math.round(v));
  return def.signed && v > 0 ? `+${s}` : s;
}

/**
 * Six overnight-vitals tiles for the selected night. Each sparkline is the REAL
 * last-N-nights series for that vital (chronological, ending at the selected
 * night), and the delta compares the selected night to the baseline (mean of
 * the other nights in view) — so the tiles signify an actual trend, not a
 * fabricated one.
 */
export function VitalsGrid({ nights, idx }: { nights: NightView[]; idx: number }) {
  // Chronological window up to & including the selected night (oldest → newest).
  const window = nights.slice(idx).reverse(); // nights is newest-first
  const selected = nights[idx];

  const tiles: StatTileSpec[] = VITALS.map((def) => {
    const series = window.map((n) => n.raw.vitals[def.key]).filter((x): x is number => x != null);
    const current = selected.raw.vitals[def.key];

    if (current == null) {
      return { label: def.label, value: '—', unit: def.unit, hue: def.hue, icon: def.icon };
    }

    const tile: StatTileSpec = {
      label: def.label,
      value: fmtVal(current, def),
      unit: def.unit,
      hue: def.hue,
      icon: def.icon,
    };
    if (series.length >= 2) tile.spark = series;

    // Delta vs baseline = mean of the prior nights (everything before current).
    const prior = series.slice(0, -1);
    if (prior.length > 0) {
      const baseline = prior.reduce((a, b) => a + b, 0) / prior.length;
      const diff = current - baseline;
      if (Math.abs(diff) >= (def.digits ? 0.05 : 0.5)) {
        const up = diff > 0;
        const mag = def.digits != null ? Math.abs(diff).toFixed(def.digits) : String(Math.round(Math.abs(diff)));
        // Sign in the text shows actual direction; color (deltaDir up=good/green,
        // down=bad/red) shows whether that move is favorable for this vital.
        tile.delta = `${up ? '+' : '−'}${mag} vs avg`;
        tile.deltaDir = up === def.higherIsBetter ? 'up' : 'down';
      }
    }
    return tile;
  });

  return <StatTileGrid tiles={tiles} />;
}
