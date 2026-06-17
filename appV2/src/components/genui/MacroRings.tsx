import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ProgressRing } from '@/components/data/ProgressRing';
import { font, fontSize, text } from '@/theme';

export interface Macro {
  label: string;
  value: number;
  goal: number;
  hue: string;
}

/** A single macro ring (value/goal grams) with a label. */
export function MacroRing({ label, value, goal, hue }: Macro) {
  return (
    <View style={styles.macro}>
      <ProgressRing value={goal > 0 ? value / goal : 0} hue={hue} size={84} thickness={9}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.goal}>/{goal}g</Text>
      </ProgressRing>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** A row of macro rings (Protein / Carbs / Fat). Generative-UI block. */
export function MacroRings({ macros, style }: { macros: Macro[]; style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      {macros.map((m) => (
        <MacroRing key={m.label} {...m} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  macro: { flex: 1, alignItems: 'center', gap: 8 },
  value: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary, lineHeight: fontSize.md },
  goal: { fontFamily: font.sansSemibold, fontSize: 9.5, color: text.tertiary },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: text.secondary },
});
