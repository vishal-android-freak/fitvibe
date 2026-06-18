import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, font, fontSize, surface, text } from '@/theme';

export type BodySeg = 'vitals' | 'nutrition' | 'activity';

const SEGS: { id: BodySeg; label: string }[] = [
  { id: 'vitals', label: 'Vitals' },
  { id: 'activity', label: 'Activity' },
  { id: 'nutrition', label: 'Nutrition' },
];

/** Pill segmented control for the Body sub-sections. */
export function Segmented({ value, onChange }: { value: BodySeg; onChange: (v: BodySeg) => void }) {
  return (
    <View style={styles.track}>
      {SEGS.map((s) => {
        const on = value === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={[styles.seg, on && { backgroundColor: accent.base }]}
          >
            <Text style={[styles.label, { color: on ? text.onAccent : text.muted }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: surface.card, marginTop: 14 },
  seg: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: font.sansBold, fontSize: fontSize.sm },
});
