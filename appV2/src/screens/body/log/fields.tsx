import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, Icon } from '@/components';
import { border, font, fontSize, surface, text } from '@/theme';

/** A labelled section block within a log sheet. */
export function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** +/- stepper around a big tabular value. */
export function Stepper({
  value,
  setValue,
  step = 1,
  suffix = '',
  min = 0,
  fixed = 0,
}: {
  value: number;
  setValue: (v: number) => void;
  step?: number;
  suffix?: string;
  min?: number;
  fixed?: number;
}) {
  const bump = (dir: number) => setValue(Math.max(min, +(value + dir * step).toFixed(2)));
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => bump(-1)} accessibilityLabel="Decrease" style={styles.stepBtn}>
        <Icon name="minus" size={20} color={text.primary} />
      </Pressable>
      <View style={styles.stepValueWrap}>
        <Text style={styles.stepValue}>{value.toFixed(fixed)}</Text>
        {suffix ? <Text style={styles.stepSuffix}>{suffix}</Text> : null}
      </View>
      <Pressable onPress={() => bump(1)} accessibilityLabel="Increase" style={styles.stepBtn}>
        <Icon name="plus" size={20} color={text.primary} />
      </Pressable>
    </View>
  );
}

/** Horizontal selectable chips. */
export function SegChips({ options, value, setValue }: { options: string[]; value: string; setValue: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o} selected={value === o} onPress={() => setValue(o)}>
          {o}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  fieldLabel: { fontFamily: font.sansBold, fontSize: fontSize.xs, letterSpacing: 1.6, color: text.tertiary, marginBottom: 9 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  stepBtn: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.raised, alignItems: 'center', justifyContent: 'center' },
  stepValueWrap: { minWidth: 120, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
  stepValue: { fontFamily: font.display, fontSize: fontSize['3xl'], color: text.primary },
  stepSuffix: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.muted },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
