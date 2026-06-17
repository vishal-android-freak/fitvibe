import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SessionList, StatTileGrid, TrainingLoad, type Session, type StatTileSpec } from '@/components';
import { hue } from '@/theme';
import { Eyebrow } from './parts';

const TODAY: StatTileSpec[] = [
  { label: 'Steps', value: '8,240', hue: hue.move, icon: 'footprints', goal: '/ 10k' },
  { label: 'Distance', value: '5.2', unit: 'km', hue: hue.oxygen, icon: 'map-pin' },
  { label: 'Floors', value: '9', hue: hue.energy, icon: 'trending-up' },
];

const ENERGY: StatTileSpec[] = [
  { label: 'Active energy', value: '612', unit: 'kcal', hue: hue.energy, icon: 'flame', goal: '/ 750', spark: [410, 520, 480, 612, 560, 470, 612] },
  { label: 'Zone minutes', value: '32', unit: 'min', hue: hue.heart, icon: 'timer', goal: '/ 50', spark: [18, 40, 26, 52, 38, 12, 32] },
];

const SESSIONS: Session[] = [
  { type: 'Outdoor run', icon: 'footprints', hue: hue.move, meta: '5.2 km · 27:41 · 384 kcal' },
  { type: 'Morning walk', icon: 'footprints', hue: hue.oxygen, meta: '1.1 km · 14:00 · 78 kcal' },
];

const ACTIVE_MINUTES = [18, 40, 26, 52, 38, 12, 32];
const WEEK_LABELS = ['W', 'T', 'F', 'S', 'S', 'M', 'T'];

/** Steps/distance/floors, energy & zone minutes, sessions, weekly active minutes. */
export function BodyActivity() {
  return (
    <>
      <Eyebrow>Today</Eyebrow>
      <StatTileGrid tiles={TODAY} columns={3} />
      <StatTileGrid tiles={ENERGY} style={styles.energy} />

      <Eyebrow>Today's sessions</Eyebrow>
      <SessionList sessions={SESSIONS} />

      <Eyebrow>This week</Eyebrow>
      <TrainingLoad data={ACTIVE_MINUTES} labels={WEEK_LABELS} />
    </>
  );
}

const styles = StyleSheet.create({
  energy: { marginTop: 12 },
});
