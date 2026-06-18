import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SessionList, StatTileGrid, TrainingLoad, type Session, type StatTileSpec } from '@/components';
import { hue, font, fontSize, text } from '@/theme';
import type { ActivityBlock } from '@/data/body';
import { Eyebrow } from './parts';

/** Title-case a Google exercise enum: "OUTDOOR_RUNNING" → "Outdoor running". */
function exerciseLabel(t: string): string {
  if (!t) return 'Workout';
  const s = t.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Seconds → "27:41" (mm:ss) or "1:27:41" (h:mm:ss). */
function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const WEEK_DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Steps/distance/floors, energy & zone minutes, sessions, weekly active energy. */
export function BodyActivity({ activity }: { activity: ActivityBlock }) {
  const a = activity;

  const today: StatTileSpec[] = [
    { label: 'Steps', value: a.steps.value.toLocaleString(), hue: hue.move, icon: 'footprints', goal: a.steps.goal ? `/ ${(a.steps.goal / 1000).toFixed(0)}k` : undefined },
    { label: 'Distance', value: a.distanceKm.toFixed(1), unit: 'km', hue: hue.oxygen, icon: 'map-pin' },
    { label: 'Floors', value: String(a.floors.value), hue: hue.energy, icon: 'trending-up' },
  ];

  const energy: StatTileSpec[] = [
    {
      label: 'Active energy', value: String(a.activeEnergy.value), unit: 'kcal', hue: hue.energy, icon: 'flame',
      goal: a.activeEnergy.goal ? `/ ${a.activeEnergy.goal}` : undefined,
      spark: a.activeEnergyWeek.length >= 2 ? a.activeEnergyWeek.map((p) => p.value) : undefined,
    },
    {
      label: 'Zone minutes', value: String(a.zoneMinutes.value), unit: 'min', hue: hue.heart, icon: 'timer',
      spark: a.zoneMinutesWeek.length >= 2 ? a.zoneMinutesWeek.map((p) => p.value) : undefined,
    },
  ];

  const sessions: Session[] = a.sessions.map((s) => ({
    type: exerciseLabel(s.type),
    icon: 'footprints',
    hue: hue.move,
    meta: [
      s.steps > 0 ? `${s.steps.toLocaleString()} steps` : null,
      fmtDur(s.durationSec),
      s.kcal > 0 ? `${s.kcal} kcal` : null,
    ].filter(Boolean).join(' · '),
  }));

  // Weekly active-energy bars, oldest→newest, labeled by weekday initial.
  // Each bar carries a tooltip ("Tue · 612 kcal") shown when tapped.
  const week = a.activeEnergyWeek;
  const weekData = week.map((p) => p.value);
  const weekDow = week.map((p) => {
    const [y, m, d] = p.date.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
  });
  const weekLabels = weekDow.map((dow) => WEEK_DAY[dow]);
  const weekTooltips = week.map((p, i) => `${WEEK_FULL[weekDow[i]]} · ${Math.round(p.value)} kcal`);

  return (
    <>
      <Eyebrow>Today</Eyebrow>
      <StatTileGrid tiles={today} columns={1} />
      <StatTileGrid tiles={energy} style={styles.energy} />

      <Eyebrow>Recent sessions</Eyebrow>
      {sessions.length > 0 ? (
        <SessionList sessions={sessions} />
      ) : (
        <Text style={styles.empty}>No recent workouts logged.</Text>
      )}

      {weekData.length >= 2 ? (
        <>
          <Eyebrow>This week</Eyebrow>
          <TrainingLoad data={weekData} labels={weekLabels} tooltips={weekTooltips} title="Active energy" caption="this week" hue={hue.energy} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  energy: { marginTop: 12 },
  empty: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, paddingVertical: 8, paddingHorizontal: 2 },
});
