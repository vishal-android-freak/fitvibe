import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components';
import { fmtStampClock, useNutritionToday } from '@/data/today';
import { border, font, hue, radius, surface, text } from '@/theme';

interface Macro {
  key: string;
  icon: IconName;
  hue: string;
  label: string;
  value: number;
  unit: string;
}

/** A single stat tile; renders dimmed when its value is zero (nothing logged yet). */
function StatTile({ icon, hue: tint, label, value, unit }: Omit<Macro, 'key'>) {
  const empty = value <= 0;
  return (
    <View style={[styles.tile, empty && styles.tileEmpty]}>
      <View style={styles.tileHead}>
        <Icon name={icon} size={13} color={empty ? text.tertiary : tint} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileVal, empty && styles.dim]}>
        {Math.round(value)}
        <Text style={styles.tileUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

/** Hero page 2 — today's nutrition: calories eaten vs burnt, macro split, hydration. */
export function NutritionPage() {
  const { data } = useNutritionToday();
  const n = data ?? {
    caloriesEaten: 0,
    caloriesBurnt: 0,
    carbsGrams: 0,
    fatGrams: 0,
    proteinGrams: 0,
    hydrationMl: 0,
    lastUpdated: null,
  };
  const eatenEmpty = n.caloriesEaten <= 0;
  const asOf = n.lastUpdated ? fmtStampClock(n.lastUpdated) : null;

  const macros: Macro[] = [
    { key: 'carbs', icon: 'chart-no-axes-column', hue: hue.energy, label: 'Carbs', value: n.carbsGrams, unit: 'g' },
    { key: 'fat', icon: 'chart-no-axes-column', hue: hue.nutrition, label: 'Fat', value: n.fatGrams, unit: 'g' },
    { key: 'protein', icon: 'chart-no-axes-column', hue: hue.oxygen, label: 'Protein', value: n.proteinGrams, unit: 'g' },
  ];

  return (
    <View style={styles.wrap}>
      {/* Calories eaten hero, with burnt as a secondary read. */}
      <View style={styles.calRow}>
        <View style={styles.calMain}>
          <Text style={[styles.calValue, eatenEmpty && styles.dim]}>{Math.round(n.caloriesEaten)}</Text>
          <Text style={styles.calLabel}>
            CALORIES EATEN{asOf ? <Text style={styles.asOf}> · as of {asOf}</Text> : null}
          </Text>
        </View>
        <View style={styles.calBurnt}>
          <Icon name="trending-up" size={13} color={n.caloriesBurnt > 0 ? hue.move : text.tertiary} />
          <Text style={[styles.burntVal, n.caloriesBurnt <= 0 && styles.dim]}>{n.caloriesBurnt}</Text>
          <Text style={styles.burntLabel}>burned</Text>
        </View>
      </View>

      <View style={styles.macros}>
        {macros.map(({ key, ...m }) => (
          <StatTile key={key} {...m} />
        ))}
      </View>

      {/* Hydration full-width row. */}
      <View style={[styles.hydration, n.hydrationMl <= 0 && styles.tileEmpty]}>
        <Icon name="glass-water" size={15} color={n.hydrationMl > 0 ? hue.hydration : text.tertiary} />
        <Text style={styles.hydrationLabel}>Hydration</Text>
        <Text style={[styles.hydrationVal, n.hydrationMl <= 0 && styles.dim]}>
          {(n.hydrationMl / 1000).toFixed(n.hydrationMl % 1000 === 0 ? 0 : 1)}
          <Text style={styles.tileUnit}> L</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 12, paddingHorizontal: 4 },
  calRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  calMain: {},
  calValue: { fontFamily: font.display, fontSize: 52, color: text.primary, lineHeight: 54 },
  calLabel: { fontFamily: font.sansBold, fontSize: 11, letterSpacing: 0.8, color: hue.nutrition, marginTop: 2 },
  asOf: { fontFamily: font.sansRegular, fontSize: 10, letterSpacing: 0, color: text.tertiary },
  calBurnt: { alignItems: 'flex-end', flexDirection: 'row', gap: 5, paddingBottom: 8 },
  burntVal: { fontFamily: font.display, fontSize: 20, color: text.primary },
  burntLabel: { fontFamily: font.sansRegular, fontSize: 12, color: text.muted },
  macros: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  tile: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  tileEmpty: { opacity: 0.55 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary },
  tileVal: { fontFamily: font.display, fontSize: 18, color: text.primary, lineHeight: 20 },
  tileUnit: { fontFamily: font.sansRegular, fontSize: 11, color: text.muted },
  dim: { color: text.muted },
  hydration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  hydrationLabel: { flex: 1, fontFamily: font.sansSemibold, fontSize: 13, color: text.secondary },
  hydrationVal: { fontFamily: font.display, fontSize: 18, color: text.primary },
});
