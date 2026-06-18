import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalorieBudget } from '@/components';
import { border, font, fontSize, hue, radius, surface, text } from '@/theme';
import type { NutritionBlock, NutrientTotal } from '@/data/body';
import { Eyebrow } from './parts';

/** Default daily calorie goal until the user sets one (no goal endpoint yet). */
const DEFAULT_CALORIE_GOAL = 2000;

/** Pretty label + display unit for a Google nutrient enum. Sodium is shown in
 *  mg (stored as grams); others in g. */
const NUTRIENT_META: Record<string, { label: string; unit: 'g' | 'mg'; hue: string }> = {
  PROTEIN: { label: 'Protein', unit: 'g', hue: hue.move },
  CARBOHYDRATES: { label: 'Carbs', unit: 'g', hue: hue.energy },
  DIETARY_FIBER: { label: 'Fiber', unit: 'g', hue: hue.nutrition },
  SUGAR: { label: 'Sugar', unit: 'g', hue: hue.nutrition },
  SATURATED_FAT: { label: 'Saturated fat', unit: 'g', hue: hue.mind },
  TOTAL_FAT: { label: 'Fat', unit: 'g', hue: hue.mind },
  SODIUM: { label: 'Sodium', unit: 'mg', hue: hue.energy },
  POTASSIUM: { label: 'Potassium', unit: 'mg', hue: hue.move },
  CALCIUM: { label: 'Calcium', unit: 'mg', hue: hue.sky },
  CHOLESTEROL: { label: 'Cholesterol', unit: 'mg', hue: hue.heart },
  CAFFEINE: { label: 'Caffeine', unit: 'mg', hue: hue.heart },
};

function metaFor(nutrient: string) {
  return (
    NUTRIENT_META[nutrient] ?? {
      label: nutrient.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      unit: 'g' as const,
      hue: hue.sky,
    }
  );
}

function fmtGrams(grams: number, unit: 'g' | 'mg'): string {
  if (unit === 'mg') return `${Math.round(grams * 1000)} mg`;
  return `${grams >= 10 ? Math.round(grams) : grams.toFixed(1)} g`;
}

/**
 * Calorie balance + the dynamic micronutrient breakdown. Nutrients are whatever
 * the day's logged foods carried (from nutrition_log_nutrients) — the list grows
 * as logging gets richer; we don't fabricate a fixed micro list.
 */
export function BodyNutrition({ nutrition }: { nutrition: NutritionBlock }) {
  const n = nutrition;
  return (
    <>
      <Eyebrow>Calories</Eyebrow>
      <View style={styles.card}>
        <CalorieBudget goal={DEFAULT_CALORIE_GOAL} food={n.caloriesEaten} exercise={n.caloriesBurnt} />
      </View>

      <Eyebrow note="from logged foods">Nutrients</Eyebrow>
      {n.nutrients.length > 0 ? (
        <View style={styles.card}>
          {n.nutrients.map((nt, i) => (
            <NutrientRow key={nt.nutrient} item={nt} divider={i > 0} />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Log a meal to see its nutrient breakdown here.</Text>
      )}
      <Text style={styles.note}>
        Totals reflect only foods you logged with nutrient details, so they may understate your full intake.
      </Text>
    </>
  );
}

function NutrientRow({ item, divider }: { item: NutrientTotal; divider: boolean }) {
  const m = metaFor(item.nutrient);
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={[styles.dot, { backgroundColor: m.hue }]} />
      <Text style={styles.label}>{m.label}</Text>
      <Text style={styles.amount}>{fmtGrams(item.grams, m.unit)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: border.subtle },
  dot: { width: 9, height: 9, borderRadius: 999 },
  label: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.primary },
  amount: { fontFamily: font.mono, fontSize: fontSize.sm, color: text.secondary },
  empty: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, paddingVertical: 8, paddingHorizontal: 2 },
  note: { fontFamily: font.sansRegular, fontSize: fontSize['2xs'], color: text.tertiary, marginTop: 10, paddingHorizontal: 2, lineHeight: fontSize['2xs'] * 1.5 },
});
