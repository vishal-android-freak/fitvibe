import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, ScheduleCompare, type ScheduleItem } from '@/components';
import { useSleepSchedule } from '@/data/sleep';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';
import { clk, delta, type NightView } from './data';

/** Sensible defaults to seed the editor when the user hasn't set a schedule. */
const DEFAULT_BED = 23 * 60; // 11:00 PM
const DEFAULT_WAKE = 6 * 60 + 45; // 6:45 AM
const STEP = 15;

function wrap(m: number): number {
  return ((m % 1440) + 1440) % 1440;
}

/** Bedtime & wake: actual (last night) vs the user's OWN target, with deltas.
 *  Tap "Edit" to set the target (±15-min steppers) — Google doesn't expose it. */
export function ScheduleCard({ night }: { night: NightView }) {
  const { schedule, loading, save } = useSleepSchedule();
  const [editing, setEditing] = useState(false);

  const bed = schedule.targetBedMinutes;
  const wake = schedule.targetWakeMinutes;
  const hasTarget = bed != null || wake != null;

  // Read-only comparison rows: only show target/delta for targets that are set.
  const items: ScheduleItem[] = [
    {
      icon: 'moon',
      hue: accent.base,
      label: 'Bedtime',
      actual: clk(night.bed),
      target: bed != null ? clk(bed) : 'not set',
      delta: bed != null ? delta(night.bed, bed) : '',
    },
    {
      icon: 'sunrise',
      hue: '#FFB020',
      label: 'Wake',
      actual: clk(night.wake),
      target: wake != null ? clk(wake) : 'not set',
      delta: wake != null ? delta(night.wake, wake) : '',
    },
  ];

  if (editing) {
    return (
      <Editor
        bed={bed ?? DEFAULT_BED}
        wake={wake ?? DEFAULT_WAKE}
        onCancel={() => setEditing(false)}
        onSave={async (b, w) => {
          await save({ targetBedMinutes: b, targetWakeMinutes: w });
          setEditing(false);
        }}
      />
    );
  }

  return (
    <View>
      <ScheduleCompare items={items} />
      <Pressable onPress={() => setEditing(true)} style={styles.editBtn} disabled={loading}>
        <Icon name="pencil" size={13} color={accent.base} />
        <Text style={styles.editText}>{hasTarget ? 'Edit schedule' : 'Set a sleep schedule'}</Text>
      </Pressable>
    </View>
  );
}

/** Inline ±15-min editor for bed/wake — avoids a native date-picker dependency. */
function Editor({
  bed,
  wake,
  onSave,
  onCancel,
}: {
  bed: number;
  wake: number;
  onSave: (bed: number, wake: number) => void;
  onCancel: () => void;
}) {
  const [b, setB] = useState(bed);
  const [w, setW] = useState(wake);

  return (
    <View style={styles.card}>
      <Stepper label="Bedtime" value={b} onChange={setB} icon="moon" />
      <View style={styles.divider} />
      <Stepper label="Wake" value={w} onChange={setW} icon="sunrise" />
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={[styles.action, styles.cancel]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={() => onSave(b, w)} style={[styles.action, styles.saveBtn]}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stepper({ label, value, onChange, icon }: { label: string; value: number; onChange: (m: number) => void; icon: 'moon' | 'sunrise' }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={accent.base} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(wrap(value - STEP))} style={styles.step}>
          <Icon name="minus" size={16} color={text.primary} />
        </Pressable>
        <Text style={styles.rowValue}>{clk(value)}</Text>
        <Pressable onPress={() => onChange(wrap(value + STEP))} style={styles.step}>
          <Icon name="plus" size={16} color={text.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowLabel: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.primary },
  rowValue: { width: 92, textAlign: 'center', fontFamily: font.mono, fontSize: fontSize.md, color: text.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: border.strong, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: border.subtle },
  actions: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  action: { flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1, borderColor: border.strong },
  cancelText: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  saveBtn: { backgroundColor: accent.base },
  saveText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: '#0A0E1A' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 2 },
  editText: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: accent.base },
});
