import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components';
import { accent, border, font, fontSize, hue, radius, status, surface, text } from '@/theme';
import { SegChips, SheetField, Stepper } from './fields';

/* ---- Food ---- */
const COMMON_FOODS = [
  { n: 'Oatmeal with berries', kcal: 220 },
  { n: 'Greek yogurt', kcal: 120 },
  { n: 'Banana', kcal: 105 },
  { n: 'Grilled chicken salad', kcal: 340 },
  { n: 'Almonds (28g)', kcal: 164 },
];

export function FoodBody() {
  const h = new Date().getHours();
  const [meal, setMeal] = useState(h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 20 ? 'Dinner' : 'Snack');
  const [added, setAdded] = useState<Record<string, boolean>>({});
  return (
    <>
      <View style={styles.search}>
        <Icon name="search" size={18} color={text.muted} />
        <Text style={styles.searchText}>Search foods…</Text>
      </View>
      <SheetField label="Meal">
        <SegChips options={['Breakfast', 'Lunch', 'Dinner', 'Snack']} value={meal} setValue={setMeal} />
      </SheetField>
      <SheetField label="Common foods">
        <View style={{ gap: 8 }}>
          {COMMON_FOODS.map((c) => {
            const on = !!added[c.n];
            return (
              <Pressable
                key={c.n}
                onPress={() => setAdded((a) => ({ ...a, [c.n]: !a[c.n] }))}
                style={[styles.foodRow, { borderColor: on ? accent.base : border.subtle }]}
              >
                <Text style={styles.foodName}>{c.n}</Text>
                <Text style={styles.foodKcal}>{c.kcal} kcal</Text>
                <Icon name={on ? 'check-circle-2' : 'plus-circle'} size={22} color={on ? accent.base : text.tertiary} />
              </Pressable>
            );
          })}
        </View>
      </SheetField>
    </>
  );
}

/* ---- Workout ---- */
const WORKOUT_TYPES: { id: string; icon: IconName }[] = [
  { id: 'Run', icon: 'footprints' },
  { id: 'Strength', icon: 'dumbbell' },
  { id: 'Cycling', icon: 'bike' },
  { id: 'Yoga', icon: 'flower-2' },
  { id: 'HIIT', icon: 'zap' },
  { id: 'Swim', icon: 'waves' },
];

export function WorkoutBody() {
  const [type, setType] = useState('Run');
  const [mins, setMins] = useState(30);
  const [intensity, setIntensity] = useState('Moderate');
  return (
    <>
      <SheetField label="Type">
        <View style={styles.typeGrid}>
          {WORKOUT_TYPES.map((t) => {
            const on = type === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setType(t.id)}
                style={[styles.typeBtn, { borderColor: on ? accent.base : border.subtle, backgroundColor: on ? accent.soft : surface.card }]}
              >
                <Icon name={t.icon} size={22} color={on ? accent.base : text.secondary} />
                <Text style={[styles.typeLabel, { color: on ? accent.base : text.secondary }]}>{t.id}</Text>
              </Pressable>
            );
          })}
        </View>
      </SheetField>
      <SheetField label="Duration">
        <Stepper value={mins} setValue={setMins} step={5} suffix="min" />
      </SheetField>
      <SheetField label="Intensity">
        <SegChips options={['Easy', 'Moderate', 'Hard']} value={intensity} setValue={setIntensity} />
      </SheetField>
    </>
  );
}

/* ---- Walk ---- */
export function WalkBody() {
  const [km, setKm] = useState(1.5);
  const [mins, setMins] = useState(20);
  return (
    <>
      <SheetField label="Distance">
        <Stepper value={km} setValue={setKm} step={0.1} suffix="km" fixed={1} />
      </SheetField>
      <SheetField label="Duration">
        <Stepper value={mins} setValue={setMins} step={5} suffix="min" />
      </SheetField>
      <View style={styles.noteRow}>
        <Icon name="clock" size={17} color={text.muted} />
        <Text style={styles.noteText}>Now · just finished</Text>
      </View>
    </>
  );
}

/* ---- Water ---- */
export function WaterBody() {
  const goal = 2.5;
  const [ml, setMl] = useState(1600);
  const glasses = 8;
  const per = (goal * 1000) / glasses;
  const filled = Math.round(ml / per);
  return (
    <>
      <View style={styles.waterTotal}>
        <Text style={styles.waterBig}>{(ml / 1000).toFixed(2)}</Text>
        <Text style={styles.waterUnit}> / {goal} L</Text>
      </View>
      <View style={styles.glasses}>
        {Array.from({ length: glasses }, (_, i) => (
          <Icon key={i} name="glass-water" size={22} color={i < filled ? hue.hydration : border.strong} />
        ))}
      </View>
      <SheetField label="Quick add">
        <View style={styles.quickAdd}>
          {[250, 500, 750].map((amt) => (
            <Pressable key={amt} onPress={() => setMl((m) => Math.min(goal * 1000, m + amt))} style={styles.quickBtn}>
              <Text style={styles.quickLabel}>+{amt} ml</Text>
            </Pressable>
          ))}
        </View>
      </SheetField>
    </>
  );
}

/* ---- Weight ---- */
export function WeightBody() {
  const [kg, setKg] = useState(68.4);
  return (
    <>
      <SheetField label="Weight">
        <Stepper value={kg} setValue={setKg} step={0.1} suffix="kg" fixed={1} min={20} />
      </SheetField>
      <View style={styles.noteRow}>
        <Icon name="trending-down" size={17} color={status.positive} />
        <Text style={styles.noteText}>0.7 kg below last week</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, borderRadius: 999, backgroundColor: surface.card, borderWidth: 1, borderColor: border.strong, marginBottom: 18 },
  searchText: { fontFamily: font.sansRegular, fontSize: fontSize.md, color: text.tertiary },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1 },
  foodName: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.secondary },
  foodKcal: { fontFamily: font.mono, fontSize: fontSize.sm, color: text.muted },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 7, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1 },
  typeLabel: { fontFamily: font.sansSemibold, fontSize: fontSize.sm },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  noteText: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  waterTotal: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 18 },
  waterBig: { fontFamily: font.display, fontSize: fontSize['3xl'], color: text.primary },
  waterUnit: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.muted },
  glasses: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 20 },
  quickAdd: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.card, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: font.sansBold, fontSize: fontSize.md, color: text.primary },
});
