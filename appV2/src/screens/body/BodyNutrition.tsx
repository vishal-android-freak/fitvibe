import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CalorieBudget, MacroRings, MealsList, MicroBars, type Meal } from '@/components';
import { border, hue, radius, surface } from '@/theme';
import { Eyebrow, Tile } from './parts';

const MEALS: Meal[] = [
  { meal: 'Breakfast', item: 'Oatmeal, berries & coffee', time: '8:10 AM', kcal: 320, icon: 'sunrise' },
  { meal: 'Lunch', item: 'Grilled chicken salad', time: '1:05 PM', kcal: 540, icon: 'sun' },
  { meal: 'Snack', item: 'Greek yogurt & almonds', time: '4:00 PM', kcal: 284, icon: 'cookie' },
  { meal: 'Dinner', item: 'Salmon, rice & greens', time: '7:30 PM', kcal: 294, icon: 'moon' },
];

const MACROS = [
  { label: 'Protein', value: 96, goal: 120, hue: hue.move },
  { label: 'Carbs', value: 180, goal: 240, hue: hue.energy },
  { label: 'Fat', value: 52, goal: 68, hue: hue.mind },
];

const MICROS = [
  { label: 'Sugar', value: 38, goal: 50, unit: 'g', hue: hue.nutrition },
  { label: 'Sodium', value: 1850, goal: 2300, unit: 'mg', hue: hue.energy },
  { label: 'Potassium', value: 2600, goal: 3400, unit: 'mg', hue: hue.move },
  { label: 'Calcium', value: 820, goal: 1000, unit: 'mg', hue: hue.sky },
  { label: 'Iron', value: 12, goal: 18, unit: 'mg', hue: hue.heart },
];

/** Calorie budget, macro rings, hydration/fiber, micronutrients, today's meals. */
export function BodyNutrition() {
  return (
    <>
      <Eyebrow>Calories</Eyebrow>
      <View style={styles.card}>
        <CalorieBudget goal={2050} food={1438} exercise={612} />
      </View>

      <Eyebrow>Macros</Eyebrow>
      <View style={[styles.card, styles.macros]}>
        <MacroRings macros={MACROS} />
      </View>

      <Eyebrow>Hydration &amp; fiber</Eyebrow>
      <View style={styles.grid}>
        <View style={styles.cell}><Tile label="Hydration" value="1.6" unit="L" hue={hue.hydration} icon="glass-water" goal="/ 2.5L" spark={[2.1, 2.4, 1.9, 2.6, 2.2, 1.4, 1.6]} /></View>
        <View style={styles.cell}><Tile label="Fiber" value="22" unit="g" hue={hue.nutrition} icon="wheat" goal="/ 30g" spark={[18, 24, 20, 28, 26, 19, 22]} /></View>
      </View>

      <Eyebrow>Micronutrients</Eyebrow>
      <View style={[styles.card, styles.micros]}>
        <MicroBars items={MICROS} />
      </View>

      <Eyebrow note="1,438 kcal">Today's meals</Eyebrow>
      <MealsList meals={MEALS} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 18, paddingVertical: 16, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  macros: { paddingHorizontal: 14 },
  micros: { paddingVertical: 10 },
});
