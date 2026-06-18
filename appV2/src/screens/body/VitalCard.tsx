import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, Sparkline, type IconName } from '@/components';
import { border, font, fontSize, radius, surface, text, tint } from '@/theme';
import type { MetricCard } from '@/data/body';

/** Format a metric value for display (signed for deltas like skin-temp). */
function fmtVal(v: number, digits: number, signed: boolean): string {
  const s = digits > 0 ? v.toFixed(digits) : String(Math.round(v));
  return signed && v > 0 ? `+${s}` : s;
}

/**
 * A single vital/body metric: icon + label, big value + unit, a 30-day trend
 * sparkline, and a context line — the personal baseline ("your range") or a
 * population reference ("healthy …"). Renders an empty state when there's no
 * data yet (so the card still appears and fills in once the device records it).
 */
export function VitalCard({
  label,
  card,
  hue,
  icon,
  digits = 0,
  signed = false,
}: {
  label: string;
  card: MetricCard;
  hue: string;
  icon: IconName;
  digits?: number;
  signed?: boolean;
}) {
  const empty = card.latest == null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.iconBox, { backgroundColor: tint(hue, 0.16) }]}>
          <Icon name={icon} size={16} color={hue} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      {empty ? (
        <Text style={styles.empty}>No readings yet</Text>
      ) : (
        <>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{fmtVal(card.latest as number, digits, signed)}</Text>
            <Text style={styles.unit}>{card.unit}</Text>
          </View>
          {card.trend.length >= 2 ? (
            <Sparkline data={card.trend.map((p) => p.value)} hue={hue} height={36} />
          ) : null}
          <Context card={card} digits={digits} signed={signed} />
        </>
      )}
    </View>
  );
}

/** The context line beneath the trend: personal range, reference, or calibrating. */
function Context({ card, digits, signed }: { card: MetricCard; digits: number; signed: boolean }) {
  if (card.baseline) {
    if (!card.baseline.calibrated) {
      return <Text style={styles.context}>Building your baseline…</Text>;
    }
    const lo = card.baseline.mean - card.baseline.sd;
    const hi = card.baseline.mean + card.baseline.sd;
    return (
      <Text style={styles.context}>
        Your range {fmtVal(lo, digits, signed)}–{fmtVal(hi, digits, signed)} {card.unit}
      </Text>
    );
  }
  if (card.reference) {
    const { low, high } = card.reference;
    let txt = '';
    if (low != null && high != null) txt = `Healthy ${low}–${high} ${card.unit}`;
    else if (low != null) txt = `Healthy ${low}+ ${card.unit}`;
    else if (high != null) txt = `Healthy below ${high} ${card.unit}`;
    return txt ? <Text style={styles.context}>{txt}</Text> : null;
  }
  return null;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.muted },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' },
  value: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary, lineHeight: Math.round(fontSize['2xl'] * 1.15) },
  unit: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.muted, marginBottom: 4 },
  context: { fontFamily: font.sansRegular, fontSize: fontSize['2xs'], color: text.tertiary },
  empty: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, paddingVertical: 8 },
});
