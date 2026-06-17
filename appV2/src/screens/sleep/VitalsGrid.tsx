import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, Sparkline, type IconName } from '@/components';
import { border, font, fontSize, hue, mix, radius, status, surface, text, tint } from '@/theme';
import type { NightVitals } from '@/data/sleep';
import type { NightView } from './data';

/** A vital we render as a row: how to read it off NightVitals + display config. */
interface VitalDef {
  key: keyof NightVitals;
  label: string;
  unit: string;
  hue: string;
  icon: IconName;
  /** Whether a HIGHER value is the "good" direction (drives delta color). */
  higherIsBetter: boolean;
  digits?: number;
  signed?: boolean; // explicit +/- (skin-temp delta)
}

const VITALS: VitalDef[] = [
  { key: 'rhr', label: 'Resting HR', unit: 'bpm', hue: hue.heart, icon: 'heart', higherIsBetter: false },
  { key: 'hrv', label: 'HRV', unit: 'ms', hue: hue.mind, icon: 'activity', higherIsBetter: true, digits: 0 },
  { key: 'spo2', label: 'SpO₂', unit: '%', hue: hue.oxygen, icon: 'wind', higherIsBetter: true, digits: 0 },
  { key: 'respiratoryRate', label: 'Breathing', unit: 'br/min', hue: hue.sky, icon: 'wind', higherIsBetter: false, digits: 1 },
  { key: 'skinTempDelta', label: 'Skin temp', unit: '°C', hue: hue.energy, icon: 'thermometer', higherIsBetter: false, digits: 1, signed: true },
];

function fmtVal(v: number, def: VitalDef): string {
  const s = def.digits != null ? v.toFixed(def.digits) : String(Math.round(v));
  return def.signed && v > 0 ? `+${s}` : s;
}

interface RowModel {
  def: VitalDef;
  value: string | null;
  qualifier: string | null; // e.g. "avg" when the selected night has no reading
  series: number[];
  delta: string | null;
  deltaGood: boolean;
}

/** One full-width vital row: icon + label, trend sparkline, value + delta/avg. */
function VitalRow({ row }: { row: RowModel }) {
  const { def, value, qualifier, series, delta, deltaGood } = row;
  const has = value !== null;
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: tint(def.hue, 0.16) }]}>
        <Icon name={def.icon} size={16} color={has ? def.hue : text.tertiary} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {def.label}
      </Text>

      {series.length >= 2 ? (
        <Sparkline data={series} hue={def.hue} width={84} height={28} style={styles.spark} />
      ) : (
        <View style={styles.spark} />
      )}

      <View style={styles.valueCol}>
        <Text style={[styles.value, !has && styles.dim]} numberOfLines={1}>
          {has ? value : '—'}
          {has ? <Text style={styles.unit}> {def.unit}</Text> : null}
        </Text>
        {qualifier ? (
          <Text style={styles.qualifier} numberOfLines={1}>
            {qualifier}
          </Text>
        ) : delta ? (
          <Text style={[styles.delta, { color: deltaGood ? status.positive : status.danger }]} numberOfLines={1}>
            {delta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Overnight vitals as a full-width COLUMN of rows for the selected night. Each
 * row's sparkline is the REAL last-N-nights series for that vital; the delta
 * compares the selected night to the baseline (mean of the prior nights),
 * colored by whether the move is favorable.
 */
export function VitalsGrid({ nights, idx }: { nights: NightView[]; idx: number }) {
  // Trailing 7 nights ending at the selected one (oldest → newest), so the
  // sparkline + baseline reflect a consistent recent window like WeeklyTrend.
  const window = nights.slice(idx, idx + 7).reverse();
  const selected = nights[idx];

  const rows: RowModel[] = VITALS.map((def) => {
    const series = window.map((n) => n.raw.vitals[def.key]).filter((x): x is number => x != null);
    const current = selected.raw.vitals[def.key];

    // The selected night's reading isn't in yet (daily vitals publish later in
    // the day) but we have recent history: show the window average, like the
    // Health app, rather than a bare "—".
    if (current == null) {
      if (series.length === 0) {
        return { def, value: null, qualifier: null, series, delta: null, deltaGood: false };
      }
      const avg = series.reduce((a, b) => a + b, 0) / series.length;
      return { def, value: fmtVal(avg, def), qualifier: 'avg', series, delta: null, deltaGood: false };
    }

    let delta: string | null = null;
    let deltaGood = false;
    const prior = series.slice(0, -1);
    if (prior.length > 0) {
      const baseline = prior.reduce((a, b) => a + b, 0) / prior.length;
      const diff = current - baseline;
      if (Math.abs(diff) >= (def.digits ? 0.05 : 0.5)) {
        const up = diff > 0;
        const mag = def.digits != null ? Math.abs(diff).toFixed(def.digits) : String(Math.round(Math.abs(diff)));
        delta = `${up ? '▲' : '▼'} ${mag} vs avg`;
        deltaGood = up === def.higherIsBetter;
      }
    }
    return { def, value: fmtVal(current, def), qualifier: null, series, delta, deltaGood };
  });

  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={row.def.key} style={i > 0 && styles.divider}>
          <VitalRow row={row} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  divider: { borderTopWidth: 1, borderTopColor: mix(border.subtle, 0.5, surface.card) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  iconBox: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { width: 96, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  spark: { flex: 1, height: 28, justifyContent: 'center' },
  valueCol: { width: 96, alignItems: 'flex-end' },
  value: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary, lineHeight: Math.round(fontSize.lg * 1.18) },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.muted },
  dim: { color: text.muted },
  delta: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], marginTop: 1 },
  qualifier: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'], color: text.tertiary, marginTop: 1 },
});
