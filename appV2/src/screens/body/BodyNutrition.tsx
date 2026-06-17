import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AIGradient, Icon, ProgressRing, type IconName } from '@/components';
import { border, font, fontSize, hue, radius, ringTrack, surface, text, tint } from '@/theme';
import { Eyebrow, Tile } from './parts';

const GOAL = 2050;
const FOOD = 1438;
const EXERCISE = 612;
const REMAINING = GOAL - FOOD + EXERCISE;

const MEALS: { meal: string; item: string; time: string; kcal: number; icon: IconName }[] = [
  { meal: 'Breakfast', item: 'Oatmeal, berries & coffee', time: '8:10 AM', kcal: 320, icon: 'sunrise' },
  { meal: 'Lunch', item: 'Grilled chicken salad', time: '1:05 PM', kcal: 540, icon: 'sun' },
  { meal: 'Snack', item: 'Greek yogurt & almonds', time: '4:00 PM', kcal: 284, icon: 'cookie' },
  { meal: 'Dinner', item: 'Salmon, rice & greens', time: '7:30 PM', kcal: 294, icon: 'moon' },
];

function MacroRing({ label, value, goal, hueColor }: { label: string; value: number; goal: number; hueColor: string }) {
  return (
    <View style={styles.macro}>
      <ProgressRing value={value / goal} hue={hueColor} size={84} thickness={9}>
        <Text style={styles.macroValue}>{value}</Text>
        <Text style={styles.macroGoal}>/{goal}g</Text>
      </ProgressRing>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function MicroBar({ label, value, goal, unit, hueColor }: { label: string; value: number; goal: number; unit: string; hueColor: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <View style={styles.microRow}>
      <Text style={styles.microLabel}>{label}</Text>
      <View style={styles.microTrack}>
        <View style={[styles.microFill, { width: `${pct}%`, backgroundColor: hueColor }]} />
      </View>
      <Text style={styles.microStat}>
        <Text style={styles.microStatStrong}>{value.toLocaleString()}</Text>/{goal.toLocaleString()} {unit}
      </Text>
    </View>
  );
}

/** Calorie budget, macro rings, hydration/fiber, micronutrients, today's meals. */
export function BodyNutrition() {
  const eatenPct = Math.round((FOOD / (GOAL + EXERCISE)) * 100);
  return (
    <>
      <Eyebrow>Calories</Eyebrow>
      <View style={styles.card}>
        <View style={styles.calRow}>
          <Text style={styles.calBig}>{REMAINING.toLocaleString()}</Text>
          <Text style={styles.calUnit}>kcal remaining</Text>
        </View>
        <View style={styles.calTrack}>
          <AIGradient style={[styles.calFill, { width: `${eatenPct}%` }]} />
        </View>
        <View style={styles.calStats}>
          {[
            ['Base goal', GOAL.toLocaleString()],
            ['Food', FOOD.toLocaleString()],
            ['Exercise', `+${EXERCISE}`],
          ].map(([k, v]) => (
            <View key={k} style={styles.calStat}>
              <Text style={styles.calStatVal}>{v}</Text>
              <Text style={styles.calStatLabel}>{k}</Text>
            </View>
          ))}
        </View>
      </View>

      <Eyebrow>Macros</Eyebrow>
      <View style={[styles.card, styles.macros]}>
        <MacroRing label="Protein" value={96} goal={120} hueColor={hue.move} />
        <MacroRing label="Carbs" value={180} goal={240} hueColor={hue.energy} />
        <MacroRing label="Fat" value={52} goal={68} hueColor={hue.mind} />
      </View>

      <Eyebrow>Hydration &amp; fiber</Eyebrow>
      <View style={styles.grid}>
        <View style={styles.cell}><Tile label="Hydration" value="1.6" unit="L" hue={hue.hydration} icon="glass-water" goal="/ 2.5L" spark={[2.1, 2.4, 1.9, 2.6, 2.2, 1.4, 1.6]} /></View>
        <View style={styles.cell}><Tile label="Fiber" value="22" unit="g" hue={hue.nutrition} icon="wheat" goal="/ 30g" spark={[18, 24, 20, 28, 26, 19, 22]} /></View>
      </View>

      <Eyebrow>Micronutrients</Eyebrow>
      <View style={[styles.card, styles.micros]}>
        <MicroBar label="Sugar" value={38} goal={50} unit="g" hueColor={hue.nutrition} />
        <MicroBar label="Sodium" value={1850} goal={2300} unit="mg" hueColor={hue.energy} />
        <MicroBar label="Potassium" value={2600} goal={3400} unit="mg" hueColor={hue.move} />
        <MicroBar label="Calcium" value={820} goal={1000} unit="mg" hueColor={hue.sky} />
        <MicroBar label="Iron" value={12} goal={18} unit="mg" hueColor={hue.heart} />
      </View>

      <Eyebrow note="1,438 kcal">Today's meals</Eyebrow>
      <View style={styles.mealsCard}>
        {MEALS.map((m, i) => (
          <View key={m.meal} style={[styles.meal, i > 0 && styles.mealDivider]}>
            <View style={[styles.mealIcon, { backgroundColor: tint(hue.nutrition, 0.16) }]}>
              <Icon name={m.icon} size={18} color={hue.nutrition} />
            </View>
            <View style={styles.mealMain}>
              <Text style={styles.mealName}>{m.meal}</Text>
              <Text style={styles.mealItem} numberOfLines={1}>{m.item}</Text>
            </View>
            <View style={styles.mealRight}>
              <Text style={styles.mealKcal}>{m.kcal}</Text>
              <Text style={styles.mealTime}>{m.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 18, paddingVertical: 16, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  // calories
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  calBig: { fontFamily: font.display, fontSize: fontSize['3xl'], color: text.primary },
  calUnit: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.muted },
  calTrack: { height: 8, borderRadius: 999, backgroundColor: ringTrack, overflow: 'hidden', marginTop: 14, marginBottom: 12 },
  calFill: { height: 8, borderRadius: 999 },
  calStats: { flexDirection: 'row', justifyContent: 'space-between' },
  calStat: { alignItems: 'center' },
  calStatVal: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  calStatLabel: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'], color: text.tertiary, marginTop: 2 },
  // macros
  macros: { flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  macro: { flex: 1, alignItems: 'center', gap: 8 },
  macroValue: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary, lineHeight: fontSize.md },
  macroGoal: { fontFamily: font.sansSemibold, fontSize: 9.5, color: text.tertiary },
  macroLabel: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.secondary },
  // micros
  micros: { paddingVertical: 10 },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  microLabel: { width: 84, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  microTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: ringTrack, overflow: 'hidden' },
  microFill: { height: 6, borderRadius: 999, opacity: 0.9 },
  microStat: { width: 92, textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted },
  microStatStrong: { color: text.primary },
  // meals
  mealsCard: { borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle, overflow: 'hidden' },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  mealDivider: { borderTopWidth: 1, borderTopColor: border.subtle },
  mealIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mealMain: { flex: 1, minWidth: 0 },
  mealName: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  mealItem: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  mealRight: { alignItems: 'flex-end' },
  mealKcal: { fontFamily: font.display, fontSize: fontSize.sm, color: text.primary },
  mealTime: { fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
});
